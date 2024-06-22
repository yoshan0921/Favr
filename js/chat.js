import { lazyLoadImages } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAllWithFilter, getDocument } from "./firebase/firestore.js";
import { database } from "./firebase/firebase.js";
import { ref, push, onChildAdded, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

// Task status
const STATUS_WAITING = "Waiting to be accepted";
const STATUS_ONGOING = "On going";
const STATUS_PENDING = "Pending approval";
const STATUS_COMPLETED = "Completed";
const STATUS_CANCELLED = "Cancelled";

let loginUserID;
let loginUserRole;
let chatRoom;
let filterCondition;
const contactList = document.getElementById("chatWith");
const messageHistory = document.getElementById("messageHistory");
const sendMessage = document.getElementById("sendMessage");
const message = document.getElementById("message");

window.addEventListener("load", function (event) {
  // Check if the user is logged in
  monitorAuthenticationState();
});

/**
 * Memo:
 * runFunction(); should be called when DOMContentLoaded event is triggered
 * However, there is a case DOMContentLoaded is not triggered.
 * That is why we need to check the readyState of the document.
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  runFunction();
}

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there.
 */
async function runFunction() {
  // Get Login user information
  loginUserID = getCurrentUserID();
  await getCurrentUserRole().then(async (currentUserRole) => {
    loginUserRole = currentUserRole;
    console.log("Current User ID: " + loginUserID);
    console.log("Current User Role: " + loginUserRole);

    // Load the dashboard based on the user's role
    if (currentUserRole === "volunteer") {
      // Set filter condition
      filterCondition = [
        {
          key: "volunteerID",
          operator: "==",
          value: loginUserID,
        },
      ];
    } else if (currentUserRole === "elder") {
      // Set filter condition
      filterCondition = [
        {
          key: "status",
          operator: "!=",
          value: STATUS_WAITING,
        },
        {
          key: "requesterID",
          operator: "==",
          value: loginUserID,
        },
      ];
    }
  });

  // Create user list
  getAllWithFilter("tasks", filterCondition).then((collection) => {
    let contactIDs = [];
    let contactID = "";
    let promises = [];

    collection.forEach((doc) => {
      if (loginUserRole === "volunteer") {
        contactID = doc[1].requesterID;
      } else if (loginUserRole === "elder") {
        contactID = doc[1].volunteerID;
      }

      // Prevent duplicate contact
      if (contactIDs.includes(contactID)) return;
      contactIDs.push(contactID);

      // Create contact list
      let contact = document.createElement("div");
      contact.classList.add("contact");
      contact.setAttribute("data-contactID", contactID);

      // Get the user's information
      let promise = getDocument("users", contactID)
        .then((user) => {
          let profileImage = document.createElement("img");
          profileImage.classList.add("photo");
          profileImage.setAttribute("src", `${placeholderImage}`);
          profileImage.setAttribute("data-storage-path", `profile/${user.profilePictureURL}`);
          contact.appendChild(profileImage);

          let requesterName = document.createElement("p");
          requesterName.classList.add("name");
          requesterName.textContent = `${user.firstName} ${user.lastName}`;

          let lastMessage = document.createElement("p");
          lastMessage.textContent = `*** The last message here (under construction) ***`;

          let requesterInfo = document.createElement("div");
          requesterInfo.appendChild(requesterName);
          requesterInfo.appendChild(lastMessage);
          contact.appendChild(requesterInfo);

          contactList.appendChild(contact);
        })
        .catch((error) => console.log(error));

      // Add the promise to the array
      promises.push(promise);

      // Add event listener to each contact
      contact.addEventListener("click", async function () {
        // Create chat room name from sorted two user IDs
        chatRoom = [loginUserID, this.getAttribute("data-contactID")].sort().join("-");
        messageHistory.innerHTML = "";

        chatWith.classList.add("hide");
        messageHistory.classList.remove("hide");

        // Check if chat message is allowed to sent.
        if (await checkChatRoomAvailability(loginUserID, this.getAttribute("data-contactID"))) {
          sendMessage.classList.remove("hide");
        } else {
          console.log("Chat message is not allowed to sent.");
        }

        onChildAdded(ref(database, chatRoom), function (data) {
          const v = data.val();
          const messageItem = document.createElement("div");

          if (v.name === loginUserID) {
            messageItem.classList.add("message-right");
          } else {
            messageItem.classList.add("message-left");
          }
          messageItem.innerHTML = `<div class="messageBox">${v.message}</div>`;
          messageHistory.appendChild(messageItem);

          window.scrollTo(0, document.body.scrollHeight);
        });
      });
    });

    // Wait for all getDocument calls to finish
    Promise.all(promises).then(() => {
      lazyLoadImages();
    });
  });
}

// Send message
sendMessage.addEventListener("submit", function (event) {
  // Prevent the form from submitting
  event.preventDefault();

  // Check if the message is empty
  if (message.value === "") return;

  push(ref(database, chatRoom), {
    name: loginUserID,
    message: message.value,
  });
  // Clear the message box
  message.value = "";
});

// If there are the tasks with "On going" or "Pending approval" between the two users,
// the chat message can be sent. Otherwise, the chat message cannot be sent.
async function checkChatRoomAvailability(userID1, userID2) {
  // Set filter condition
  filterCondition = [
    {
      key: "status",
      operator: "in",
      value: [STATUS_ONGOING, STATUS_PENDING],
    },
    {
      key: "requesterID",
      operator: "in",
      value: [userID1, userID2],
    },
    {
      key: "volunteerID",
      operator: "in",
      value: [userID1, userID2],
    },
  ];

  const collection = await getAllWithFilter("tasks", filterCondition);
  return collection.length > 0;
}

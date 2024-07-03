import { lazyLoadImages } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAllWithFilter, getDocument } from "./firebase/firestore.js";
import { database } from "./firebase/firebase.js";
import { ref, child, query, push, get, onChildAdded, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { sendNotification } from "./notification.js";

const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let loginUserID;
let loginUserRole;
let chatRoomID;
let filterCondition;
const contactList = document.getElementById("chatWith");
const messageHistory = document.getElementById("messageHistory");
const sendMessage = document.getElementById("sendMessage");
const message = document.getElementById("message");
const send = document.getElementById("send");

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
  var contactID = "";

  // Get the current user role
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

          let lastMessageTime = document.createElement("p");
          lastMessageTime.classList.add("lastMessageTime");

          let lastMessage = document.createElement("p");
          lastMessage.classList.add("lastMessage");

          // Get the last message in the chat room
          const chatRef = ref(database, `${[loginUserID, user.id].sort().join("-")}`);
          const queryConstraints = query(chatRef, orderByKey(), limitToLast(1));
          get(queryConstraints)
            .then((snapshot) => {
              if (snapshot.exists()) {
                const key = snapshot.key;
                const data = snapshot.val();
                for (let item in data) {
                  lastMessage.textContent = data[item].message;
                  // If month date is not equal to today, display the date + time
                  let now = new Date();
                  if (`${data[item].month} ${data[item].day}` !== `${now.toLocaleString("en-US", { month: "long" })} ${now.getDate()}`) {
                    lastMessageTime.textContent = `${data[item].month} ${data[item].day}`;
                  } else {
                    lastMessageTime.textContent = data[item].time;
                  }
                }
              } else {
                console.log("No message found.");
              }
            })
            .catch((error) => {
              console.error(error);
            });
          // lastMessage.textContent = `*** The last message here (under construction) ***`;

          let userInfo = document.createElement("div");
          userInfo.classList.add("userInfo");
          userInfo.appendChild(requesterName);
          userInfo.appendChild(lastMessageTime);
          userInfo.appendChild(lastMessage);
          contact.appendChild(userInfo);
          contactList.appendChild(contact);
        })
        .catch((error) => console.log(error));

      // Add the promise to the array
      promises.push(promise);

      // Add event listener to each contact
      contact.addEventListener("click", async function () {
        // Create chat room name from sorted two user IDs
        chatRoomID = [loginUserID, this.getAttribute("data-contactID")].sort().join("-");
        console.log("Chat Room ID: " + chatRoomID);

        // Load chat room
        loadChatRoom(chatRoomID, this);

        // Check if chat message is allowed to sent.
        checkChatRoomAvailability(chatRoomID);

        // Replace h1#page-title with the selected elder/colunteer information
        showChatRoomTitle(chatRoomID);
      });
    });

    // Wait for all getDocument calls to finish
    Promise.all(promises).then(() => {
      // If crid is specified in the URL, load the chat room
      const urlParams = new URLSearchParams(window.location.search);
      chatRoomID = urlParams.get("crid");
      if (chatRoomID) {
        loadChatRoom(chatRoomID);
        checkChatRoomAvailability(chatRoomID);
        showChatRoomTitle(chatRoomID);
        return;
      }

      // Show contact list and show message history
      contactList.classList.remove("hide");

      // Load firebase storage images
      lazyLoadImages();
    });

    // Loading icon
    const main = document.getElementsByTagName("main")[0];
    main.classList.add("loaded");
  });
  // Send message
  sendMessage.addEventListener("submit", function (event) {
    // Prevent the form from submitting
    event.preventDefault();

    // Check if the message is empty
    if (message.value === "") return;

    const now = new Date();
    push(ref(database, chatRoomID), {
      year: now.getFullYear(),
      month: now.toLocaleString("en-US", { month: "long" }),
      day: now.getDate(),
      dayOfWeek: now.toLocaleString("en-US", { weekday: "long" }),
      time: now.toTimeString().split(":")[0] + ":" + now.toTimeString().split(":")[1], // HH:MM
      name: loginUserID,
      message: message.value,
    })
    .then(()=>{
      const header = document.getElementsByClassName("contactHeader")[0];
      if(header){
        let receiverID = header.getAttribute("data-contactid");
        sendNotification(
          {
            title: "Someone sent you a message",
            //icon:"#",
            isMessage: true,
            //link:"#",
            message: message.value
          },
          receiverID);
      }
          // Clear the message balloon
      message.value = "";
    })
    .catch((error) => {
      console.error("Failed to save data:", error);
    });

  });

}


async function loadChatRoom(chatRoomID) {
  // Hide contact list and show message history
  contactList.classList.add("hide");
  messageHistory.classList.remove("hide");

  // Load chat room messages
  loadChatRoomMessages(chatRoomID);
}

function loadChatRoomMessages(chatRoomID) {
  // Clear the message history area
  messageHistory.innerHTML = "";

  let previousDate = "";

  // Load chat room messages
  onChildAdded(ref(database, chatRoomID), function (data) {
    const v = data.val();
    const messageItem = document.createElement("div");
    if (v.name === loginUserID) {
      messageItem.classList.add("message-right");
    } else {
      messageItem.classList.add("message-left");
    }

    if (previousDate !== `${v.year}-${v.month}-${v.day}`) {
      previousDate = `${v.year}-${v.month}-${v.day}`;
      const date = document.createElement("div");
      date.classList.add("date");
      const dateText = document.createElement("span");
      dateText.textContent = `${v.dayOfWeek}, ${v.month} ${v.day}`;
      date.appendChild(dateText);
      messageHistory.appendChild(date);
    }

    const messageTime = document.createElement("div");
    messageTime.classList.add("time");
    messageTime.textContent = v.time;

    const messageBalloon = document.createElement("div");
    messageBalloon.classList.add("messageBalloon");
    messageBalloon.textContent = v.message;

    messageItem.appendChild(messageTime);
    messageItem.appendChild(messageBalloon);
    messageHistory.appendChild(messageItem);

    window.scrollTo(0, document.body.scrollHeight);
  });
}

// If there are the tasks with "On going" or "Pending approval" between the two users,
// the chat message can be sent. Otherwise, the chat message cannot be sent.
async function checkChatRoomAvailability(chatRoomID) {
  let userID1 = chatRoomID.split("-")[0];
  let userID2 = chatRoomID.split("-")[1];

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
  if (collection.length > 0) {
    sendMessage.classList.remove("hide");
  }
}

function showChatRoomTitle(chatRoomID) {
  let pageTitle = document.getElementById("page-title");
  let currentUserID = getCurrentUserID();
  let userID1 = chatRoomID.split("-")[0];
  let userID2 = chatRoomID.split("-")[1];
  let contactUserID;

  if (currentUserID === userID1) {
    contactUserID = userID2;
  } else {
    contactUserID = userID1;
  }

  // Create chat room title
  let contact = document.createElement("div");
  contact.classList.add("contactHeader", "page-title");
  contact.setAttribute("data-contactid",contactUserID);

  // Get the user's information
  getDocument("users", contactUserID)
    .then((user) => {
      let profileImage = document.createElement("img");
      profileImage.classList.add("photo");
      profileImage.setAttribute("src", `${placeholderImage}`);
      profileImage.setAttribute("data-storage-path", `profile/${user.profilePictureURL}`);
      contact.appendChild(profileImage);

      let requesterName = document.createElement("p");
      requesterName.classList.add("name");
      requesterName.textContent = `${user.firstName} ${user.lastName}`;

      let address = document.createElement("p");
      address.classList.add("address");
      address.textContent = user.address ?? "";

      let requesterInfo = document.createElement("div");
      requesterInfo.classList.add("information");
      requesterInfo.appendChild(requesterName);
      requesterInfo.appendChild(address);
      contact.appendChild(requesterInfo);
      pageTitle.outerHTML = contact.outerHTML;

      lazyLoadImages();
    })
    .catch((error) => console.log(error));
}

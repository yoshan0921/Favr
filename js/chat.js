import { lazyLoadImages, sortTasksByDate } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAllWithFilter, getDocument, getFile } from "./firebase/firestore.js";
import { database } from "./firebase/firebase.js";
import { ref, query, push, get, onChildAdded, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { sendNotification, updateNotificationStatus } from "./notification.js";
import { finishLoading } from "./utils.js";

const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let loginUserID;
let loginUserRole;
let chatRoomID;
let filterCondition;
const contactList = document.getElementById("chatWith");
const messageHistory = document.getElementById("messageHistory");
const sendMessage = document.getElementById("sendMessage");
const sendingMsgNotAvailable = document.getElementById("sendingMsgNotAvailable");
const message = document.getElementById("message");
const send = document.getElementById("send");
const mic = document.getElementById("mic");

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
  const currentUser = await getDocument("users", loginUserID);
  let contactID = "";
  let contactIDs = [];
  let promises = [];
  let newMessagesByContact = {};

  // Get the current user role
  loginUserRole = await getCurrentUserRole();

  // Load the dashboard based on the user's role
  if (loginUserRole === "volunteer") {
    // Set filter condition
    filterCondition = [{ key: "volunteerID", operator: "==", value: loginUserID }];
  } else if (loginUserRole === "elder") {
    // Set filter condition
    filterCondition = [
      { key: "status", operator: "!=", value: STATUS_WAITING },
      { key: "requesterID", operator: "==", value: loginUserID },
    ];
  }

  // Check if there are new messages
  const updates = await get(query(ref(database, loginUserID)));
  if (updates.exists()) {
    updates.forEach((element) => {
      const update = element.val();
      if (update.isNew && update.isMessage && update.senderID) {
        if (!newMessagesByContact[update.senderID]) {
          newMessagesByContact[update.senderID] = [[update.id], [update]];
        } else {
          newMessagesByContact[update.senderID][0].push(update.id);
          newMessagesByContact[update.senderID][1].push(update);
        }
      }
    });
  }

  // Retrieve all tasks based on the filter condition
  const collection = await getAllWithFilter("tasks", filterCondition);

  // Create user contact list based on task list
  collection.forEach(async (doc) => {
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
    contact.classList.add("contact", "floating-card");
    contact.setAttribute("data-contactID", contactID);

    // Create user information
    let promise = getDocument("users", contactID)
      .then(async (user) => {
        // Check if there are new messages and add has-updates mark (red circle)
        console.log(newMessagesByContact, user.id);
        if (newMessagesByContact[user.id] && newMessagesByContact[user.id].length > 0) {
          contact.classList.add("has-updates");
        }

        // User profile image element
        let profileImage = document.createElement("img");
        profileImage.classList.add("photo");
        profileImage.setAttribute("src", `${placeholderImage}`);
        profileImage.setAttribute("data-storage-path", `profile/${user.profilePictureURL}`);
        contact.appendChild(profileImage);

        // User name image element
        let requesterName = document.createElement("p");
        requesterName.classList.add("name");
        requesterName.textContent = `${user.firstName} ${user.lastName}`;

        // Last message receive time
        let lastMessageTime = document.createElement("p");
        lastMessageTime.classList.add("lastMessageTime");

        // Last message
        let lastMessage = document.createElement("p");
        lastMessage.classList.add("lastMessage");

        // Get the last message in the chat room
        const chatRef = ref(database, `${[loginUserID, user.id].sort().join("-")}`);
        await getLastMessage(chatRef, contact, lastMessage, lastMessageTime);

        // Combine the user information and add it to the contact
        let userInfo = document.createElement("div");
        userInfo.classList.add("userInfo");
        userInfo.appendChild(requesterName);
        userInfo.appendChild(lastMessageTime);
        userInfo.appendChild(lastMessage);
        contact.appendChild(userInfo);
        contactList.appendChild(contact);
      })
      .catch((error) => {
        console.error("Failed to get user data:", error);
      });

    // Add the promise to the array
    promises.push(promise);

    // Add event listener to each contact
    contact.addEventListener("click", async function () {
      // Create chat room name from sorted two user IDs
      chatRoomID = [loginUserID, this.getAttribute("data-contactID")].sort().join("-");
      console.log("Chat Room ID: " + chatRoomID);

      // Load chat room
      loadChatRoom(chatRoomID, newMessagesByContact);

      // Check if chat message is allowed to sent.
      checkChatRoomAvailability(chatRoomID);

      // Replace h1#page-title with the selected elder/colunteer information
      showChatRoomTitle(chatRoomID);
    });
  });

  // Wait for all getDocument calls to finish
  Promise.all(promises).then(() => {
    // Hide loading screen
    finishLoading();

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

    // Sort the contact list by the last message time
    sortTasksByDate("newest", contactList.children, contactList);

    // Load firebase storage images
    lazyLoadImages();
  });

  // Loading icon
  const main = document.getElementsByTagName("main")[0];
  main.classList.add("loaded");

  // EventListener for sending message button
  sendMessage.addEventListener("submit", function (event) {
    // Prevent the form from submitting
    event.preventDefault();

    // Check if the message is empty
    if (message.value === "") return;

    const now = new Date();
    push(ref(database, chatRoomID), {
      timestamp: now.getTime(),
      year: now.getFullYear(),
      month: now.toLocaleString("en-US", { month: "long" }),
      day: now.getDate(),
      dayOfWeek: now.toLocaleString("en-US", { weekday: "long" }),
      time: now.toTimeString().split(":")[0] + ":" + now.toTimeString().split(":")[1], // HH:MM
      name: loginUserID,
      message: message.value,
    })
      .then(async () => {
        const header = document.getElementsByClassName("contactHeader")[0];
        if (header) {
          let receiverID = header.getAttribute("data-contactid");
          let url = "#";
          if (currentUser.profilePictureURL) {
            url = await getFile(`profile/${currentUser.profilePictureURL}`);
          }
          sendNotification(
            {
              title: `${currentUser.firstName} ${currentUser.lastName}`,
              icon: url,
              isMessage: true,
              updateType: "info",
              link: `/chat.html?crid=${chatRoomID}`,
              message: message.value,
              senderID: currentUser.id,
            },
            receiverID
          );
        }
        // Clear the message input filed
        message.value = "";
        send.classList.add("hide");
        mic.classList.remove("hide");
      })
      .catch((error) => {
        console.error("Failed to save data:", error);
      });
  });

  // EventListener for Mic button
  mic.addEventListener("click", () => {
    console.log("click");
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    message.value = "";

    mic.style.animation = "pulse 1s infinite";
    mic.classList.add("active");
    message.focus();

    recognition.onresult = ({ results }) => {
      message.blur();
      message.value = results[0][0].transcript;
      message.focus();
      mic.style.animation = "none";
      mic.classList.remove("active");

      if (message.value.length > 0) {
        send.classList.remove("hide");
        mic.classList.add("hide");
      }
    };

    recognition.onend = () => {
      mic.style.animation = "none";
      mic.classList.remove("active");
    };

    recognition.start();
  });

  // EventListener for Message input field
  message.addEventListener("input", () => {
    console.log("change");
    if (message.value.length > 0) {
      send.classList.remove("hide");
      mic.classList.add("hide");
    } else {
      mic.classList.remove("hide");
      send.classList.add("hide");
    }
  });
}

async function getLastMessage(chatRef, contact, lastMessage, lastMessageTime) {
  // Create query constraints to get the last message
  const queryConstraints = query(chatRef, orderByKey(), limitToLast(1));
  // Execute the query
  const snapshot = await get(queryConstraints);

  if (snapshot.exists()) {
    // Extract the data from the snapshot
    const data = snapshot.val();
    for (let item in data) {
      // Update the text content of the last message
      lastMessage.textContent = data[item].message;
      // Determine if the message date is today or not
      let now = new Date();
      if (`${data[item].month} ${data[item].day}` !== `${now.toLocaleString("en-US", { month: "long" })} ${now.getDate()}`) {
        lastMessageTime.textContent = ` ${data[item].month} ${data[item].day}`;
      } else {
        lastMessageTime.textContent = data[item].time;
      }
      // Set the data attribute for the last message time
      contact.setAttribute("data-date", `${data[item].month} ${data[item].day}, ${data[item].year} ${data[item].time}`);
    }
  } else {
    console.log("No message found.");
  }
}

async function loadChatRoom(chatRoomID, newMessagesByContact) {
  // Hide contact list and show message history
  contactList.classList.add("hide");
  messageHistory.classList.remove("hide");

  // Load chat room messages
  loadChatRoomMessages(chatRoomID, newMessagesByContact);
  // Hide footer
  document.getElementById("footer").classList.add("hide");
}

function loadChatRoomMessages(chatRoomID, newMessagesByContact) {
  // Clear the message history area
  messageHistory.innerHTML = "";

  let previousDate = "";
  let contactID = chatRoomID.split("-")[1];

  for (let id in newMessagesByContact) {
    if (id == contactID) {
      newMessagesByContact[contactID].forEach((message) => {
        console.log(message);
        updateNotificationStatus(loginUserID, message[0]);
      });
    }
  }

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
  } else {
    sendingMsgNotAvailable.classList.remove("hide");
    sendMessage.classList.remove("hide");
    message.disabled = true;
    mic.disabled = true;
    send.disabled = true;
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
  contact.setAttribute("data-contactid", contactUserID);

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

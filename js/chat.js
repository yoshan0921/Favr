import { getCurrentUserID } from "./firebase/authentication.js";
import { getAll, getDocument } from "./firebase/firestore.js";
import { database } from "./firebase/firebase.js";
import { ref, push, onChildAdded, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

let chatRoom;
let loginUserName;
const message = document.getElementById("message");
const output = document.getElementById("messageHistory");
const namelist = document.getElementById("chatWith");
const submit = document.querySelector(".sendMessage");

// Get the logged in user's name
getDocument("users", getCurrentUserID()).then((doc) => {
  loginUserName = `${doc.firstName} ${doc.lastName}`;
  document.getElementById("loginUserName").innerText = loginUserName;
});

// Create user list
getAll("users").then((collection) => {
  // Add dummy option to the top of the list
  let dummy = document.createElement("option");
  dummy.value = "";
  dummy.text = "Select user";
  namelist.add(dummy, namelist.firstChild);

  collection.forEach((doc) => {
    let option = document.createElement("option");
    option.value = doc[0];
    option.text = doc[1].firstName + " " + doc[1].lastName;
    namelist.add(option);
  });
});

// Select chat room (userID-userID-taskID)
namelist.addEventListener("change", function () {
  // Make chat room name by sorting the userID of the two users
  chatRoom = [getCurrentUserID(), namelist.value].sort().join("-");
  output.innerHTML = "";

  // Move the onChildAdded function here
  onChildAdded(ref(database, chatRoom), function (data) {
    console.log(data.val());
    const v = data.val();

    let messageItem = document.createElement("div");
    messageItem.innerHTML = `<div class="messageBox">${v.message}</div>`;

    console.log(v.name);
    console.log(loginUserName);
    if (v.name === loginUserName) {
      messageItem.classList.add("message-right");
    } else {
      messageItem.classList.add("message-left");
    }
    output.appendChild(messageItem);

    // Scroll down to the bottom of the chat
    window.scrollTo(0, document.body.scrollHeight);
  });
});

// Send message
submit.addEventListener("submit", function (event) {
  // Prevent the form from submitting
  event.preventDefault();

  push(ref(database, chatRoom), {
    name: loginUserName,
    message: message.value,
  });
  // Clear the message box
  message.value = "";
});

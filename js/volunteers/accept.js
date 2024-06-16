import { getCurrentUserID } from "../firebase/authentication.js";
import { updateDocument, getDocument } from "../firebase/firestore.js";

let taskID;
let taskData = {};

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 *
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  runFunction();
}

function runFunction() {
  // Get task ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  taskID = urlParams.get("taskid");
  console.log(taskID);

  let taskName = document.getElementById("taskName");
  let elderName = document.getElementById("elderName");
  let elderAddress = document.getElementById("elderAddress");
  let taskAddress = document.getElementById("taskAddress");
  let taskTime = document.getElementById("taskTime");
  let taskNote = document.getElementById("taskNote");


  // Get the task data from the Firestore
  getDocument("tasks", taskID)
    .then((task) => {
      console.log(task);
      // Save the task data to a global variable
      taskData = task;
      getDocument("users", task.requesterID)
        .then((user) => {
          // ToDo: Display task data on the page
          // Code here...
          taskName.innerHTML = taskData.name;

          // I am STRUGGLING this part↓=====================

          // console.log(user.firstName);
          // elderName.innerHTML = user.firstName;


          taskAddress.innerHTML = taskData.details.startAddress;
          taskTime.innerHTML = `${taskData.details.date} ${taskData.details.time}`;
          taskNote.innerHTML = taskData.notes;   

    });

    })
    .catch((error) => {
      console.log(error);
    });
}

async function acceptTask(taskID, taskData) {
  console.log(taskData);

  // Get the volunteer ID
  const volunteerID = getCurrentUserID();

  // Create updated task data object with the volunteer ID and status "On going"
  taskData.volunteerID = volunteerID;
  taskData.status = "On going";
  console.log(taskData);

  // Update the task data on the Firestore
  updateDocument("tasks", taskID, taskData)
    .then(() => {
      console.log("Task accepted!");
    })
    .catch((error) => {
      console.log(error);
    });
}



function confirmOn() {
  document.getElementById("confirm-overlay").style.display = "block";
}

document.getElementById("acceptBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  confirmOn();
});
  
function confirmOff() {
  document.getElementById("confirm-overlay").style.display = "none";
}
  
document.getElementById("backBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  confirmOff();
});

function acceptOn() {
  document.getElementById("accept-overlay").style.display = "block";
}

document.getElementById("confirmBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  acceptOn();
});

function goHome() {
  window.location.href = "http://127.0.0.1:5500/dashboard.html";
}

document.getElementById("homeBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  goHome();
});

document.getElementById("cancelBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  goHome();
});


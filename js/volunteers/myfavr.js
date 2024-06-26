import { getCurrentUserID } from "../firebase/authentication.js";
import { updateDocument, getDocument, getFile } from "../firebase/firestore.js";

let taskID;
let taskData = {};
let chatRoomID;


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

  let completedElderName = document.getElementById("completedElderName");
  let approvedElderName = document.getElementById("approvedElderName");

  // Get the task data from the Firestore
  getDocument("tasks", taskID)
    .then((task) => {
      console.log(task);
      // Save the task data to a global variable
      taskData = task;
      getDocument("users", task.requesterID).then((user) => {
        // ToDo: Display task data on the page
        // Code here...

        // Retrieve Task name====================
        taskName.innerHTML = taskData.name;

        // Retrieve Elder's name and address=====================
        console.log(user.firstName);
        elderName.innerHTML = `${user.firstName} ${user.lastName}`;
        elderAddress.innerHTML = user.address;

        completedElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        approvedElderName.innerHTML = `${user.firstName} ${user.lastName}`;

        
        getFile("profile/" + user.profilePictureURL)
        .then((url) => {
          document.getElementById("elderPhoto").src = url;
        })
        .catch((error) => {
          console.log(error);
          document.getElementById("elderPhoto").src = placeholderImage;
        });

        // Retrieve Task address, date and note=====================
        taskAddress.innerHTML = taskData.details.startAddress;
        taskTime.innerHTML = `${taskData.details.date} ${taskData.details.time}`;
        taskNote.innerHTML = taskData.notes;

        // Create chat room name from sorted two user IDs
        chatRoomID = [getCurrentUserID(), taskData.requesterID].sort().join("-");
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
  taskData.status = "Pending approval";
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

async function cancelTask(taskID, taskData) {
  console.log(taskData);

  // Get the volunteer ID
  const volunteerID = getCurrentUserID();

  // Create updated task data object with the volunteer ID and status "On going"
  taskData.volunteerID = volunteerID;
  taskData.status = "Waiting to be accepted";
  console.log(taskData);

  // Update the task data on the Firestore
  await updateDocument("tasks", taskID, taskData)
    .then(() => {
      console.log("Task accepted!");
    })
    .catch((error) => {
      console.log(error);
    });

    
}

function completeConfirmOn() {
  document.getElementById("complete-confirm-overlay").style.display = "block";
}

document.getElementById("confirmCompleteBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  completeConfirmOn();
});


function taskCompletedOn() {
  document.getElementById("task-completed-overlay").style.display = "block";
}

document.getElementById("completeBtn").addEventListener("click", function () {
  acceptTask(taskID, taskData);
  taskCompletedOn();
});

function exploreFavors() {
  window.location.href = "/dashboard.html";
}

document.getElementById("exploreBtn").addEventListener("click", function () {
  //   acceptTask(taskID, taskData);
  exploreFavors();
});

document.getElementById("cancelBtn").addEventListener("click", async function () {
  console.log(taskData);
  await cancelTask(taskID, taskData);
  exploreFavors();


});

// Link to chat room
document.getElementById("contactBtn").addEventListener("click", function () {
  window.location.href = `/chat.html?crid=${chatRoomID}`;
});

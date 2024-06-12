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

  // Get the task data from the Firestore
  getDocument("tasks", taskID)
    .then((task) => {
      console.log(task);
      // Save the task data to a global variable
      taskData = task;

      // ToDo: Display task data on the page
      // Code here...
    })
    .catch((error) => {
      console.log(error);
    });
}

document.getElementById("completeBtn").addEventListener("click", function () {
  acceptTask(taskID, taskData);
});

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
      alert("Task accepted!");
    })
    .catch((error) => {
      console.log(error);
    });
}

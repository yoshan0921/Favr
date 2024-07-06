import { getDocument } from "../firebase/firestore.js";

let taskID;
let taskData;

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
    console.log("The taskid is " + taskID);
  
    // Get the task data from the Firestore
    getDocument("tasks", taskID)
      .then((task) => {
        console.log(task);
        // Save the task data to a global variable
        taskData = task;
      })
      .catch((error) => {
        console.log(error);
      });
  }

// Event listener to go back to home
const backToHome = document.getElementById("backToHome");
backToHome.addEventListener("click", () => {
  window.location.href = "../dashboard.html";
});

// TODO: Event listener to go favor detail page
// const favorDetailBtn = document.getElementById("favorDetail");
// favorDetailBtn.addEventListener("click", () => {
//     window.location.href = `../tasks/elder-favor.html?taskid=${task.taskID}`;
// });
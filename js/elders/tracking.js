import { getDocument } from "../firebase/firestore.js";
import { enableBackButton } from "../utils.js";

let taskID;

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
  //console.log(taskID);

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

// Display summary
displayTaskSummary(taskID)
.then(()=>{
  const main = document.getElementsByTagName("main")[0];
  main.classList.add("loaded");
  enableBackButton();
});

async function displayTaskSummary(taskID) {
  try {
    // Fetch task details from Firestore
    const task = await getDocument("tasks", taskID);

    // Select elements in tracking.html to display task details
    const favorTypeH2Data = document.getElementById("favorTypeH2");
    const taskStatusData = document.getElementById("taskStatus");
    const favorTypeData = document.getElementById("favorType");
    const dateData = document.getElementById("date");
    const timeData = document.getElementById("time");
    const favorLengthData = document.getElementById("favorLength");
    const startAddressData = document.getElementById("startAddress");
    const endAddressData = document.getElementById("endAddress");
    const taskIdData = document.getElementById("taskID");
    const notesData = document.getElementById("notes");

    // Change color of statusColor depending on status
    const statusColor = document.querySelector(".statusColor");
    if (task.status == "Waiting to be accepted") {
        statusColor.style.backgroundColor = "red";
    }

    switch(task.status) {
        case "Waiting to be accepted":
            statusColor.style.backgroundColor = "#ffcd29";
            break;
        case "On going":
            statusColor.style.backgroundColor = "#0D99FF";
            break;
        case "Pending approval":
            statusColor.style.backgroundColor = "#ffcd29";
            break;
        case "Completed":
            statusColor.style.backgroundColor = "#44c451";
            break;
        case "Cancelled":
            statusColor.style.backgroundColor = "#f24822";
            break;
        default:
            statusColor.style.backgroundColor = "white";
    }

    console.log(task.status);

    // Display task details in the respective HTML elements
    favorTypeH2Data.innerHTML = `${task.name} Favor`;
    taskStatusData.innerHTML = task.status;
    favorTypeData.innerHTML = task.name;
    dateData.innerHTML = task.details.date;
    timeData.innerHTML = task.details.time;
    favorLengthData.innerHTML = task.details.favorLength;
    startAddressData.innerHTML = task.details.startAddress;
    endAddressData.innerHTML = task.details.endAddress;
    taskIdData.innerHTML = taskID;
    notesData.innerHTML = task.notes;

  } catch (error) {
    console.log("Error fetching task:", error);
  }
}
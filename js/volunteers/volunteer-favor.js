import { getCurrentUserID } from "../firebase/authentication.js";
import { updateDocument, getDocument, getFile, getAllWithFilter } from "../firebase/firestore.js";
import { sendNotification } from "../notification.js";
import { redirect } from "../utils.js";

let taskID;
let taskData = {};

// TODO: Need to define placeholder image properly
const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

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

  // On Common Display===========
  let taskName = document.getElementById("taskName");
  let elderName = document.getElementById("elderName");
  let elderAddress = document.getElementById("elderAddress");
  let startAddress = document.getElementById("startAddress");
  let endAddress = document.getElementById("endAddress");
  let taskTime = document.getElementById("taskTime");
  let taskNote = document.getElementById("taskNote");

  // On Confirm task Overlay Display========
  let confirmTaskName = document.getElementById("confirmTaskName");
  let confirmWrapperElderName = document.getElementById("confirmWrapperElderName");
  let confirmElderName = document.getElementById("confirmElderName");
  let confirmElderAddress = document.getElementById("confirmElderAddress");

  // On Accept task Overlay Display========
  let acceptTaskName = document.getElementById("acceptTaskName");
  let acceptTaskTime = document.getElementById("acceptTaskTime");
  let acceptWrapperElderName = document.getElementById("acceptWrapperElderName");
  let acceptElderName = document.getElementById("acceptElderName");
  let acceptElderAddress = document.getElementById("acceptElderAddress");

  // On Task Completed Overlay Display===========
  let completedElderName = document.getElementById("completedElderName");
  let approvedElderName = document.getElementById("approvedElderName");

  // Get the task data from the Firestore
  getDocument("tasks", taskID)
    .then((task) => {
      console.log(task);
      if(!task) redirect("../../404.html");
      // Save the task data to a global variable
      taskData = task;
      getDocument("users", task.requesterID).then((user) => {
        // Retrieve Task name
        taskName.innerHTML = taskData.name;

        // Retrieve Elder's name and address
        console.log(user.firstName);
        elderName.innerHTML = `${user.firstName} ${user.lastName}`;
        elderAddress.innerHTML = user.address;

        // On Confirm task Overlay Display
        confirmTaskName.innerHTML = taskData.name;
        confirmWrapperElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        confirmElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        confirmElderAddress.innerHTML = user.address;

        // On Accept task Overlay Display
        acceptTaskName.innerHTML = taskData.name;
        acceptWrapperElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        acceptElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        acceptElderAddress.innerHTML = user.address;

        // On Task Completed Overlay Display
        completedElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        approvedElderName.innerHTML = `${user.firstName} ${user.lastName}`;

        getFile("profile/" + user.profilePictureURL)
          .then((url) => {
            document.getElementById("elderPhoto").src = url;
            document.getElementById("elderPhoto2").src = url;
            document.getElementById("elderPhoto3").src = url;
          })
          .catch((error) => {
            console.log(error);
            document.getElementById("elderPhoto").src = placeholderImage;
            document.getElementById("elderPhoto2").src = placeholderImage;
            document.getElementById("elderPhoto3").src = placeholderImage;
          });

        // Retrieve Task address, date and note
        startAddress.innerHTML = taskData.details.startAddress;
        endAddress.innerHTML = taskData.details.endAddress;
        taskTime.innerHTML = `${taskData.details.date} ${taskData.details.time}`;
        taskNote.innerHTML = taskData.notes;

        // To display buttons and icons depending on task.status
        let acOrDecBtn = document.getElementById("acOrDecBtn");
        let comOrCanBtn = document.getElementById("comOrCanBtn");
        let icons = document.getElementById("icons");
        let contactBtn = document.getElementById("contactBtn");

        if (task.status === STATUS_WAITING) {
          acOrDecBtn.style.visibility = "visible";
          contactBtn.remove();
          comOrCanBtn.remove();
          icons.remove();
        }

        if (task.status === STATUS_ONGOING) {
          contactBtn.style.visibility = "visible";
          comOrCanBtn.style.visibility = "visible";
          acOrDecBtn.remove();
          icons.remove();
        }

        if (task.status === STATUS_PENDING) {
          contactBtn.style.visibility = "visible";
          icons.style.visibility = "visible";
        }

        if (task.status === STATUS_COMPLETED) {
          contactBtn.remove();
          icons.style.visibility = "visible";
        }

        if (task.status === STATUS_CANCELLED) {
          contactBtn.remove();
          icons.style.visibility = "visible";
        }
      });

      // Add the link to the chat room to the contact button
      const contactBtn = document.getElementById("contactBtn");
      if (contactBtn) {
        contactBtn.addEventListener("click", async function () {
          try {
            const task = await getDocument("tasks", taskID);
            const loginUserID = getCurrentUserID();
            const requesterID = task.requesterID;
            const chatRoomID = [loginUserID, requesterID].sort().join("-");
            window.location.href = `/chat.html?crid=${chatRoomID}`;
          } catch (error) {
            console.log(error);
          }
        });
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

async function acceptTask(taskID, taskData) {
  try {
    // Get the volunteer ID
    const volunteerID = getCurrentUserID();

    // Create updated task data object with the volunteer ID and status "On going"
    taskData.volunteerID = volunteerID;
    taskData.status = STATUS_ONGOING;
    console.log(taskData);

    // Update the task data on the Firestore
    await updateDocument("tasks", taskID, taskData);
    console.log("Task accepted!", taskID.taskData);
    // Get the current user data
    const currentUser = await getDocument("users", getCurrentUserID());

    // Get the current user's profile picture for the notification
    const url = currentUser.profilePictureURL ? await getFile(`profile/${currentUser.profilePictureURL}`) : "#";
    // Send a notification to the requester
    sendNotification(
      {
        title: "Favor accepted!",
        link: `../tasks/elder-favor.html?taskid=${taskID}`,
        icon: url,
        message: `<span>${currentUser.firstName}</span> has accepted to help you with your ${taskData.name} favor!`,
        senderID: currentUser.id
      },
      taskData.requesterID
    );
  } catch (error) {
    console.error("Failed to accept the task:", error);
  }
}

async function completeTask(taskID, taskData) {
  try {
    // Get the volunteer ID
    const volunteerID = getCurrentUserID();

    // To complete the task, set the status to "Pending approval"
    taskData.volunteerID = volunteerID;
    taskData.status = STATUS_PENDING;

    // Update the task data on the Firestore
    updateDocument("tasks", taskID, taskData);

    // Get the current user data
    const currentUser = await getDocument("users", getCurrentUserID());

    // Get the current user's profile picture for the notification
    const url = currentUser.profilePictureURL ? await getFile(`profile/${currentUser.profilePictureURL}`) : "#";

    // Send a notification to the requester
    sendNotification(
      {
        title: "Approval Required",
        message: `<span>${currentUser.firstName}</span> has completed your <span>${taskData.name}</span> favor. Click here to approve now`,
        icon: url,
        link: `/tasks/elder-favor.html?taskid=${taskID}`,
        updateType: "danger",
        senderID: currentUser.id,
      },
      taskData.requesterID
    );
  } catch (error) {
    console.error("Failed to complete the task:", error);
  }
}

async function cancelTask(taskID, taskData) {
  try {
    // Get the volunteer ID
    const volunteerID = getCurrentUserID();

    // To cancel the task, remove the volunteer ID and set the status to "Waiting to be accepted"
    taskData.volunteerID = null;
    taskData.status = STATUS_WAITING;

    // Update the task data on the Firestore
    await updateDocument("tasks", taskID, taskData);
  } catch (error) {
    console.error("Failed to cancel the task:", error);
  }
}

async function checkScheduleConflict(taskData) {
  try {
    // Get the volunteer ID
    const volunteerID = getCurrentUserID();

    // Target task data
    let targetDate = taskData.details.date;
    let targetTime = taskData.details.time;

    // Calculate the task duration (Tentative duration is 1 hour)
    let tentativeDuration = 60 * 60 * 1000;

    // Calculate the target task's start and end time
    let conflictFound = false;
    let targetStartTime = new Date(`${targetDate} ${targetTime}`);
    let targetEndTime = new Date(targetStartTime.getTime() + tentativeDuration);
    console.log(`Target task: ${targetStartTime} - ${targetEndTime}`);

    // Retrieve all tasks with the volunteer ID and status "On going"
    let filterConditions = [
      { key: "volunteerID", operator: "==", value: volunteerID },
      { key: "status", operator: "==", value: STATUS_ONGOING },
    ];
    let tasks = await getAllWithFilter("tasks", filterConditions);

    // Check if there is a schedule conflict in the accepted tasks
    for (const [taskid, taskData] of tasks) {
      let startTime = new Date(`${taskData.details.date} ${taskData.details.time}`);
      let endTime = new Date(startTime.getTime() + tentativeDuration);
      console.log(`Existing task ${startTime} - ${endTime}`);

      if (targetStartTime < endTime && targetEndTime > startTime) {
        // "Schedule-conflict" ON
        document.getElementById("schedule-conflict").style.display = "block";

        // Set the conflictFound flag to true
        conflictFound = true;
        console.log("Schedule is conflicted");
        return;
      }
    }

    // If no schedule conflict is found, display the confirm overlay
    if (!conflictFound) {
      document.getElementById("confirm-overlay").style.display = "block";
    }
  } catch (error) {
    console.error("Failed to check the task confliction:", error);
  }
}

const acceptBtn = document.getElementById("acceptBtn");
if (acceptBtn)
  acceptBtn.addEventListener("click", function () {
    checkScheduleConflict(taskData);
  });

// On "Favor Details"===============

// To display "accept-overlay" ON
function acceptOn() {
  document.getElementById("accept-overlay").style.display = "block";
}

const confirmBtn = document.getElementById("confirmBtn");
if (confirmBtn)
  confirmBtn.addEventListener("click", async function () {
    await acceptTask(taskID, taskData);
    console.log(taskData);
    acceptOn();
  });

const conflictConfirmBtn = document.getElementById("conflictConfirmBtn");
if (conflictConfirmBtn)
  conflictConfirmBtn.addEventListener("click", function () {
    exploreFavors();
  });

// To move back to "dashboard.html"
function goHome() {
  window.location.href = "/dashboard.html";
}

// To move back to "dashboard.html#myFavors"
function goMyFavors() {
  window.location.href = "/dashboard.html#myfavors";
}

const myFavorsBtn = document.getElementById("myFavorsBtn");
if (myFavorsBtn)
  myFavorsBtn.addEventListener("click", function () {
    goMyFavors();
  });

// On "My Favor"===============
function completeConfirmOn() {
  document.getElementById("complete-confirm-overlay").style.display = "block";
}

document.getElementById("confirmCompleteBtn").addEventListener("click", function () {
  completeConfirmOn();
});

function taskCompletedOn() {
  document.getElementById("task-completed-overlay").style.display = "block";
}

document.getElementById("completeBtn").addEventListener("click", function () {
  completeTask(taskID, taskData);
  taskCompletedOn();
});

function exploreFavors() {
  window.location.href = "/dashboard.html";
}

document.getElementById("exploreBtn").addEventListener("click", function () {
  exploreFavors();
});

document.getElementById("cancelBtn").addEventListener("click", async function () {
  document.getElementById("cancel-favor-overlay").style.display = "block";
});

function cancelCompletedOn() {
  document.getElementById("cancel-complete-overlay").style.display = "block";
  document.getElementById("cancel-favor-overlay").style.display = "none";
}

document.getElementById("cancelFavorBtn").addEventListener("click", function () {
  cancelCompletedOn();
});

document.getElementById("cancel-completeBtn").addEventListener("click", async function () {
  console.log(taskData);
  await cancelTask(taskID, taskData);
  exploreFavors();
});


// Close overlay display by clicking "x" icon
// document.getElementById("close-confirm").addEventListener("click", function () {
//   console.log("clicked!");
// });


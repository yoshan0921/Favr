import { getCurrentUserID } from "../firebase/authentication.js";
import { updateDocument, getDocument, getFile, getAllWithFilter} from "../firebase/firestore.js";
import { sendNotification } from "../notification.js";

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
  let taskAddress = document.getElementById("taskAddress");
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

        // On Confirm task Overlay Display========
        confirmTaskName.innerHTML = taskData.name;
        confirmWrapperElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        confirmElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        confirmElderAddress.innerHTML = user.address;

        // On Accept task Overlay Display========
        acceptTaskName.innerHTML = taskData.name;
        acceptWrapperElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        acceptElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        acceptElderAddress.innerHTML = user.address;

        // On Task Completed Overlay Display===========
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

        // To display buttons and icons depending on task.status================
        let acOrDecBtn = document.getElementById("acOrDecBtn");
        let comOrCanBtn = document.getElementById("comOrCanBtn");
        let icons = document.getElementById("icons");
        let contactBtn = document.getElementById("contactBtn");

        if (task.status === "Waiting to be accepted") {
          acOrDecBtn.style.visibility = "visible";
          contactBtn.remove();
          comOrCanBtn.remove();
          icons.remove();
        }

        if (task.status === "On going") {
          contactBtn.style.visibility = "visible";
          comOrCanBtn.style.visibility = "visible";
          acOrDecBtn.remove();
          icons.remove();
        }

        if (task.status === "Pending approval") {
          contactBtn.style.visibility = "visible";
          icons.style.visibility = "visible";
        }

        if (task.status === "Completed") {
          contactBtn.remove();
          icons.style.visibility = "visible";
        }

        if (task.status === "Cancelled") {
          contactBtn.remove();
          icons.style.visibility = "visible";
        }
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

  // // Target task data
  // let targetDate = taskData.details.date
  // let targetTime = taskData.details.time
  // // Check On going task
  // let filterConditions = [
  //   { key: 'volunteerID', operator: '==', value: volunteerID },
  //   { key: 'status', operator: '==', value: STATUS_ONGOING },
  // ];
  
  // let tasks = await getAllWithFilter("tasks", filterConditions);
  // let tentativeDuration = 1; // This might be changed

  
  // tasks.forEach((task) => {

  //   console.log(taskData.details.date);

  //   let startTime = new Date(task.date, task.time);
  //   console.log(startTime);
  //   let endTime = new Date(task.date, task.time + tentativeDuration);
  //   console.log(endTime);
  //   let targetStartTime = new Date(targetDate, targetTime);
  //   let targetEndTime = new Date(targetDate, targetTime + tentativeDuration);
  
  //   if (targetStartTime <= endTime || targetEndTime >= startTime) {
  //     console.log("Schedule is conflicted");


  //     // ToDo: Display conflict message popup
  //     // Code here...

  //     function scheduleConflictOn() {
  //       document.getElementById("schedule-conflict").style.display = "block";
  //     }
    
  //     return; 
  //   }
  // });
  

  // Create updated task data object with the volunteer ID and status "On going"
  taskData.volunteerID = volunteerID;
  taskData.status = STATUS_ONGOING;
  console.log(taskData);

  // Update the task data on the Firestore
  await updateDocument("tasks", taskID, taskData)
    .then(() => {
      console.log(taskData, taskID);
      console.log("Task accepted!");
      sendNotification(
        {
          title: "Favor accepted!",
          link: `../tasks/volunteer-favor.html?taskid=${taskID}`,
          message: `A volunteer has accepted to help you with your ${taskData.name} favor!`
        },
        taskData.requesterID);
    })
    .catch((error) => {
      console.log(error);
    });
  console.log(taskData);
}

async function completeTask(taskID, taskData) {
  console.log(taskData);

  // Get the volunteer ID
  const volunteerID = getCurrentUserID();

  // Create updated task data object with the volunteer ID and status "On going"
  taskData.volunteerID = volunteerID;
  taskData.status = STATUS_PENDING;
  console.log(taskData);

  // Update the task data on the Firestore
  updateDocument("tasks", taskID, taskData)
    .then(async () => {
      console.log("Task completed!");
      let url = "#";
      const currentUser = await getDocument("users", getCurrentUserID());
      if (currentUser.profilePictureURL) {
        url = await getFile(`profile/${currentUser.profilePictureURL}`);
      }
      sendNotification(
        {
          title: "Approval Required",
          message: `<span>${currentUser.firstName}</span> has completed your <span>${taskData.name}</span> favor. Click here to approve now`,
          icon: url,
          link: `/tasks/elder-favor.html?taskid=${taskID}`,
          updateType: "danger",
          senderID: currentUser.id
        },
        taskData.requesterID
      )
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

// Link to chat room
document.getElementById("contactBtn").addEventListener("click", function () {
  getDocument("tasks", taskID)
    .then((task) => {
      let loginUserID = getCurrentUserID();
      let requesterID = task.requesterID;
      let chatRoomID = [loginUserID, requesterID].sort().join("-");
      window.location.href = `/chat.html?crid=${chatRoomID}`;
    })
    .catch((error) => {
      console.log(error);
    });
});

// On "Favor Details"===============

// To display "confirm-overlay" ON
function confirmOn() {
  document.getElementById("confirm-overlay").style.display = "block";
}

document.getElementById("acceptBtn").addEventListener("click", function () {
  confirmOn();
});

// To display "confirm-overlay" OFF
function confirmOff() {
  document.getElementById("confirm-overlay").style.display = "none";
}

document.getElementById("backBtn").addEventListener("click", function () {
  confirmOff();
});

// To display "accept-overlay" ON
function acceptOn() {
  document.getElementById("accept-overlay").style.display = "block";
}

document.getElementById("confirmBtn").addEventListener("click", async function () {
  await acceptTask(taskID, taskData);
  console.log(taskData);
  acceptOn();
});

// To move back to "dashboard.html"
function goHome() {
  window.location.href = "/dashboard.html";
}

// To move back to "dashboard.html#myFavors"
function goMyFavors() {
  window.location.href = "/dashboard.html#myfavors";
}

document.getElementById("homeBtn").addEventListener("click", function () {
  goHome();
});

const declineBtn = document.getElementById("declineBtn");
if(declineBtn) declineBtn.addEventListener("click", function () {
  goHome();
});

const myFavorsBtn = document.getElementById("myFavorsBtn")
if(myFavorsBtn) myFavorsBtn.addEventListener("click", function () {
  goMyFavors();
});

// On "My Favor"===============
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
  completeTask(taskID, taskData);
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

// Create click events on each icons=============
const thumsDown = document.getElementById("thumsDown");
if(thumsDown) thumsDown.addEventListener("click", function () {
  exploreFavors();
});

const thumsUp = document.getElementById("thumsUp");
if(thumsUp) thumsUp.addEventListener("click", function () {
  exploreFavors();
});

const thumsDownOverlay = document.getElementById("thumsDown-overlay");
if(thumsDownOverlay) thumsDownOverlay.addEventListener("click", function () {
  exploreFavors();
});

const thumsUpOverlay = document.getElementById("thumsUp-overlay");
if(thumsUpOverlay) thumsUpOverlay.addEventListener("click", function () {
  exploreFavors();
});

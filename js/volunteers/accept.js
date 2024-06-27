import { getCurrentUserID } from "../firebase/authentication.js";
import { messaging } from "../firebase/firebase.js";
import { updateDocument, getDocument, getFile } from "../firebase/firestore.js";

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

  let taskName = document.getElementById("taskName");
  let confirmTaskName = document.getElementById("confirmTaskName");
  let acceptTaskName = document.getElementById("acceptTaskName");

  let elderName = document.getElementById("elderName");
  let confirmWrapperElderName = document.getElementById("confirmWrapperElderName");
  let confirmElderName = document.getElementById("confirmElderName");
  let acceptWrapperElderName = document.getElementById("acceptWrapperElderName");
  let acceptElderName = document.getElementById("acceptElderName");

  let elderAddress = document.getElementById("elderAddress");
  let confirmElderAddress = document.getElementById("confirmElderAddress");
  let acceptElderAddress = document.getElementById("acceptElderAddress");

  let taskAddress = document.getElementById("taskAddress");
  let taskTime = document.getElementById("taskTime");

  let taskNote = document.getElementById("taskNote");

  // Get the task data from the Firestore
  getDocument("tasks", taskID)
    .then((task) => {
      console.log(task);
      // Save the task data to a global variable
      taskData = task;
      getDocument("users", task.requesterID).then((user) => {
        elder = user;
        // ToDo: Display task data on the page
        // Code here...

        // Retrieve Task name====================
        taskName.innerHTML = taskData.name;
        confirmTaskName.innerHTML = taskData.name;
        acceptTaskName.innerHTML = taskData.name;



        // Retrieve Elder's name and address=====================
        console.log(user.firstName);
        elderName.innerHTML = `${user.firstName} ${user.lastName}`;
        elderAddress.innerHTML = user.address;

        confirmWrapperElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        confirmElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        confirmElderAddress.innerHTML = user.address;

        acceptWrapperElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        acceptElderName.innerHTML = `${user.firstName} ${user.lastName}`;
        acceptElderAddress.innerHTML = user.address;

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

  const volunteer = await getDocument("users", volunteerID);
  let message = {
      "notification": {
          "title": "Your task was accepted!",
          "body": `${volunteer.firstName} has accepted your ${taskData.title} favour`,
          "click_action": "http://localhost:5500/dashboard.html"
      }
  }
  sendNotification(taskData.requesterID, message)
  // Update the task data on the Firestore
//   await updateDocument("tasks", taskID, taskData)
//     .then(() => {
//       console.log(taskData, taskID);
//       console.log("Task accepted!");
//     })
//     .catch((error) => {
//       console.log(error);
//     });
// console.log(taskData);

      await updateDocument("tasks", taskID, {
        volunteerID: volunteerID,
        status: "On going"
      })
      .then(() => {
        console.log(taskData, taskID);
        console.log("Task accepted!");
      })
      .catch((error) => {
        console.log(error);
      });
      console.log(taskData);

}


// function cancel() {
//   document.getElementById("cancelBtn").addEventListener("click", function () {
//     window.location.href = "/dashboard.html";
//   });
// }

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

document.getElementById("cancelBtn").addEventListener("click", function () {
  goHome();
});

document.getElementById("myFavorsBtn").addEventListener("click", function () {
  goMyFavors();
});

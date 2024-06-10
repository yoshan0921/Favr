import { loadPartial } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAll, getDocument } from "./firebase/firestore.js";
import { createMapView } from "./map.js";
import { redirect } from "./utils.js";

let currentUserID;
let currentUserRole;
let favorCount = 0;

window.addEventListener("load", function (event) {
  // Check if the user is logged in
  monitorAuthenticationState();

  //Give "active" class to a tag under nav#sidebar based on the current html file name
  const filename = window.location.pathname.split("/").pop();
  if (filename.startsWith("dashboard.html")) {
    document.getElementById("home-menu").classList.add("active");
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  console.log(document.readyState);
  runFunction();
}

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there.
 */
async function runFunction() {
  currentUserID = getCurrentUserID();
  currentUserRole = await getCurrentUserRole();

  // Wait for loadPartial to complete before loading the dashboard.
  await loadPartial(`dashboard/_${currentUserRole}Dashboard`, "dashboard-content");

  // Load the dashboard based on the user's role
  if (currentUserRole === "volunteer") {
    loadVolunteersDashboard();
  } else if (currentUserRole === "elder") {
    loadEldersDashboard();
  }

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.innerText = "Dashboard";
}

/**
 * Load the dashboard for elders
 */
function loadEldersDashboard() {
  // Retrieve tasks from the database
  populateTaskListForElders();
}

/**
 * Load the dashboard for volunteers
 */
function loadVolunteersDashboard() {
  // Retrieve tasks from the database
  populateTaskListForVolunteers();

  // View switcher radio buttons
  const mapView = document.getElementById("mapView");
  const listView = document.getElementById("listView");

  // Tab menu
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content-item");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove 'active' class from all tabs
      tabs.forEach((tab) => tab.classList.remove("active"));

      // Add 'active' class to the clicked tab
      tab.classList.add("active");

      // Remove 'hide' class from all tab contents
      tabContents.forEach((content) => content.classList.add("hide"));

      // Add 'hide' class to the clicked tab's content
      const contentId = `${tab.id}-content`;
      document.getElementById(contentId).classList.remove("hide");
    });
  });

  // Switch between map and list view (toggle hide class)
  if (mapView) {
    mapView.addEventListener(
      "change",
      (event) => {
        if (event.cancelable) event.preventDefault();
        document.getElementById("taskMapExplore").classList.remove("hide");
        document.getElementById("taskListExplore").classList.add("hide");
      },
      { passive: false }
    );
  }
  if (listView) {
    listView.addEventListener(
      "change",
      (event) => {
        if (event.cancelable) event.preventDefault();
        document.getElementById("taskMapExplore").classList.add("hide");
        document.getElementById("taskListExplore").classList.remove("hide");
      },
      { passive: false }
    );
  }
}

/**
 * Fetches data from the "Tasks" collection of Firestoer Database
 * and displays on a table
 */
async function populateTaskListForElders() {
  try {
    let allTasks = await getAll("tasks");
    // Create card view
    createListViewForElders(allTasks);
  } catch (error) {
    console.log(error);
  }
}
async function populateTaskListForVolunteers() {
  try {
    let allTasks = await getAll("tasks");
    // Create map view
    createMapView(allTasks);
    // Create card view
    createListViewForVolunteers(allTasks);
  } catch (error) {
    console.log(error);
  }
}
function createListViewForElders(allTasks) {
  const list = document.getElementById("taskList");
  for (let task of allTasks) {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data

    // Get requester's information
    Promise.all([getDocument("users", taskDetails.requesterID), getDocument("users", taskDetails.volunteerID)])
      .then(([requester, volunteer]) => {
        console.log(id);
        console.log(requester);
        console.log(volunteer);
        console.log(taskDetails);

        // Check if the requester of the task is the current user
        if (taskDetails.requesterID !== currentUserID) return;

        // Get task information
        let taskName = taskDetails.name ? taskDetails.name : "Not provided";
        let taskRequesterPhoto = taskDetails.profilePictureURL ? taskDetails.profilePictureURL : "https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512";
        let taskDate = taskDetails.details["date"] ? taskDetails.details["date"] : "Not provided";
        let taskDuration = taskDetails.details["duration"] ? taskDetails.details.duration : "Not provided";
        let taskRequesterAddress = requester.address ? requester.address : "Not provided";
        let taskStatus = taskDetails.status ? taskDetails.status : "Not provided";
        let taskNotes = taskDetails.notes ? taskDetails.notes : "Not provided";

        let taskVolunteerFirstName;
        let taskVolunteerLastName;
        let taskVolunteerInstitution;
        if (volunteer === undefined) {
          taskVolunteerFirstName = "Not provided";
          taskVolunteerLastName = "Not provided";
          taskVolunteerInstitution = "Not provided";
        } else {
          taskVolunteerFirstName = volunteer.firstName ? volunteer.firstName : "Not provided";
          taskVolunteerLastName = volunteer.lastName ? volunteer.lastName : "Not provided";
          taskVolunteerInstitution = volunteer.institution ? volunteer.institution : "Not provided";
        }
        // Create task card
        const card = document.createElement("div");
        card.classList.add("taskCard");
        card.innerHTML = `
        <a href="/tasks/tracking.html?taskid=${id}"></a>
        <h3 class="title">${taskName}</h3>
        <p class="status"><span class="statusColor"></span>${taskStatus}</p>
        <p class="notes">${taskNotes}</p>
        <div class="requester">
          <img class="photo" src="${taskRequesterPhoto}">
          <div class="profile">
            <p class="name">${taskVolunteerFirstName} ${taskVolunteerLastName}</p>
            <p class="address">${taskVolunteerInstitution}</p>
          </div>
        </div>
        `;

        // Append card to the correct list based on the task status
        if (["Waiting to be accepted"].includes(taskDetails.status)) {
          card.querySelector(".taskCard .statusColor").style.backgroundColor = "#ffcd29";
          list.appendChild(card);
        } else if (["On going"].includes(taskDetails.status)) {
          card.querySelector(".taskCard .statusColor").style.backgroundColor = "#0D99FF";
          list.appendChild(card);
        } else if (["Pending approval", "Cancelled"].includes(taskDetails.status)) {
          list.appendChild(card);
          if (taskDetails.status === "Pending approval") {
            card.querySelector(".taskCard .statusColor").style.backgroundColor = "#ffcd29";
            card.setAttribute("data-status", "Pending approval");
          } else if (taskDetails.status === "Completed") {
            card.querySelector(".taskCard .statusColor").style.backgroundColor = "#44c451";
            card.setAttribute("data-status", "Completed");
          } else if (taskDetails.status === "Cancelled") {
            card.querySelector(".taskCard .statusColor").style.backgroundColor = "#f24822";
            card.setAttribute("data-status", "Cancelled");
          }
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }
}
function createListViewForVolunteers(allTasks) {
  const listExplore = document.getElementById("taskListExplore");
  const listMyFavor = document.getElementById("taskListMyFavor");
  const listHistory = document.getElementById("taskListHistory");
  for (let task of allTasks) {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data

    // Get requester's information
    getDocument("users", taskDetails.requesterID)
      .then((requester) => {
        console.log(requester);
        console.log(taskDetails);

        // Get task information
        let taskName = taskDetails.name ? taskDetails.name : "Not provided";
        let taskRequesterPhoto = taskDetails.profilePictureURL ? taskDetails.profilePictureURL : "https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512";
        let taskDate = taskDetails.details["date"] ? taskDetails.details["date"] : "Not provided";
        let taskDuration = taskDetails.details["duration"] ? taskDetails.details.duration : "Not provided";
        let taskRequesterName = requester.firstName + " " + requester.lastName ? requester.firstName + " " + requester.lastName : "Not provided";
        let taskRequesterAddress = requester.address ? requester.address : "Not provided";

        // Create task card
        const card = document.createElement("div");
        card.classList.add("taskCard");
        card.innerHTML = `
        <a href="/tasks/accept.html?taskid=${id}"></a>
        <h3 class="title">${taskName}</h3>
        <div class="statusColor"></div>
        <p class="date">${taskDate}</p>
        <p class="duration">Estimated Favor Length: <span class="bold">${taskDuration}</span></p>
        <div class="requester">
          <img class="photo" src="${taskRequesterPhoto}">
          <div class="profile">
            <p class="name">${taskRequesterName}</p>
            <p class="address">${taskRequesterAddress}</p>
          </div>
        </div>
        `;

        // Append card to the correct list based on the task status
        if (["Waiting to be accepted"].includes(taskDetails.status)) {
          listExplore.appendChild(card);
        } else if (["On going"].includes(taskDetails.status) && taskDetails.volunteerID === currentUserID) {
          listMyFavor.appendChild(card);
          favorCount++;
        } else if (["Pending approval", "Completed", "Cancelled"].includes(taskDetails.status) && taskDetails.volunteerID === currentUserID) {
          listHistory.appendChild(card);
          if (taskDetails.status === "Pending approval") {
            card.querySelector(".taskCard .statusColor").style.backgroundColor = "#ffcd29";
            card.setAttribute("data-status", "Pending approval");
          } else if (taskDetails.status === "Completed") {
            card.querySelector(".taskCard .statusColor").style.backgroundColor = "#44c451";
            card.setAttribute("data-status", "Completed");
          } else if (taskDetails.status === "Cancelled") {
            card.querySelector(".taskCard .statusColor").style.backgroundColor = "#f24822";
            card.setAttribute("data-status", "Cancelled");
          }
        }

        // Update favor count on tabmenu
        document.getElementById("favorCount").innerText = favorCount;
      })
      .catch((error) => {
        console.log(error);
      });
  }
}

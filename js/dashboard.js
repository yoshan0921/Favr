import { closeModal, loadPartial, openModal } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAll, getDocument, getFile } from "./firebase/firestore.js";
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
    await loadVolunteersDashboard();
  } else if (currentUserRole === "elder") {
    await loadEldersDashboard();
  }

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.innerText = "Dashboard";

  //==========
  //  Modal for Task Acceptance
  //==========
  const modal = document.getElementById("acceptTaskModal");

  // Get all the buttons that open the modal
  const selectBtns = document.querySelectorAll(".taskCard");
  console.log(selectBtns);

  // Get the <span> element that closes the modal
  const closeModalBtn = document.getElementsByClassName("close")[0];

  // When the user clicks on the button, open the modal
  selectBtns.forEach((selectBtn) => {
    // TO be used later.
    // selectBtn.onclick = function (event) {
    //   console.log("Button clicked:", event.target);
    //   modal.style.display = "block";
    // };
  });

  // When the user clicks on <span> (x), close the modal
  if (closeModalBtn)
    closeModalBtn.onclick = function () {
      modal.style.display = "none";
    };

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

/**
 * Load the dashboard for elders
 */
async function loadEldersDashboard() {
  // Retrieve tasks from the database
  await populateTaskListForElders();
}

/**
 * Load the dashboard for volunteers
 */
async function loadVolunteersDashboard() {
  // Retrieve tasks from the database
  await populateTaskListForVolunteers();

  // View switcher radio buttons
  const taskViewSwitch = document.getElementById("taskViewSwitch");
  //Filter button
  const filterBtn = document.getElementById("openFilterBtn");
  const filterModal = document.getElementById("filterModal");
  const closeFilterBtn = document.getElementById("cancelFilter");

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
      tabContents.forEach((content) => content.classList.add("hidden"));

      // Add 'hide' class to the clicked tab's content
      const contentId = `${tab.id}-content`;
      document.getElementById(contentId).classList.remove("hidden");
    });
  });

  // Switch between map and list view (toggle hidden class)
  if (taskViewSwitch) {
    taskViewSwitch.addEventListener(
      "change",
      (event) => {
        if (event.cancelable) event.preventDefault();
        document.getElementById("taskMapExplore").classList.toggle("hidden");
        document.getElementById("taskListExplore").classList.toggle("hidden");
      },
      { passive: false }
    );
  }
  if(filterBtn){
    filterBtn.addEventListener(
      "click",
      ()=>{
        openModal(filterModal);
      }
    )
  }
  if(closeFilterBtn){
    closeFilterBtn.addEventListener(
      "click", 
      ()=>closeModal(filterModal)
    );
  }
}

/**
 * For elders' dashboard:
 * Fetches data from the "tasks" collection and show them
 * as card view or list view.
 */
async function populateTaskListForElders() {
  try {
    let allTasks = await getAll("tasks");
    // Create card view
    await createListViewForElders(allTasks);
  } catch (error) {
    console.log(error);
  }
}
async function createListViewForElders(allTasks) {
  const list = document.getElementById("taskList");
  for (let task of allTasks) {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data

    // Get requester's information
    Promise.all([getDocument("users", taskDetails.requesterID), getDocument("users", taskDetails.volunteerID)])
      .then(async ([requester, volunteer]) => {
        console.log(id);
        console.log(requester);
        console.log(volunteer);
        console.log(taskDetails);

        // Check if the requester of the task is the current user
        if (taskDetails.requesterID !== currentUserID) return;

        // Get task information
        let taskName = taskDetails.name ?? "";
        let taskStatus = taskDetails.status ?? "";
        let taskVolunteerPhoto;
        try {
          taskVolunteerPhoto = await getFile("profile/" + volunteer.profilePictureURL);
        } catch (error) {
          taskVolunteerPhoto = "https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512";
        }

        let taskVolunteerFirstName;
        let taskVolunteerLastName;
        let taskVolunteerInstitution;
        try {
          taskVolunteerFirstName = volunteer.firstName ?? "";
          taskVolunteerLastName = volunteer.lastName ?? "";
          taskVolunteerInstitution = volunteer.institution ?? "";
        } catch (error) {
          taskVolunteerFirstName = "";
          taskVolunteerLastName = "";
          taskVolunteerInstitution = "";
        }

        // Create task card
        const card = document.createElement("div");
        card.classList.add("taskCard");
        card.innerHTML = `
        <a href="/tasks/tracking.html?taskid=${id}"></a>
        <h3 class="title">${taskName}</h3>
        <p class="status"><span class="statusColor"></span>${taskStatus}</p>
        `;
        if (taskDetails.status != "Waiting to be accepted") {
          card.innerHTML += `
          <div class="requester">
            <img class="photo" src="${taskVolunteerPhoto}">
            <div class="profile">
              <p class="name">${taskVolunteerFirstName} ${taskVolunteerLastName}</p>
              <p class="address">${taskVolunteerInstitution}</p>
            </div>
          </div>
          `;
        }

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

/**
 * For volunteers' dashboard:
 * Fetches data from the "tasks" collection and show them
 * as card view or list view.
 */
async function populateTaskListForVolunteers() {
  try {
    let allTasks = await getAll("tasks");
    // Create map view
    await createMapView(allTasks);
    // Create card view
    await createListViewForVolunteers(allTasks);
  } catch (error) {
    console.log(error);
  }
}
async function createListViewForVolunteers(allTasks) {
  const listExplore = document.getElementById("taskListExplore");
  const listMyFavor = document.getElementById("taskListMyFavor");
  const listHistory = document.getElementById("taskListHistory");

  // Map allTasks to an array of Promises
  const tasksPromises = allTasks.map((task) => {
    // for (let task of allTasks) {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data

    // Get requester's information
    return getDocument("users", taskDetails.requesterID)
      .then(async (requester) => {
        console.log(requester);
        console.log(taskDetails);

        // Get task information
        let taskName = taskDetails.name ?? "";
        let taskDate = taskDetails.details["date"] ?? "";
        let taskDuration = taskDetails.details["duration"] ?? "";
        let taskRequesterName = `${requester.firstName} ${requester.lastName}` ?? "";
        let taskRequesterAddress = requester.address ?? "";
        let taskRequesterPhoto;
        try {
          taskRequesterPhoto = await getFile("profile/" + requester.profilePictureURL);
        } catch (error) {
          taskRequesterPhoto = "https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512";
        }

        // Create task card
        const card = document.createElement("div");
        card.classList.add("taskCard");
        card.innerHTML = `
        <a href="/tasks/accept.html?taskid=${id}" data-taskid="${id}"></a>
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
  });
  // Wait for all Promises to resolve
  return Promise.all(tasksPromises);
}

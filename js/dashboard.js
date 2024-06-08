import { loadPartial } from "./common.js";
import { getCurrentUserRole } from "./firebase/authentication.js";
import { getAll } from "./firebase/firestore.js";
import { createMapView } from "./map.js";
import { redirect } from "./utils.js";

window.addEventListener("load", function (event) {
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
  const currentUserRole = await getCurrentUserRole();

  // Wait for loadPartial to complete before loading the dashboard.
  await loadPartial(`dashboard/_${currentUserRole}Dashboard`, "dashboard-content");

  // Load the dashboard based on the user's role
  if (currentUserRole === "volunteer") loadVolunteersDashboard();

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.innerText = "Dashboard";
}

/**
 * Load the dashboard for volunteers
 */
function loadVolunteersDashboard() {
  // Retrieve all tasks from the database
  populateTaskList();

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
async function populateTaskList() {
  try {
    let allTasks = await getAll("tasks");
    // Create map view
    createMapView(allTasks);
    // Create card view
    createListView(allTasks);
  } catch (error) {
    console.log(error);
  }
}

function createListView(allTasks) {
  const listExplore = document.getElementById("taskListExplore");
  const listMyFavor = document.getElementById("taskListMyFavor");
  const listHistory = document.getElementById("taskListHistory");
  let favorCount = 0;
  for (let task of allTasks) {
    let id = task[0];
    let taskDetails = task[1];

    const card = document.createElement("div");
    card.classList.add("taskCard");
    card.innerHTML = `
      <a href="/tasks/accept.html?taskid=${id}"></a>
      <h3 class="title">${taskDetails.name}</h3>
      <div class="statusColor"></div>
      <p class="date">May 28th, 10:00am</p>
      <p class="duration">Estimated Favor Length: <span class="bold">1hour</span></p>
      <div class="requester">
        <img class="photo" src="https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512">
        <div class="profile">
          <p class="name">${taskDetails.requester}</p>
          <p class="address">Marpole Vancouver, BC</p>
        </div>
      </div>
    `;

    if (["Waiting to be accepted"].includes(taskDetails.status)) listExplore.appendChild(card);
    else if (["On going"].includes(taskDetails.status)) {
      listMyFavor.appendChild(card);
      favorCount++;
    } else if (["Pending approval", "Completed", "Cancelled"].includes(taskDetails.status)) {
      listHistory.appendChild(card);
      if (taskDetails.status === "Pending approval") card.querySelector(".taskCard .statusColor").style.backgroundColor = "#ffcd29";
      else if (taskDetails.status === "Completed") card.querySelector(".taskCard .statusColor").style.backgroundColor = "#44c451";
      else if (taskDetails.status === "Cancelled") card.querySelector(".taskCard .statusColor").style.backgroundColor = "#f24822";
    }
  }
  // Update favor count on tabmenu
  console.log(favorCount);
  document.getElementById("favorCount").innerText = favorCount;
}

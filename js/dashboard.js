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
  await loadPartial(`dashboard/_${currentUserRole}Dashboard`, "dashboard-content");

  // Wait for loadPartial to complete before loading the dashboard.
  loadVolunteersDashboard();

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.innerText = "Dashboard";
}

/**
 * Load the dashboard for volunteers
 */
function loadVolunteersDashboard() {
  populateTaskList();

  const mapView = document.getElementById("mapView");
  const listView = document.getElementById("listView");
  const tabLinks = document.querySelectorAll(".tab4__link");
  const tabBodyItems = document.querySelectorAll(".tab4-body__item");

  console.log(mapView);
  console.log(listView);
  console.log(tabLinks);
  console.log(tabBodyItems);

  // For Volunteers' Role:
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

  // For Volunteers' Role:
  // Switch between map and list view (toggle hide class)
  if (mapView) {
    mapView.addEventListener(
      "change",
      (event) => {
        if (event.cancelable) event.preventDefault();
        document.getElementById("mapSection").classList.remove("hide");
        document.getElementById("listSection").classList.add("hide");
      },
      { passive: false }
    );
  }
  if (listView) {
    listView.addEventListener(
      "change",
      (event) => {
        if (event.cancelable) event.preventDefault();
        document.getElementById("mapSection").classList.add("hide");
        document.getElementById("listSection").classList.remove("hide");
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
    console.log(allTasks);

    // Create map view
    createMapView(allTasks);

    // Create card view
    const listSection = document.getElementById("listSection");
    for (let task of allTasks) {
      let id = task[0];
      let taskDetails = task[1];

      const card = document.createElement("div");
      card.classList.add("taskCard");
      card.innerHTML = `
        <h2>${taskDetails.name}</h2>
        <p>${taskDetails.status}</p>
        <p>${taskDetails.requester}</p>
        <button><a href="./task-detail.html">See more</button>
      `;
      listSection.appendChild(card);
    }
  } catch (error) {
    console.log(error);
  }
}

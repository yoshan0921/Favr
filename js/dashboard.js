import {
    loadPartial
} from "./common.js"
import {
    getCurrentUserRole
} from "./firebase/authentication.js";


/* -------------------------------------------------- */
/* On Load Event                                      */
/* -------------------------------------------------- */

window.addEventListener("load", function (event) {
  //Give "active" class to a tag under nav#sidebar based on the current html file name
  const filename = window.location.pathname.split("/").pop();
  if (filename === "index.html") {
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
 * rendered there
 * 
 */
async function runFunction() {
  let currentUserRole = await getCurrentUserRole();
  loadPartial(`dashboard/_${currentUserRole}Dashboard`,"dashboard-content");
      
  /* -------------------------------------------------- */
  /* Home Tab Menu                                      */
  /* -------------------------------------------------- */

  var tabLinks = document.querySelectorAll(".tab4__link");
  var tabBodyItems = document.querySelectorAll(".tab4-body__item");

  tabLinks.forEach(function (tabLink) {
    tabLink.addEventListener("click", function (e) {
      // Show and hide tabs
      tabLinks.forEach(function (link) {
        link.classList.remove("on");
      });
      e.currentTarget.classList.add("on");

      let num = e.currentTarget.getAttribute("data-tab-body");
      tabBodyItems.forEach(function (item) {
        item.classList.remove("on");
      });
      document.querySelector(".tab4-body__item--" + num).classList.add("on");
    });
  });

  // Switch between map and list view (toggle hide class)
  const mapView = document.getElementById("mapView");
  const listView = document.getElementById("listView");
  if(mapView)mapView.addEventListener(
    "change",
    (event) => {
      if (event.cancelable) event.preventDefault();
      document.getElementById("mapSection").classList.remove("hide");
      document.getElementById("listSection").classList.add("hide");
    },
    { passive: false }
  );
  if(listView)listView.addEventListener(
    "change",
    (event) => {
      if (event.cancelable) event.preventDefault();
      document.getElementById("mapSection").classList.add("hide");
      document.getElementById("listSection").classList.remove("hide");
    },
    { passive: false }
  );

  // Create Map with task makers
  // Note: Add lat and lng properties etc. in the future
  let tasks = {
    task1: {
      taskName: "Delivery Errand",
      status: "In progress",
      requester: "Yosuke",
    },
    task2: {
      taskName: "Homework Errand",
      status: "Open",
      requester: "Yosuke",
    },
    task3: {
      taskName: "Delivery Errand",
      status: "Open",
      requester: "Teru",
    },
  };
  //createMapView(tasks);

}
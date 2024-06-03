// import { checkUserAuthorization } from "../firebase/authentication.js";
// import { signOut } from "../utils.js";
// import { getAll, deleteDocument, updateDocument, createDocument } from "../firebase/firestore.js";
import { createMapView } from "../js/map.js";

// checkUserAuthorization();

/* -------------------------------------------------- */
/* Side Bar Menu                                      */
/* -------------------------------------------------- */

// Open and close sidebar
const check = document.getElementById("check");
if (check) {
  check.addEventListener("click", () => {
    if (check.checked) {
      localStorage.setItem("sidebar", "checked");
    } else {
      localStorage.removeItem("sidebar");
    }
  });
}

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
mapView.addEventListener(
  "change",
  (event) => {
    if (event.cancelable) event.preventDefault();
    document.getElementById("mapSection").classList.remove("hide");
    document.getElementById("listSection").classList.add("hide");
  },
  { passive: false }
);
listView.addEventListener(
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
createMapView(tasks);

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

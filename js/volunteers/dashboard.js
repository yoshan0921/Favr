// import { checkUserAuthorization } from "../firebase/authentication.js";
// import { getAll, deleteDocument, updateDocument, createDocument } from "../firebase/firestore.js";
// import { createMapView } from "../map.js";

// let currentUserID = getCurrentUserID();
// checkUserAuthorization();

// const listSection = document.getElementById("listSection");

// populateTaskList();

// /**
//  * Fetches data from the "Tasks" collection of Firestoer Database
//  * and displays on a table
//  */
// async function populateTaskList() {
//   try {
//     let allTasks = await getAll("tasks");
//     console.log(allTasks);

//     // Create map view
//     createMapView(allTasks);

//     // Create card view
//     for (let task of allTasks) {
//       let id = task[0];
//       let taskDetails = task[1];

//       const card = document.createElement("div");
//       card.classList.add("taskCard");
//       card.innerHTML = `
//         <h2>${taskDetails.name}</h2>
//         <p>${taskDetails.status}</p>
//         <p>${taskDetails.requester}</p>
//         <button><a href="./task-detail.html">See more</button>
//       `;
//       listSection.appendChild(card);
//     }
//   } catch (error) {
//     console.log(error);
//     alert(error);
//   }
// }

// /**
//  * Tab menu in home page
//  */
// var tabLinks = document.querySelectorAll(".tab4__link");
// var tabBodyItems = document.querySelectorAll(".tab4-body__item");

// tabLinks.forEach(function (tabLink) {
//   tabLink.addEventListener("click", function (e) {
//     // Show and hide tabs
//     tabLinks.forEach(function (link) {
//       link.classList.remove("on");
//     });
//     e.currentTarget.classList.add("on");

//     let num = e.currentTarget.getAttribute("data-tab-body");
//     tabBodyItems.forEach(function (item) {
//       item.classList.remove("on");
//     });
//     document.querySelector(".tab4-body__item--" + num).classList.add("on");
//   });
// });

// // Switch between map and list view (toggle hide class)
// const mapView = document.getElementById("mapView");
// const listView = document.getElementById("listView");
// mapView.addEventListener(
//   "change",
//   (event) => {
//     if (event.cancelable) event.preventDefault();
//     document.getElementById("mapSection").classList.remove("hide");
//     document.getElementById("listSection").classList.add("hide");
//   },
//   { passive: false }
// );
// listView.addEventListener(
//   "change",
//   (event) => {
//     if (event.cancelable) event.preventDefault();
//     document.getElementById("mapSection").classList.add("hide");
//     document.getElementById("listSection").classList.remove("hide");
//   },
//   { passive: false }
// );

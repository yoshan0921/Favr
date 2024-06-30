import { firestore } from "./firebase/firebase.js";
import { onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadPartial, showTabmenu, lazyLoadImages, openModal, closeModal } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAllWithFilter, getDocument } from "./firebase/firestore.js";
import { redirect } from "./utils.js";

// TODO: Need to define placeholder image properly
const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let currentUserID;
let favorCountPending = 0;
let favorCountCompleted = 0;
let favorCountCancelled = 0;

window.addEventListener("load", function (event) {
  // Check if the user is logged in
  monitorAuthenticationState();
});

/**
 * Memo:
 * runFunction(); should be called when DOMContentLoaded event is triggered
 * However, there is a case DOMContentLoaded is not triggered.
 * That is why we need to check the readyState of the document.
 */
if (document.readyState === "loading") {
  //console.log("readyState = " + document.readyState);
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  //console.log("readyState = " + document.readyState);
  runFunction();
}

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there.
 */
async function runFunction() {
  // Get Login user information
  currentUserID = getCurrentUserID();
  getCurrentUserRole().then(async (currentUserRole) => {
    console.log("Current User ID: " + currentUserID);
    console.log("Current User Role: " + currentUserRole);

    // Load dashboard partil html
    await loadPartial(`history/_${currentUserRole}History`, "history-content");
    // Load the dashboard based on the user's role
    if (currentUserRole === "volunteer") {
      await loadVolunteersHistory();
    } else if (currentUserRole === "elder") {
      await loadEldersHistory();
    }
  });
}

// ============================================================
// Load the history for Elders
// ============================================================

/**
 * Loads the elder's history.
 * This includes retrieving tasks from the database, setting up the view switcher for map and list views,
 * setting up the filter button and modal, and setting up the tab menu.
 */
async function loadEldersHistory() {
  // Tab menu
  showTabmenu();
  // Link to each tasb in the dashboard
  let hash = window.location.hash;
  if (hash === "#completed") {
    document.getElementById("tab1").click();
  } else if (hash === "#cancelled") {
    document.getElementById("tab2").click();
  }

  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  displayTaskListForElders().then(() => {
    main.classList.add("loaded");
  });
}

/**
 * Retrieves all tasks from the Firestore and populates the task list for volunteers.
 * Also creates a list view (including map view) for the tasks.
 *
 * TODO: Not all data should be retrieved here, but the target of retrieval should be narrowed down with a where clause.
 */
async function displayTaskListForElders() {
  // Get DB reference
  const dbref = collection(firestore, "tasks");
  // Define the filter condition for the query
  const q = query(dbref, where("status", "in", [STATUS_COMPLETED, STATUS_CANCELLED]), where("requesterID", "==", currentUserID));
  // Array for storing all tasks
  let allTasks = [];

  // Listen for real-time updates with onSnapshot
  const unsubscribe = onSnapshot(
    q,
    async (querySnapshot) => {
      try {
        // Monitor the tasks registration in real-time
        querySnapshot.docChanges().forEach((change) => {
          const task = {
            id: change.doc.id,
            data: change.doc.data(),
          };

          if (change.type === "added") {
            allTasks.push(task);
          } else if (change.type === "modified") {
            allTasks = allTasks.map((t) => (t.id === task.id ? task : t));
          } else if (change.type === "removed") {
            console.log("Removed task: ", task.id, " => ", task.data);
            allTasks = allTasks.filter((t) => t.id !== task.id);
          }
        });
        console.log(allTasks);
        await createTaskListForElders(allTasks);
      } catch (error) {
        console.error(error);
      }
    },
    (error) => {
      console.error(error);
    }
  );
  // TODO:
  // Consider calling unsubscribe() when appropriate to stop listening for updates
}

/**
 * Displays a list of tasks in card format.
 * Tasks with a status of "waiting to be accepted" are also displayed on the map.
 *
 * @param {Array} allTasks - An array of all tasks.
 */
async function createTaskListForElders(allTasks) {
  const tasksPromises = allTasks.map(async (task) => {
    let id = task.id; // Task ID
    let taskDetails = task.data; // Task detail data

    // Get requester's information
    return Promise.all([getDocument("users", taskDetails.requesterID), getDocument("users", taskDetails.volunteerID)])
      .then(async ([requester, volunteer]) => {
        // Check if the requester of the task is the current user
        if (taskDetails.requesterID !== currentUserID) return;

        // Create task object for List & Map view
        let taskObj = {
          // Task Information
          taskID: id,
          taskName: taskDetails.name ?? "",
          taskStatus: taskDetails.status ?? "",
          taskDate: taskDetails.details["date"] ?? "",
          taskTime: taskDetails.details["time"] ?? "",
          taskNotes: taskDetails.notes ?? "",
          taskAddress: taskDetails.details["startAddress"] ?? "",
          taskEndAddress: taskDetails.details["endAddress"] ?? "",
          taskLinkURL: "/tasks/elder-favor.html",
          // Volunteer Information
          taskVolunteerID: taskDetails.volunteerID ?? "",
          taskVolunteerName: volunteer?.firstName && volunteer?.lastName ? `${volunteer.firstName} ${volunteer.lastName}` : "",
          taskVolunteerInstitution: volunteer?.institution ?? "",
          taskVolunteerPhoto: volunteer?.profilePictureURL ?? "", // For Performance Improvement
          // Elder Information
          taskRequesterName: `${requester.firstName} ${requester.lastName}` ?? "",
          taskRequesterAddress: requester.address ?? "",
        };

        // Display task information on the list and map
        createCardForElder(taskObj);
      })
      .catch((error) => {
        console.log(error);
      });
  });

  // Wait for all tasks to be processed
  await Promise.all(tasksPromises);

  // Sort the task cards by date (newest to oldest)
  sortTasksByDate("newest", document.querySelectorAll("#listCompleted .taskCard"), document.getElementById("listCompleted"));
  sortTasksByDate("newest", document.querySelectorAll("#listCancelled .taskCard"), document.getElementById("listCancelled"));

  // No items message
  if (document.querySelectorAll("#taskListCompleted .taskCard").length === 0) {
    document.querySelector("#taskListCompleted + .noItemsMessage").classList.remove("noResult");
  }
  if (document.querySelectorAll("#taskListCancelled .taskCard").length === 0) {
    document.querySelector("#taskListCancelled + .noItemsMessage").classList.remove("noResult");
  }

  // Apply lazy loading to images
  lazyLoadImages();
}

/**
 * Creates a task card and appends it to the appropriate list based on the task status.
 *
 * @param {Object} task - The task object containing details about the task.
 */
function createCardForElder(task) {
  const listCompleted = document.getElementById("taskListCompleted");
  const listCancelled = document.getElementById("taskListCancelled");
  const listMyFavorCountCompleted = document.getElementById("favorCountCompleted");
  const listMyFavorCountCancelled = document.getElementById("favorCountCancelled");

  const card = document.createElement("div");
  card.classList.add("taskCard");
  card.setAttribute("data-taskid", task.taskID);
  card.setAttribute("data-favorType", task.taskName);
  card.setAttribute("data-date", task.taskDate);
  card.setAttribute("data-address", task.taskAddress);
  card.innerHTML = `
  <a href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
  <h3 class="title">${task.taskName}</h3>
  <p class="notes">${task.taskNotes}</p>
  `;
  if (task.taskStatus != "Waiting to be accepted") {
    card.innerHTML += `
    <div class="requester">
    <img class="photo" src="${placeholderImage}" data-storage-path="profile/${task.taskVolunteerPhoto}">
      <div class="profile">
        <p class="name">${task.taskVolunteerName}</p>
        <p class="address">${task.taskVolunteerInstitution}</p>
      </div>
    </div>
    `;
  }

  // Append card to the correct list based on the task status
  if ([STATUS_COMPLETED].includes(task.taskStatus)) {
    listCompleted.appendChild(card);
    listMyFavorCountCompleted.textContent = ++favorCountCompleted;
  } else if ([STATUS_CANCELLED].includes(task.taskStatus)) {
    listCancelled.appendChild(card);
    listMyFavorCountCancelled.textContent = ++favorCountCancelled;
  }
}

// ============================================================
// Load the history for Volunteers
// ============================================================

/**
 * Loads the volunteer's history.
 * This includes retrieving tasks from the database, setting up the view switcher for map and list views,
 * setting up the filter button and modal, and setting up the tab menu.
 */
async function loadVolunteersHistory() {
  // Tab menu
  showTabmenu();
  // Link to each tasb in the dashboard
  let hash = window.location.hash;
  if (hash === "#pending") {
    document.getElementById("tab1").click();
  } else if (hash === "#completed") {
    document.getElementById("tab2").click();
  } else if (hash === "#cancelled") {
    document.getElementById("tab3").click();
  }

  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  await displayTaskListForVolunteers();
  main.classList.add("loaded");

  // Date range picker
  setupDateRangePicker();
}

/**
 * Retrieves all tasks from the Firestore and populates the task list for volunteers.
 * Also creates a list view (including map view) for the tasks.
 *
 * TODO: Not all data should be retrieved here, but the target of retrieval should be narrowed down with a where clause.
 */
async function displayTaskListForVolunteers() {
  // Get DB reference
  const dbref = collection(firestore, "tasks");
  // Define the filter condition for the query
  const q = query(dbref, where("status", "in", [STATUS_PENDING, STATUS_COMPLETED, STATUS_CANCELLED]), where("volunteerID", "==", currentUserID));
  // Array for storing all tasks
  let allTasks = [];

  // Listen for real-time updates with onSnapshot
  const unsubscribe = onSnapshot(
    q,
    async (querySnapshot) => {
      try {
        // Monitor the tasks registration in real-time
        querySnapshot.docChanges().forEach((change) => {
          const task = {
            id: change.doc.id,
            data: change.doc.data(),
          };

          if (change.type === "added") {
            allTasks.push(task);
          } else if (change.type === "modified") {
            allTasks = allTasks.map((t) => (t.id === task.id ? task : t));
          } else if (change.type === "removed") {
            console.log("Removed task: ", task.id, " => ", task.data);
            allTasks = allTasks.filter((t) => t.id !== task.id);
          }
        });
        console.log(allTasks);
        await createTaskListForVolunteers(allTasks);
      } catch (error) {
        console.error(error);
      }
    },
    (error) => {
      console.error(error);
    }
  );
  // TODO:
  // Consider calling unsubscribe() when appropriate to stop listening for updates
}

/**
 * Displays a list of tasks in card format.
 * Tasks with a status of "waiting to be accepted" are also displayed on the map.
 *
 * @param {Array} allTasks - An array of all tasks.
 */
async function createTaskListForVolunteers(allTasks) {
  // Clear the task list
  const taskListPending = document.getElementById("taskListPending");
  const taskListCompleted = document.getElementById("taskListCompleted");
  const taskListCancelled = document.getElementById("taskListCancelled");
  taskListPending.innerHTML = "";
  taskListCompleted.innerHTML = "";
  taskListCancelled.innerHTML = "";
  const listMyFavorCountPending = document.getElementById("favorCountPending");
  const listMyFavorCountCompleted = document.getElementById("favorCountCompleted");
  const listMyFavorCountCancelled = document.getElementById("favorCountCancelled");
  listMyFavorCountPending.textContent = 0;
  listMyFavorCountCompleted.textContent = 0;
  listMyFavorCountCancelled.textContent = 0;
  favorCountPending = 0;
  favorCountCompleted = 0;
  favorCountCancelled = 0;

  const tasksPromises = allTasks.map(async (task) => {
    // for (let task of allTasks) {
    let id = task.id; // Task ID
    let taskDetails = task.data; // Task detail data

    // Get requester's information
    return Promise.all([getDocument("users", taskDetails.requesterID), getDocument("users", taskDetails.volunteerID)])
      .then(async ([requester, volunteer]) => {
        // Check if the volunteer of the task is the current user
        if (taskDetails.volunteerID !== currentUserID) return;

        // Estimate favor length
        // TODO: The following code is only for tentative until the favor length value is revised.
        let length = 1.0;

        // Create task object for List & Map view
        let taskObj = {
          // Task Information
          taskID: id,
          taskName: taskDetails.name ?? "",
          taskStatus: taskDetails.status ?? "",
          // taskDate: taskDetails.details["date"] ?? "",
          taskDate: new Date(taskDetails.details["date"]).toLocaleDateString("en-us", { day: "numeric", month: "short", year: "numeric" }) ?? "",
          taskTime: taskDetails.details["time"] ?? "",
          taskDuration: length,
          taskNotes: taskDetails.notes ?? "",
          taskAddress: taskDetails.details["startAddress"] ?? "",
          taskEndAddress: taskDetails.details["endAddress"] ?? "",
          taskLinkURL: "/tasks/volunteer-favor.html",
          // Volunteer Information
          taskVolunteerID: taskDetails.volunteerID ?? "",
          taskVolunteerName: `${volunteer.firstName} ${volunteer.lastName}` ?? "",
          taskVolunteerInstitution: volunteer.institution ?? "",
          // Elder Information
          taskRequesterName: `${requester.firstName} ${requester.lastName}` ?? "",
          taskRequesterAddress: requester.address ?? "",
          taskRequesterPhoto: `${requester.profilePictureURL}` ?? "", // For Performance Improvement
        };

        // Display task information on the list and map
        createCardForVolunteers(taskObj);
      })
      .catch((error) => {
        console.log(error);
      });
  });

  // Wait for all tasks to be processed
  await Promise.all(tasksPromises);

  // Sort the task cards by date (newest to oldest)
  sortTasksByDate("newest", document.querySelectorAll("#taskListPending .taskCard"), taskListPending);
  sortTasksByDate("newest", document.querySelectorAll("#taskListCompleted .taskCard"), taskListCompleted);
  sortTasksByDate("newest", document.querySelectorAll("#taskListCancelled .taskCard"), taskListCancelled);

  // No items message
  if (document.querySelectorAll("#taskListPending .taskCard").length === 0) {
    document.querySelector("#taskListPending + .noItemsMessage").classList.remove("noResult");
  }
  if (document.querySelectorAll("#taskListCompleted .taskCard").length === 0) {
    document.querySelector("#taskListCompleted + .noItemsMessage").classList.remove("noResult");
  }
  if (document.querySelectorAll("#taskListCancelled .taskCard").length === 0) {
    document.querySelector("#taskListCancelled + .noItemsMessage").classList.remove("noResult");
  }

  // Apply lazy loading to images
  lazyLoadImages();
}

/**
 * Creates a task card and appends it to the appropriate list based on the task status.
 *
 * @param {Object} task - The task object containing details about the task.
 */
function createCardForVolunteers(task) {
  const listPending = document.getElementById("taskListPending");
  const listCompleted = document.getElementById("taskListCompleted");
  const listCancelled = document.getElementById("taskListCancelled");
  const listMyFavorCountPending = document.getElementById("favorCountPending");
  const listMyFavorCountCompleted = document.getElementById("favorCountCompleted");
  const listMyFavorCountCancelled = document.getElementById("favorCountCancelled");

  const card = document.createElement("div");
  card.classList.add("taskCard");
  card.setAttribute("data-taskid", task.taskID);
  card.setAttribute("data-favorType", task.taskName);
  card.setAttribute("data-date", task.taskDate);
  card.setAttribute("data-address", task.taskAddress);
  card.setAttribute("data-distance", task.taskDistance);
  card.setAttribute("data-length", task.taskDuration);
  card.innerHTML = `
  <a href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
  <h3 class="title">${task.taskName}</h3>
  <div class="statusColor"></div>
  <p class="date">${task.taskDate}, ${task.taskTime}</p>
  <p class="duration">Estimated Favor Length: <span class="bold">${task.taskDuration} hours</span></p>
  <div class="requester">
    <img class="photo" src="${placeholderImage}" data-storage-path="profile/${task.taskRequesterPhoto}">
    <div class="profile">
      <p class="name">${task.taskRequesterName}</p>
      <p class="address">${task.taskRequesterAddress}</p>
    </div>
  </div>
  `;

  // Append card to the correct list based on the task status
  if ([STATUS_PENDING].includes(task.taskStatus)) {
    listPending.appendChild(card);
    listMyFavorCountPending.textContent = ++favorCountPending;
  } else if ([STATUS_COMPLETED].includes(task.taskStatus)) {
    listCompleted.appendChild(card);
    listMyFavorCountCompleted.textContent = ++favorCountCompleted;
  } else if ([STATUS_CANCELLED].includes(task.taskStatus)) {
    listCancelled.appendChild(card);
    listMyFavorCountCancelled.textContent = ++favorCountCancelled;
  }
}

/**
 * Initializes the date range picker and sets up event listeners for modal interactions.
 */
function setupDateRangePicker() {
  const filterModal = document.getElementById("filterModal");

  let pickers = $(".openDateRangeModal").daterangepicker({
    locale: {
      cancelLabel: "Clear",
    },
  });

  document.querySelectorAll(".openDateRangeModal").forEach((element) => {
    element.addEventListener("click", function (event) {
      openModal(filterModal);
    });
  });

  document.querySelectorAll(".daterangepicker .applyBtn").forEach((element, index) => {
    element.addEventListener("click", function () {
      let targetTab;
      let dateRanges = document.querySelectorAll(".drp-selected");
      let [startDate, endDate] = dateRanges[index].textContent.split(" - ");

      if (index === 0) targetTab = document.getElementById("taskListPending");
      else if (index === 1) targetTab = document.getElementById("taskListCompleted");
      else if (index === 2) targetTab = document.getElementById("taskListCancelled");
      applyDateRangeFilter(startDate, endDate, targetTab);
      closeModal(filterModal);
    });
  });

  document.querySelectorAll(".daterangepicker .cancelBtn").forEach((element, index) => {
    element.addEventListener("click", function () {
      let targetTab;
      if (index === 0) targetTab = document.getElementById("taskListPending");
      else if (index === 1) targetTab = document.getElementById("taskListCompleted");
      else if (index === 2) targetTab = document.getElementById("taskListCancelled");

      clearDateRangeFilter(targetTab);
      clearDateRangePicker(index);
      closeModal(filterModal);
    });
  });

  function applyDateRangeFilter(start, end, targetTab) {
    try {
      const cards = targetTab.querySelectorAll(".taskCard");
      const startDate = new Date(start);
      const endDate = new Date(end);

      cards.forEach((card) => {
        const date = new Date(card.getAttribute("data-date"));
        card.classList.toggle("hide", !(date >= startDate && date <= endDate));
      });
    } catch (error) {
      console.error(error);
    }
  }

  function clearDateRangeFilter(targetTab) {
    try {
      const cards = targetTab.querySelectorAll(".taskCard");

      cards.forEach((card) => {
        card.classList.remove("hide");
      });
    } catch (error) {
      console.error(error);
    }
  }

  function clearDateRangePicker(index) {
    // To be implemented
  }
}

// TODO: Move this function to a common file
// ============================================================
// Utility Functions
// ============================================================

/**
 * Sorts the given task cards based on the provided date filter value.
 *
 * @param {string} dateFilterValue - The value of the date filter. It can be 'newest' or 'oldest'.
 * @param {NodeList} taskCards - The task cards to be sorted. Each task card is a DOM node.
 *
 * The function first converts the NodeList of task cards into an array. It then sorts the array based on the date attribute of each task card.
 * If the date filter value is 'newest', the task cards are sorted from newest to oldest.
 * If the date filter value is 'oldest', the task cards are sorted from oldest to newest.
 * After sorting, the function replaces the old NodeList in the DOM with the sorted array of task cards.
 */
function sortTasksByDate(dateFilterValue, taskCards, target) {
  // Convert NodeList to Array
  let taskCardsArray = Array.from(taskCards);

  // Sort the array based on the date
  taskCardsArray.sort((a, b) => {
    let dateA = new Date(a.getAttribute("data-date"));
    let dateB = new Date(b.getAttribute("data-date"));

    // For newest to oldest
    if (dateFilterValue === "newest") {
      return dateB - dateA;
    }

    // For oldest to newest
    if (dateFilterValue === "oldest") {
      return dateA - dateB;
    }

    return 0; // If no sorting is needed
  });

  // Replace the old NodeList with the sorted array
  // let taskListExplore = document.querySelector("#taskListExplore");
  taskCardsArray.forEach((card) => {
    target.appendChild(card);
  });
}

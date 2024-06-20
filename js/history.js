import { closeModal, loadPartial, openModal, showTabmenu, lazyLoadImages } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAll, getDocument } from "./firebase/firestore.js";
import { redirect } from "./utils.js";

// TODO: Need to define placeholder image properly
const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let currentUserID;

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

    // Link to each tasb in the dashboard
    let hash = window.location.hash;
    if (hash === "#completed") {
      tab1.click();
    } else if (hash === "#cancelled") {
      tab2.click();
    }
  });
}

// ============================================================
// Load the history for Elders
// ============================================================

/**
 * Loads the volunteer's dashboard.
 * This includes retrieving tasks from the database, setting up the view switcher for map and list views,
 * setting up the filter button and modal, and setting up the tab menu.
 */
async function loadEldersHistory() {
  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  displayTaskListForElders().then(() => {
    //loadingScreen.style.display = "none";
    main.classList.add("loaded");
  });

  // View switcher radio buttons
  const taskViewSwitch = document.getElementById("taskViewSwitch");

  //Filter button (Explore tab)
  const filterBtn = document.getElementById("openFilterBtn");
  const filterModal = document.getElementById("filterModal");
  const closeFilterBtn = document.getElementById("cancelFilter");
  const applyFilterBtn = document.getElementById("applyFilter");
  const cancelFilterBtn = document.getElementById("cancelFilter");
  //Filter button (History tab)
  const toggleCancelledCheckbox = document.getElementById("toggleCancelledCheckbox");
  const togglePendingCheckbox = document.getElementById("togglePendingCheckbox");
  const toggleCompletedCheckbox = document.getElementById("toggleCompletedCheckbox");

  // Tab menu
  showTabmenu();

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

  // Filter modal on the Explore tab
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      openModal(filterModal);
      readPreference();
    });
  }
  if (closeFilterBtn) {
    closeFilterBtn.addEventListener("click", () => {
      closeModal(filterModal);
    });
  }
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener("click", () => {
      applyFilter();
      closeModal(filterModal);
    });
  }
  if (cancelFilterBtn) {
    cancelFilterBtn.addEventListener("click", () => {
      console.log("Cancel Filter");
      closeModal(filterModal);
    });
  }

  // Status filter checkboxes on the History tab
  if (toggleCancelledCheckbox) {
    toggleCancelledCheckbox.addEventListener("change", () => {
      const cards = document.querySelectorAll("#taskListHistory .taskCard");
      cards.forEach((card) => {
        if (card.getAttribute("data-status") === "Cancelled") {
          card.style.display = toggleCancelledCheckbox.checked ? "block" : "none";
        }
      });
    });
  }
  if (togglePendingCheckbox) {
    togglePendingCheckbox.addEventListener("change", () => {
      const cards = document.querySelectorAll("#taskListHistory .taskCard");
      cards.forEach((card) => {
        if (card.getAttribute("data-status") === "Pending approval") {
          card.style.display = togglePendingCheckbox.checked ? "block" : "none";
        }
      });
    });
  }
  if (toggleCompletedCheckbox) {
    toggleCompletedCheckbox.addEventListener("change", () => {
      const cards = document.querySelectorAll("#taskListHistory .taskCard");
      cards.forEach((card) => {
        if (card.getAttribute("data-status") === "Completed") {
          card.style.display = toggleCompletedCheckbox.checked ? "block" : "none";
        }
      });
    });
  }
}

/**
 * Retrieves all tasks from the Firestore and populates the task list for volunteers.
 * Also creates a list view (including map view) for the tasks.
 *
 * TODO: Not all data should be retrieved here, but the target of retrieval should be narrowed down with a where clause.
 */
async function displayTaskListForElders() {
  return new Promise(async (resolve, reject) => {
    try {
      // Retrieve tasks from the Firestore
      let allTasks = await getAll("tasks");

      // Create List View (including Map View)
      createTaskListForElders(allTasks)
        .then(() => resolve())
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

/**
 * Displays a list of tasks in card format.
 * Tasks with a status of "waiting to be accepted" are also displayed on the map.
 *
 * @param {Array} allTasks - An array of all tasks.
 */
async function createTaskListForElders(allTasks) {
  const tasksPromises = allTasks.map(async (task) => {
    // for (let task of allTasks) {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data
    let linkURL = "#"; // Link URL for the task card

    // Get requester's information
    return Promise.all([getDocument("users", taskDetails.requesterID), getDocument("users", taskDetails.volunteerID)])
      .then(async ([requester, volunteer]) => {
        // Check if the requester of the task is the current user
        if (taskDetails.requesterID !== currentUserID) return;

        // Set the link URL for the task card
        if (taskDetails.status === "Completed") {
          linkURL = "/tasks/completedHistory.html";
        } else if (taskDetails.status === "Cancelled") {
          linkURL = "/tasks/cancelledHistory.html";
        } else {
          linkURL = "#";
        }

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
          taskLinkURL: linkURL,
          // Volunteer Information
          taskVolunteerID: taskDetails.volunteerID ?? "",
          taskVolunteerName: `${volunteer.firstName} ${volunteer.lastName}` ?? "",
          taskVolunteerInstitution: volunteer.institution ?? "",
          taskVolunteerPhoto: `${volunteer.profilePictureURL}` ?? "", // For Performance Improvement
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
  if (["Completed"].includes(task.taskStatus)) {
    listCompleted.appendChild(card);
  } else if (["Cancelled"].includes(task.taskStatus)) {
    listCancelled.appendChild(card);
  }
}

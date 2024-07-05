import { firestore } from "./firebase/firebase.js";
import { onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { closeModal, loadPartial, openModal, showTabmenu, lazyLoadImages } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getDocument, getFile } from "./firebase/firestore.js";
import { redirect } from "./utils.js";

const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const { Map } = await google.maps.importLibrary("maps");
const { spherical } = await google.maps.importLibrary("geometry");

// TODO: Need to define placeholder image properly
const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let currentUserID;
let favorCount = 0;
let filterAppliedFlg = false;
let position;
let map; // For Google Map
let markers = {}; // For Google Map
let infoWindows = []; // For Google Map

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
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
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
    await loadPartial(`dashboard/_${currentUserRole}Dashboard`, "dashboard-content");
    // Load the dashboard based on the user's role
    if (currentUserRole === "volunteer") {
      await loadVolunteersDashboard();
    } else if (currentUserRole === "elder") {
      await loadEldersDashboard();
    }
  });
}

// ============================================================
// Load the dashboard for Elders
// ============================================================

/**
 * Loads the elder's dashboard.
 * This includes retrieving tasks from the database and displaying them in a task list.
 */
async function loadEldersDashboard() {
  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  displayTaskListForElders().then(() => {
    console.log("Tasks loaded successfully.");
    main.classList.add("loaded");
  });
}

/**
 * Retrieves all tasks from the Firestore and displays them in a task list for elders.
 * Also creates a card view for the tasks.
 */
async function displayTaskListForElders() {
  // Get DB reference
  const dbref = collection(firestore, "tasks");
  // Define the filter condition for the query
  const q = query(dbref, where("status", "in", [STATUS_ONGOING, STATUS_WAITING, STATUS_PENDING]), where("requesterID", "==", currentUserID));
  // Array for storing all tasks
  let allTasks = [];

  // Listen for real-time updates with onSnapshot
  const unsubscribe = onSnapshot(
    q,
    async (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        const task = {
          id: change.doc.id,
          data: change.doc.data(),
        };

        if (change.type === "added") {
          // Add the task to the allTasks array
          allTasks.push(task);
        }
        if (change.type === "modified") {
          // Replace the task in the allTasks array with the updated task
          allTasks = allTasks.map((t) => (t.id === task.id ? task : t));
        }
        if (change.type === "removed") {
          console.log("Removed task: ", task.id, " => ", task.data);
          // Delete the task in the allTasks array if it was removed
          allTasks = allTasks.filter((t) => t.id !== task.id);
        }
      });
      console.log(allTasks);
      await createTaskListForElders(allTasks);
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
 *
 * @param {Array} allTasks - An array of all tasks.
 */
async function createTaskListForElders(allTasks) {
  // Clear the task list
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  const tasksPromises = allTasks.map(async (task) => {
    let id = task.id; // Task ID
    let taskDetails = task.data; // Task detail data

    // Ifvolunteer ID = "", set null instead of ""
    if (taskDetails.volunteerID === "") {
      taskDetails.volunteerID = null;
    }

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
          taskRequesterName: requester.firstName && requester.lastName ? `${requester.firstName} ${requester.lastName}` : "",
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

  // No items message
  if (document.querySelectorAll("#taskList .taskCard").length === 0) {
    document.querySelector("#taskList ~ .noItemsMessage").classList.remove("noResult");
  }

  // Apply lazy loading to images
  lazyLoadImages();

  // Sort the task cards by date (newest to oldest)
  sortTasksByDate("newest", document.querySelectorAll("#taskList .taskCard"), document.getElementById("taskList"));
}

/**
 * Creates a task card and appends it to the appropriate list based on the task status.
 *
 * @param {Object} task - The task object containing details about the task.
 */
function createCardForElder(task) {
  const list = document.getElementById("taskList");

  const card = document.createElement("div");
  card.classList.add("taskCard");
  card.setAttribute("data-taskid", task.taskID);
  card.setAttribute("data-favorType", task.taskName);
  card.setAttribute("data-date", `${task.taskDate} ${task.taskTime}`);
  card.setAttribute("data-address", task.taskAddress);
  card.innerHTML = `
  <a class="linkURL" href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
  <h3 class="title">${task.taskName}</h3>
  <p class="status"><span class="statusColor"></span>${task.taskStatus}</p>
  <p class="notes">${task.taskNotes}</p>
  `;
  if (task.taskStatus != STATUS_WAITING) {
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
  if ([STATUS_WAITING].includes(task.taskStatus)) {
    card.querySelector(".taskCard .statusColor").classList.add("statusWaiting");
  } else if ([STATUS_ONGOING].includes(task.taskStatus)) {
    card.querySelector(".taskCard .statusColor").classList.add("statusOngoing");
  } else if ([STATUS_PENDING].includes(task.taskStatus)) {
    card.querySelector(".taskCard .statusColor").classList.add("statusPending");
  } else {
    card.querySelector(".taskCard .statusColor").classList.add("statusOthers");
  }
  list.appendChild(card);
}

// ============================================================
// Load the dashboard for Volunteers
// ============================================================

/**
 * Loads the volunteer's dashboard.
 * This includes retrieving tasks from the database, setting up the view switcher for map and list views,
 * setting up the filter button and modal, and setting up the tab menu.
 */
async function loadVolunteersDashboard() {
  // Tab menu
  showTabmenu();
  // Link to each tasb in the dashboard
  let hash = window.location.hash;
  if (hash === "#explore") {
    document.getElementById("tab1").click();
  } else if (hash === "#myfavors") {
    document.getElementById("tab2").click();
  }

  // Get current location (If it's not first time in the session, get the location from sessionStorage)
  position = sessionStorage.getItem("currentPosition");
  if (!position) {
    let geoPosition = await getCurrentPosition();
    position = {
      latitude: geoPosition.coords.latitude,
      longitude: geoPosition.coords.longitude,
    };
    // Store the position as a string
    sessionStorage.setItem("currentPosition", JSON.stringify(position));
  } else {
    // Parse the position back into an object
    position = JSON.parse(position);
  }

  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  displayTaskListForVolunteers().then(() => {
    console.log("Tasks loaded successfully.");
    main.classList.add("loaded");
  });

  // View switcher radio buttons
  const taskViewSwitch = document.getElementById("taskViewSwitch");

  // Filter button (Explore tab)
  const filterBtn = document.getElementById("openFilterBtn");
  const filterModal = document.getElementById("filterModal");
  const applyFilterBtn = document.getElementById("applyFilter");
  const resetFilterBtn = document.getElementById("resetFilter");

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
    });
  }
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener("click", () => {
      applyFilter();
      closeModal(filterModal);
    });
  }
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", () => {
      // Reset the filter conditions and apply filter
      applyFilter(true);
      closeModal(filterModal);
    });
  }
}

/**
 * Retrieves all tasks from the Firestore and populates the task list for volunteers.
 * Also creates a list view (including map view) for the tasks.
 *
 */
async function displayTaskListForVolunteers() {
  // Get DB reference
  const dbref = collection(firestore, "tasks");
  // Define the filter condition for the query
  const q = query(dbref, where("status", "in", [STATUS_ONGOING, STATUS_WAITING]));
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
            // Add the task to the allTasks array
            allTasks.push(task);
          } else if (change.type === "modified") {
            // Replace the task in the allTasks array with the updated task
            allTasks = allTasks.map((t) => (t.id === task.id ? task : t));
          } else if (change.type === "removed") {
            console.log("Removed task: ", task.id, " => ", task.data);
            // Delete the task in the allTasks array if it was removed
            allTasks = allTasks.filter((t) => t.id !== task.id);
          }
        });
        console.log(allTasks);
        await createTaskListForVolunteers(allTasks);
      } catch (error) {
        console.error(error);
      }

      // If additional tasks are added, apply the filter again
      if (filterAppliedFlg) {
        applyFilter();
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
  const taskListExplore = document.getElementById("taskListExplore");
  const taskListMyFavor = document.getElementById("taskListMyFavor");
  taskListExplore.innerHTML = "";
  taskListMyFavor.innerHTML = "";
  favorCount = 0;

  // Clear the task map
  const mapElement = document.getElementById("map");
  markers = [];
  let latitude;
  let longitude;

  try {
    latitude = position.latitude;
    longitude = position.longitude;

    // Create Map
    if (!map) {
      map = new Map(mapElement, {
        zoom: 14,
        center: { lat: latitude, lng: longitude },
        mapId: "DEMO_MAP_ID",
      });
    }

    // Close all info windows when the map is clicked
    map.addListener("click", function () {
      closeAllInfoWindows(infoWindows);
    });

    // Customize the marker style for the current location
    const you = document.createElement("div");
    you.classList.add("you");
    you.textContent = "You";

    // Add a marker for the current location
    new AdvancedMarkerElement({
      map: map,
      position: { lat: latitude, lng: longitude },
      content: you,
    });
  } catch (error) {
    console.log(error);
  }

  let tasksPromises = allTasks.map((task) => {
    return new Promise(async (resolve) => {
      let id = task.id; // Task ID
      let taskDetails = task.data; // Task detail data
      let markerLatLng = {}; // Task location (Marker position)
      let distance = 0; // Distance between the current location and the task location
      let linkURL = "#"; // Link URL for the task card

      try {
        // Get requester's information
        let requester = await getDocument("users", taskDetails.requesterID);

        // Get coordinates of the task location
        if ([STATUS_WAITING].includes(taskDetails.status)) {
          try {
            // Get the task location (coordinates) and calculate the distance
            markerLatLng = { lat: Number(taskDetails.details["startAddressLat"]), lng: Number(taskDetails.details["startAddressLng"]) };
            distance = await spherical.computeDistanceBetween(new google.maps.LatLng(latitude, longitude), new google.maps.LatLng(markerLatLng));
          } catch (error) {
            console.log(error);
            console.log(taskDetails);
          }
        }

        // Estimate favor length
        // TODO: The following code is only for tentative until the favor length value is revised.
        let length = 1.0;

        // Set the link URL for the task card
        linkURL = "/tasks/volunteer-favor.html";

        // Create task object for List & Map view
        let taskObj = {
          // Task Information
          taskID: id,
          taskName: taskDetails.name ?? "",
          taskStatus: taskDetails.status ?? "",
          taskDate: new Date(taskDetails.details["date"]).toLocaleDateString("en-us", { day: "numeric", month: "short", year: "numeric" }) ?? "",
          taskTime: taskDetails.details["time"] ?? "",
          taskDuration: length,
          taskAddress: taskDetails.details["startAddress"] ?? "",
          taskEndAddress: taskDetails.details["endAddress"] ?? "",
          taskMarkerLatLng: markerLatLng,
          taskDistance: distance,
          taskLinkURL: linkURL,
          // Volunteer Information
          taskVolunteerID: taskDetails.volunteerID ?? "",
          // Elder Information
          taskRequesterName: `${requester.firstName} ${requester.lastName}` ?? "",
          taskRequesterAddress: requester.address ?? "",
          taskRequesterPhoto: `${requester.profilePictureURL}` ?? "", // For Performance Improvement
        };

        // Display task information on the list and map
        createCardForVolunteer(taskObj);
        createMapMarker(taskObj, map, infoWindows);
      } catch (error) {
        console.log(error);
      }

      resolve(); // Resolve the Promise even if there was an error
    });
  });

  // Wait for all Promises to resolve
  await Promise.all(tasksPromises);
  console.log(`Number of markers: ${Object.keys(markers).length}`);

  // Sort the task cards by date (newest to oldest)
  sortTasksByDate("newest", document.querySelectorAll("#taskListExplore .taskCard"), taskListExplore);
  sortTasksByDate("newest", document.querySelectorAll("#taskListMyFavor .taskCard"), taskListMyFavor);

  // No items message
  if (document.querySelectorAll("#taskListExplore .taskCard").length === 0) {
    document.querySelector("#taskListExplore ~ .noItemsMessage").classList.remove("noResult");
  }
  if (document.querySelectorAll("#taskListMyFavor .taskCard").length === 0) {
    document.querySelector("#taskListMyFavor ~ .noItemsMessage").classList.remove("noResult");
  }

  // Apply lazy loading to images
  lazyLoadImages();
}

/**
 * Creates a task card and appends it to the appropriate list based on the task status.
 *
 * @param {Object} task - The task object containing details about the task.
 */
function createCardForVolunteer(task) {
  const listExplore = document.getElementById("taskListExplore");
  const listMyFavor = document.getElementById("taskListMyFavor");
  const listMyFavorCount = document.getElementById("favorCount");

  const card = document.createElement("div");
  card.classList.add("taskCard");
  card.setAttribute("data-taskid", task.taskID);
  card.setAttribute("data-favorType", task.taskName);
  card.setAttribute("data-date", `${task.taskDate} ${task.taskTime}`);
  card.setAttribute("data-address", task.taskAddress);
  card.setAttribute("data-distance", task.taskDistance);
  card.setAttribute("data-length", task.taskDuration);
  card.innerHTML = `
  <a class="linkURL" href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
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
  if ([STATUS_WAITING].includes(task.taskStatus)) {
    listExplore.appendChild(card);
  } else if ([STATUS_ONGOING].includes(task.taskStatus) && task.taskVolunteerID === currentUserID) {
    listMyFavor.appendChild(card);
    listMyFavorCount.textContent = ++favorCount;
  }
}

/**
 * Creates a map marker for a given task and adds it to the provided map.
 * Also adds a click event to the marker to open an info window with task details.
 *
 * @param {Object} task - The task object containing details about the task.
 * @param {Object} map - The map object where the marker will be added.
 * @param {Array} infoWindows - An array to store the created info window for later reference.
 */
function createMapMarker(task, map, infoWindows) {
  // If the task is not "Waiting to be accepted", do not create a marker
  if (![STATUS_WAITING].includes(task.taskStatus)) return;

  // Create a marker for the task
  const marker = new AdvancedMarkerElement({
    map: map,
    position: task.taskMarkerLatLng,
    title: task.taskID,
  });

  // Store the marker in the markers object
  markers[task.taskID] = marker;

  // Add a click event to the marker
  marker.addListener(
    "click",
    // TODO: Midfy according to our design team's wireframe
    (function (marker) {
      return async function () {
        // Get profile photo of the requester
        let imageURL;
        try {
          imageURL = await getFile("profile/" + task.taskRequesterPhoto);
        } catch (error) {
          console.error("Error getting image URL from Firebase Storage", error);
          imageURL = placeholderImage;
        }

        //console.log(marker.title);
        const card = document.createElement("div");
        card.classList.add("infoWindow");
        card.setAttribute("data-taskid", task.taskID);
        card.setAttribute("data-favorType", task.taskName);
        card.setAttribute("data-date", task.taskDate);
        card.setAttribute("data-address", task.taskAddress);
        card.setAttribute("data-distance", task.taskDistance);
        card.setAttribute("data-length", task.taskDuration);
        card.innerHTML = `
        <a class="linkURL" href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
        <h3 class="title">${task.taskName}</h3>
        <div class="statusColor"></div>
        <p class="date">${task.taskDate}, ${task.taskTime}</p>
        <p class="duration">Estimated Favor Length: <span class="bold">${task.taskDuration} hours</span></p>
        <div class="requester">
        <img class="photo" src="${imageURL}">
          <div class="profile">
            <p class="name">${task.taskRequesterName}</p>
            <p class="address">${task.taskRequesterAddress}</p>
          </div>
        </div>
        `;

        // Create an info window for the marker
        const infowindow = new google.maps.InfoWindow({
          content: card,
        });
        infowindow.open({
          anchor: marker,
          map,
        });
        infoWindows.push(infowindow);
      };
    })(marker)
  );
}

/**
 * Get the coordinates of the specified address
 *
 * @param {string} address - Array of tasks
 * @return {object} location - Latitude and longitude of the address
 */
function getCoordinates(address) {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address }, function (results, status) {
      if (status === "OK") {
        const location = results[0].geometry.location;
        const formattedAddress = results[0].formatted_address;
        resolve({ lat: location.lat(), lng: location.lng(), address: formattedAddress });
      } else {
        reject("Geocode was not successful for the following reason: " + status);
      }
    });
  });
}

/**
 * Closes all open info windows and clears the infoWindows array.
 *
 * @param {Array} infoWindows - An array of open info windows.
 */
function closeAllInfoWindows(infoWindows) {
  for (var i = 0; i < infoWindows.length; i++) {
    infoWindows[i].close();
  }
  infoWindows = [];
}

/**
 * Wraps the navigator.geolocation.getCurrentPosition method in a Promise.
 * This allows the method to be used with async/await syntax.
 *
 * @returns {Promise} A Promise that resolves with the Position object on success,
 * or rejects with a PositionError object on failure.
 */
function getCurrentPosition() {
  //console.log("Get Current Position");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

/**
 * Apply filters to a list of tasks.
 * It filters tasks by distance, length, favor type, and date.
 * After applying the filters, it hides the tasks that do not meet the filter conditions.
 *
 * @param {boolean} resetFlg - A flag to indicate whether to reset the filter conditions.
 */
function applyFilter(resetFlg = false) {
  // Define the filter condition object
  let filterConditions = {
    distanceFilterValue: 10000,
    lengthFilterValue: 2.5,
    groceryShopping: true,
    mailPackages: true,
    medsPickup: true,
    techHelp: true,
    petCare: true,
    transportation: true,
    dateFilterValue: "newest",
  };

  // Get the specified filter values from the form if the reset flag is FALSE
  if (!resetFlg) {
    filterConditions.distanceFilterValue = Number(document.getElementById("distanceFilter").value);
    filterConditions.lengthFilterValue = Number(document.getElementById("lengthFilter").value);
    filterConditions.groceryShopping = document.getElementById("groceryShopping").checked;
    filterConditions.mailPackages = document.getElementById("mailPackages").checked;
    filterConditions.medsPickup = document.getElementById("medsPickup").checked;
    filterConditions.techHelp = document.getElementById("techHelp").checked;
    filterConditions.petCare = document.getElementById("petCare").checked;
    filterConditions.transportation = document.getElementById("transportation").checked;

    // Get all radio buttons with the name 'dateFilter'
    let radios = document.getElementsByName("dateFilter");
    for (let radio of radios) {
      // If the radio button is selected, get its value
      if (radio.checked) {
        filterConditions.dateFilterValue = radio.value;
        break;
      }
    }
  }
  console.log(filterConditions);

  // Evaluate each task card with "Waiting to be accepted"
  let taskCards = document.querySelectorAll("#taskListExplore .taskCard");

  // Hide the task card that does not meet the filter conditions
  taskCards.forEach((card) => {
    let taskID = card.getAttribute("data-taskid");
    let marker = markers[taskID];
    let favorType = card.getAttribute("data-favorType");
    let distance = Number(card.getAttribute("data-distance"));
    let length = Number(card.getAttribute("data-length"));

    // Initialize display status as true
    let displayStatus = true;

    // Distance filter
    if (filterConditions.distanceFilterValue != 10000 && distance > filterConditions.distanceFilterValue) {
      displayStatus = false;
    }

    // Length filter
    if (length > filterConditions.lengthFilterValue) {
      displayStatus = false;
    }

    // Task type filter
    if (
      (favorType === "Grocery Shopping" && !filterConditions.groceryShopping) ||
      (favorType === "Mail & Packages" && !filterConditions.mailPackages) ||
      (favorType === "Meds Pickup" && !filterConditions.medsPickup) ||
      (favorType === "Tech Help" && !filterConditions.techHelp) ||
      (favorType === "Pet Care" && !filterConditions.petCare) ||
      (favorType === "Transportation" && !filterConditions.transportation)
    ) {
      displayStatus = false;
    }

    // Set display status for the list (card)
    if (displayStatus) {
      card.classList.remove("hide");
    } else {
      card.classList.add("hide");
    }
    // Set display status for the map (marker)
    if (marker) marker.element.style.visibility = displayStatus ? "visible" : "hidden";
  });

  // Task sort by date (newest or oldest)
  sortTasksByDate(filterConditions.dateFilterValue, taskCards, document.getElementById("taskListExplore"));

  // No items message
  if (document.querySelectorAll("#taskListExplore .taskCard:not(.hide)").length === 0) {
    document.querySelector("#taskListExplore ~ .noItemsMessage").classList.remove("noResult");
    document.getElementById("taskListExplore").classList.add("noResult");
    document.getElementById("taskMapExplore").classList.add("noResult");
  } else {
    document.querySelector("#taskListExplore ~ .noItemsMessage").classList.add("noResult");
    document.getElementById("taskListExplore").classList.remove("noResult");
    document.getElementById("taskMapExplore").classList.remove("noResult");
  }

  // When inforWindow is open on the Google Map, close all infoWindows
  closeAllInfoWindows(infoWindows);
}

/**
 * Sorts the given task cards based on the provided date filter value.
 *
 * @param {string} dateFilterValue - The value of the date filter. It can be 'newest' or 'oldest'.
 * @param {NodeList} taskCards - The task cards to be sorted. Each task card is a DOM node.
 *
 * If the date filter value is 'newest', the task cards are sorted from newest to oldest.
 * If the date filter value is 'oldest', the task cards are sorted from oldest to newest.
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

export { sortTasksByDate };

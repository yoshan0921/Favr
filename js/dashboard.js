import { closeModal, loadPartial, openModal, showTabmenu, lazyLoadImages } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAll, getAllWithFilter, getDocument, getFile } from "./firebase/firestore.js";
import { redirect } from "./utils.js";

const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const { Map } = await google.maps.importLibrary("maps");
const { spherical } = await google.maps.importLibrary("geometry");

// TODO: Need to define placeholder image properly
const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let currentUserID;
let favorCount = 0;
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
  getCurrentUserRole()
  .then(async (currentUserRole) => {
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
    registerUserFCM();
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
    main.classList.add("loaded");
  });
}

/**
 * Retrieves all tasks from the Firestore and displays them in a task list for elders.
 * Also creates a card view for the tasks.
 */
async function displayTaskListForElders() {
  try {
    // Retrieve tasks from the Firestore
    let filterCondition = [
      {
        key: "status",
        operator: "in",
        value: [STATUS_ONGOING, STATUS_WAITING, STATUS_PENDING],
      },
    ];
    let allTasks = await getAllWithFilter("tasks", filterCondition);
    // Create card view
    await createTaskListForElders(allTasks);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Displays a list of tasks in card format.
 *
 * @param {Array} allTasks - An array of all tasks.
 */
async function createTaskListForElders(allTasks) {
  const list = document.getElementById("taskList");
  const tasksPromises = allTasks.map(async (task) => {
    // for (let task of allTasks) {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data

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
  card.setAttribute("data-date", task.taskDate);
  card.setAttribute("data-address", task.taskAddress);
  card.innerHTML = `
  <a href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
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

  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  displayTaskListForVolunteers().then(() => {
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
}

/**
 * Retrieves all tasks from the Firestore and populates the task list for volunteers.
 * Also creates a list view (including map view) for the tasks.
 *
 * TODO: Not all data should be retrieved here, but the target of retrieval should be narrowed down with a where clause.
 */
async function displayTaskListForVolunteers() {
  return new Promise(async (resolve, reject) => {
    try {
      // Retrieve tasks from the Firestore
      let filterCondition = [
        {
          key: "status",
          operator: "in",
          value: [STATUS_ONGOING, STATUS_WAITING],
        },
      ];
      let allTasks = await getAllWithFilter("tasks", filterCondition);

      // Create List View (including Map View)
      createTaskListForVolunteers(allTasks)
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
async function createTaskListForVolunteers(allTasks) {
  const mapElement = document.getElementById("map");
  let map; // For Google Map
  let latitude;
  let longitude;

  try {
    // Memo:
    // Sometimes, getCurrentPosition takes a long time to get the return.
    // So, geoPosition data is stored in sessionStorage to avoid the delay for the next time.

    // Get current location (If it's not first time in the session, get the location from sessionStorage)
    let position = sessionStorage.getItem("currentPosition");
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
    latitude = position.latitude;
    longitude = position.longitude;

    // Create Map
    map = new Map(mapElement, {
      zoom: 14,
      center: { lat: latitude, lng: longitude },
      mapId: "DEMO_MAP_ID",
    });

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
      // Wrap the task in a new Promise
      let id = task[0]; // Task ID
      let taskDetails = task[1]; // Task detail data
      let markerLatLng = {}; // Task location (Marker position)
      let distance = 0; // Distance between the current location and the task location
      let linkURL = "#"; // Link URL for the task card

      try {
        // Get requester's information
        let requester = await getDocument("users", taskDetails.requesterID);

        // Get coordinates of the task location
        if ([STATUS_WAITING].includes(taskDetails.status)) {
          try {
            let result = await getCoordinates(taskDetails.details["startAddress"]);
            markerLatLng = { lat: result.lat, lng: result.lng };

            // Calculate the distance between the current location and the task location
            distance = await spherical.computeDistanceBetween(new google.maps.LatLng(latitude, longitude), new google.maps.LatLng(markerLatLng));
          } catch (error) {
            console.log(error);
            console.log(requester);
            console.log(taskDetails);
          }
        }

        // Get favor length
        // TODO: The following code is only for tentative until the favor length value is revised.
        let length = taskDetails.details["favorLength"];
        switch (length) {
          case "30 mins":
            length = 0.5;
            break;
          case "1 hrs":
            length = 1;
            break;
          case "1.5 hrs":
            length = 1.5;
            break;
          case "2 hrs":
            length = 2;
            break;
          case "2.5 hrs":
            length = 2.5;
            break;
          case "3 hrs":
            length = 3;
            break;
          default:
            length = "N/A";
            break;
        }

        // Set the link URL for the task card
        if (taskDetails.status === STATUS_WAITING) {
          linkURL = "/tasks/accept.html";
        } else if (taskDetails.status === "On going") {
          linkURL = "/tasks/myfavr.html";
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

  // Sort the task cards by date (newest to oldest)
  sortTasksByDate("newest", document.querySelectorAll("#taskListExplore .taskCard"), document.getElementById("taskListExplore"));
  sortTasksByDate("newest", document.querySelectorAll("#taskListMyFavor .taskCard"), document.getElementById("taskListMyFavor"));

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
  // const listHistory = document.getElementById("taskListHistory");
  const listMyFavorCount = document.getElementById("favorCount");

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
  if ([STATUS_WAITING].includes(task.taskStatus)) {
    listExplore.appendChild(card);
  } else if ([STATUS_ONGOING].includes(task.taskStatus) && task.taskVolunteerID === currentUserID) {
    listMyFavor.appendChild(card);
    listMyFavorCount.innerHTML = ++favorCount;
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

  // FOR DEBUGGING
  // console.log(`createMapMarker: ${JSON.stringify(task)}`);

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
        <a href="${task.taskLinkURL}?taskid=${task.taskID}"></a>
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
 */
function applyFilter() {
  // Get the specified filter conditions
  let distanceFilterValue = Number(document.getElementById("distanceFilter").value);
  let lengthFilterValue = Number(document.getElementById("lengthFilter").value);
  let groceryShopping = document.getElementById("groceryShopping").checked;
  let mailPackages = document.getElementById("mailPackages").checked;
  let medsPickup = document.getElementById("medsPickup").checked;
  let techHelp = document.getElementById("techHelp").checked;
  let petCare = document.getElementById("petCare").checked;
  let transportation = document.getElementById("transportation").checked;
  let dateFilterValue;
  // Get all radio buttons with the name 'dateFilter'
  let radios = document.getElementsByName("dateFilter");
  for (let radio of radios) {
    // If the radio button is selected, get its value
    if (radio.checked) {
      dateFilterValue = radio.value;
      break;
    }
  }

  // Store the filter conditions in localStorage
  if (document.getElementById("savePreferenceCheckbox").checked) {
    localStorage.setItem("distanceFilter", distanceFilterValue);
    localStorage.setItem("lengthFilter", lengthFilterValue);
    localStorage.setItem("groceryShopping", groceryShopping);
    localStorage.setItem("mailPackages", mailPackages);
    localStorage.setItem("medsPickup", medsPickup);
    localStorage.setItem("techHelp", techHelp);
    localStorage.setItem("petCare", petCare);
    localStorage.setItem("transportation", transportation);
    localStorage.setItem("dateFilter", dateFilterValue);
    console.log("Filter Conditions Saved");
  }

  // Evaluate each task card with "Waiting to be accepted"
  let taskCards = document.querySelectorAll("#taskListExplore .taskCard");
  //console.log(taskCards);

  // Hide the task card that does not meet the filter conditions
  taskCards.forEach((card) => {
    let taskID = card.getAttribute("data-taskid");
    let marker = markers[taskID];
    let favorType = card.getAttribute("data-favorType");
    let distance = Number(card.getAttribute("data-distance"));
    let length = Number(card.getAttribute("data-length"));
    //console.log(`taskID: ${taskID} favorType: ${favorType}, distance: ${distance}, length: ${length}, marker: ${marker}`);

    // Initialize display status as true
    let displayStatus = true;

    // Distance filter
    if (distanceFilterValue != 10000 && distance > distanceFilterValue) {
      displayStatus = false;
      console.log("Distance filter applied");
    }

    // Length filter
    if (length > lengthFilterValue) {
      displayStatus = false;
      console.log("Length filter applied");
    }

    // Task type filter
    if (
      (favorType === "Grocery Shopping" && !groceryShopping) ||
      (favorType === "Mail & Packages" && !mailPackages) ||
      (favorType === "Meds Pickup" && !medsPickup) ||
      (favorType === "Tech Help" && !techHelp) ||
      (favorType === "Pet Care" && !petCare) ||
      (favorType === "Transportation" && !transportation)
    ) {
      displayStatus = false;
      console.log("Task type filter applied");
    }

    // Set display status
    card.style.display = displayStatus ? "block" : "none";
    if (marker) marker.element.style.visibility = displayStatus ? "visible" : "hidden";
  });

  // Task sort by date (newest or oldest)
  sortTasksByDate(dateFilterValue, taskCards, document.getElementById("taskListExplore"));

  // When inforWindow is open on the Google Map, close all infoWindows
  closeAllInfoWindows(infoWindows);

  // Save the filter conditions in localStorage
  let savePreferenceCheckbox = document.getElementById("savePreferenceCheckbox").checked;
  localStorage.setItem("savePreferenceCheckbox", savePreferenceCheckbox);
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

/**
 * The `readPreference` function retrieves saved user settings from localStorage,
 * and sets the state of various fields in an HTML form based on these settings.
 *
 * The following settings are retrieved from localStorage:
 * - dateFilter: The value for a date filter
 * - distanceFilter: The value for a distance filter
 * - lengthFilter: The value for a length filter
 * - groceryShopping: The state of a 'Grocery Shopping' checkbox
 * - mailPackages: The state of a 'Mail Packages' checkbox
 * - medsPickup: The state of a 'Medication Pickup' checkbox
 * - techHelp: The state of a 'Tech Help' checkbox
 * - petCare: The state of a 'Pet Care' checkbox
 * - transportation: The state of a 'Transportation' checkbox
 * - savePreferenceCheckbox: The state of a 'Save Preference' checkbox
 */
function readPreference() {
  //console.log("Read Preference");
  // If there is a saved preference, get the filter conditions from localStorage
  let dateFilterValue = localStorage.getItem("dateFilter");
  let distanceFilterValue = localStorage.getItem("distanceFilter");
  let lengthFilterValue = localStorage.getItem("lengthFilter");
  let groceryShopping = localStorage.getItem("groceryShopping") === "true";
  let mailPackages = localStorage.getItem("mailPackages") === "true";
  let medsPickup = localStorage.getItem("medsPickup") === "true";
  let techHelp = localStorage.getItem("techHelp") === "true";
  let petCare = localStorage.getItem("petCare") === "true";
  let transportation = localStorage.getItem("transportation") === "true";
  let savePreferenceCheckbox = localStorage.getItem("savePreferenceCheckbox") === "true";

  // Set the filter conditions
  let dateSortFilters = document.getElementsByName("dateFilter");
  dateSortFilters[0].checked = true; //the first option is always checked by default
  if (dateSortFilters[1].getAttribute("id") == dateFilterValue) dateSortFilters[1].checked = true;
  document.getElementById("distanceFilter").value = distanceFilterValue;
  document.getElementById("lengthFilter").value = lengthFilterValue;
  document.getElementById("groceryShopping").checked = groceryShopping;
  document.getElementById("mailPackages").checked = mailPackages;
  document.getElementById("medsPickup").checked = medsPickup;
  document.getElementById("techHelp").checked = techHelp;
  document.getElementById("petCare").checked = petCare;
  document.getElementById("transportation").checked = transportation;
  document.getElementById("savePreferenceCheckbox").checked = savePreferenceCheckbox;
}

export { sortTasksByDate };

import { closeModal, loadPartial, openModal } from "./common.js";
import { getCurrentUserID, getCurrentUserRole, monitorAuthenticationState } from "./firebase/authentication.js";
import { getAll, getDocument, getFile } from "./firebase/firestore.js";
import { redirect } from "./utils.js";

const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const { Map } = await google.maps.importLibrary("maps");
const { spherical } = await google.maps.importLibrary("geometry");

// TODO: Need to define placeholder image properly
const placeholderImage = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

let currentUserID;
let currentUserRole;
let favorCount = 0;
let markers = {}; // For Google Map
let infoWindows = []; // For Google Map

window.addEventListener("load", function (event) {
  // Check if the user is logged in
  monitorAuthenticationState();

  //Give "active" class to a tag under nav#sidebar based on the current html file name
  const filename = window.location.pathname.split("/").pop();
  if (filename.startsWith("dashboard.html")) {
    document.getElementById("home-menu").classList.add("active");
  }
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
  currentUserRole = await getCurrentUserRole();
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

  // Link to each tasb in the dashboard
  let hash = window.location.hash;
  //console.log("hash = " + hash);
  if (hash === "#explore") {
    tab1.click();
  } else if (hash === "#myfavors") {
    tab2.click();
  } else if (hash === "#history") {
    tab3.click();
  }
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
    let allTasks = await getAll("tasks");
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
        // FOR DEBUGGING
        //console.log(requester);
        //console.log(volunteer);
        //console.log(taskDetails);

        // Check if the requester of the task is the current user
        if (taskDetails.requesterID !== currentUserID) return;

        // Get task information
        let taskName = taskDetails.name ?? "";
        let taskStatus = taskDetails.status ?? "";
        let taskDate = taskDetails.details["date"] ?? "";
        let taskAddress = taskDetails.details["startAddress"] ?? "";
        let taskNotes = taskDetails.notes ?? "";
        let taskVolunteerPhoto;
        try {
          taskVolunteerPhoto = await getFile("profile/" + volunteer.profilePictureURL);
        } catch (error) {
          taskVolunteerPhoto = placeholderImage;
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
        card.setAttribute("data-taskid", id);
        card.setAttribute("data-favorType", taskName);
        card.setAttribute("data-date", taskDate);
        card.setAttribute("data-address", taskAddress);
        card.innerHTML = `
        <a href="/tasks/tracking.html?taskid=${id}"></a>
        <h3 class="title">${taskName}</h3>
        <p class="status"><span class="statusColor"></span>${taskStatus}</p>
        <p class="notes">${taskNotes}</p>
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
  });

  // Wait for all tasks to be processed
  await Promise.all(tasksPromises);

  // Sort the task cards by date (newest to oldest)
  sortTasksByDate("newest", document.querySelectorAll("#taskList .taskCard"), document.getElementById("taskList"));
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
  // Retrieve tasks from the database
  const main = document.getElementsByTagName("main")[0];
  displayTaskListForVolunteers().then(() => {
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
async function displayTaskListForVolunteers() {
  return new Promise(async (resolve, reject) => {
    try {
      // Retrieve tasks from the Firestore
      let allTasks = await getAll("tasks");

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
    //console.log("Current Position: " + position);
    //console.log(`Current Coordinates: ${latitude}, ${longitude}`);

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
        if (["Waiting to be accepted"].includes(taskDetails.status)) {
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
        if (taskDetails.status === "Waiting to be accepted") {
          linkURL = "/tasks/accept.html";
        } else if (taskDetails.status === "On going") {
          linkURL = "/tasks/myfavr.html";
        } else {
          linkURL = "#";
        }

        // Create task object for List & Map view
        let taskObj = {
          taskID: id,
          taskName: taskDetails.name ?? "",
          taskStatus: taskDetails.status ?? "",
          taskDate: taskDetails.details["date"] ?? "",
          taskTime: taskDetails.details["time"] ?? "",
          taskDuration: length,
          taskAddress: taskDetails.details["startAddress"] ?? "",
          taskEndAddress: taskDetails.details["endAddress"] ?? "",
          taskVolunteerID: taskDetails.volunteerID ?? "",
          taskRequesterName: `${requester.firstName} ${requester.lastName}` ?? "",
          taskRequesterAddress: requester.address ?? "",
          taskRequesterPhoto: `${requester.profilePictureURL}` ?? "", // For Performance Improvement
          taskMarkerLatLng: markerLatLng,
          taskDistance: distance,
          taskLinkURL: linkURL,
        };
        //console.log(taskObj);

        // Display task information on the list and map
        createCard(taskObj);
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

  // Apply lazy loading to images
  lazyLoadImages();
}

/**
 * Creates a task card and appends it to the appropriate list based on the task status.
 *
 * @param {Object} task - The task object containing details about the task.
 */
function createCard(task) {
  const listExplore = document.getElementById("taskListExplore");
  const listMyFavor = document.getElementById("taskListMyFavor");
  const listHistory = document.getElementById("taskListHistory");
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
  if (["Waiting to be accepted"].includes(task.taskStatus)) {
    listExplore.appendChild(card);
  } else if (["On going"].includes(task.taskStatus) && task.taskVolunteerID === currentUserID) {
    listMyFavor.appendChild(card);
    listMyFavorCount.innerHTML = ++favorCount;
  } else if (["Pending approval", "Completed", "Cancelled"].includes(task.taskStatus) && task.taskVolunteerID === currentUserID) {
    listHistory.appendChild(card);
    // Add data-status attribute to the card for status filtering
    if (task.taskStatus === "Pending approval") {
      card.querySelector(".taskCard .statusColor").style.backgroundColor = "#ffcd29";
      card.setAttribute("data-status", "Pending approval");
    } else if (task.taskStatus === "Completed") {
      card.querySelector(".taskCard .statusColor").style.backgroundColor = "#44c451";
      card.setAttribute("data-status", "Completed");
    } else if (task.taskStatus === "Cancelled") {
      card.querySelector(".taskCard .statusColor").style.backgroundColor = "#f24822";
      card.setAttribute("data-status", "Cancelled");
    }
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
  if (!["Waiting to be accepted"].includes(task.taskStatus)) return;

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

  //console.log(`Sort by ${dateFilterValue}`);
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
  document.getElementById(dateFilterValue).checked = true;
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

/**
 * Asynchronously loads images when they enter the viewport.
 *
 * This function uses the Intersection Observer API to lazily load images.
 * It observes all img elements with a `data-storage-path` attribute.
 * When an image enters the viewport, it fetches the image from the path specified in the `data-storage-path` attribute.
 * If the path is not 'profile/null', it fetches the image from Firebase Storage using the `getFile` function.
 * Once the image is fetched, it sets the image's src attribute to the fetched URL and removes the `data-storage-path` attribute.
 * If an error occurs while fetching the image, it logs the error to the console.
 * Regardless of whether the image fetch was successful or not, it stops observing the image after it has intersected.
 */
async function lazyLoadImages() {
  try {
    const lazyImages = document.querySelectorAll("img[data-storage-path]");

    if ("IntersectionObserver" in window) {
      let lazyImageObserver = new IntersectionObserver(async function (entries, observer) {
        for (let entry of entries) {
          if (entry.isIntersecting) {
            let lazyImage = entry.target;
            let storagePath = lazyImage.getAttribute("data-storage-path");
            if (storagePath != "profile/null") {
              try {
                const url = await getFile(storagePath);
                lazyImage.src = url;
                lazyImage.removeAttribute("data-storage-path");
              } catch (error) {
                console.error("Error getting image URL from Firebase Storage", error);
              } finally {
                // Always unobserve the image, whether the request succeeded or failed
                lazyImageObserver.unobserve(lazyImage);
              }
            }
          }
        }
      });

      lazyImages.forEach(function (lazyImage) {
        lazyImageObserver.observe(lazyImage);
      });
    }
  } catch (error) {
    console.error("Error in lazyLoadImages function", error);
  }
}

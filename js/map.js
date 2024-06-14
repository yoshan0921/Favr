import { getAll, getDocument, getFile } from "./firebase/firestore.js";

const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const { Map } = await google.maps.importLibrary("maps");

/**
 * Create a map view with current location and task markers
 * @param {object} taskArray - Array of tasks
 *
 */
function createMapView(taskArray) {
  // Get current location
  navigator.geolocation.getCurrentPosition(function (position) {
    // Get current location
    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;
    // Initialize the map
    initMap(taskArray, latitude, longitude);
  });
}

/**
 * Create a map and markers
 * @param {object} taskArray - Array of tasks
 * @param {number} latitude - Latitude of the current location
 * @param {number} longitude - Longitude of the current location
 *
 */
async function initMap(taskArray, latitude, longitude) {
  const mapElement = document.getElementById("map");
  let infoWindows = [];

  // Display map with current location
  if (!mapElement) return;
  const position = { lat: latitude, lng: longitude };
  const map = new Map(mapElement, {
    zoom: 14,
    center: position,
    mapId: "DEMO_MAP_ID",
  });

  // Customize the marker style for the current location
  // TODO: Midfy according to our design team's wireframe
  const you = document.createElement("div");
  you.classList.add("you");
  you.textContent = "You";

  // Add a marker for the current location
  // TODO: Midfy according to our design team's wireframe
  new AdvancedMarkerElement({
    map: map,
    position: position,
    content: you,
  });

  // Add markers for each task location
  let markerPromises = taskArray.map((task) => {
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data
    let markerLatLng = {}; // Task location (Marker position)

    // Add marker for each task which is "Waiting to be accepted" status
    // To show the requester information, firstly get the requesterID from the task details.
    // Then, get the requester information from the users collection.
    getDocument("users", taskDetails.requesterID)
      .then(async (requester) => {
        console.log("Requester: " + JSON.stringify(requester));
        console.log("Errand Info: " + JSON.stringify(taskDetails));

        // Get task information
        let taskName = taskDetails.name ?? "";
        let taskDate = taskDetails.details["date"] ?? "";
        let taskDuration = taskDetails.details["duration"] ?? "";
        let taskRequesterName = requester.firstName + " " + requester.lastName ?? "";
        let taskRequesterAddress = requester.address ?? "";

        // Get requester's profile picture
        let taskRequesterPhoto;
        try {
          taskRequesterPhoto = await getFile("profile/" + requester.profilePictureURL);
        } catch (error) {
          taskRequesterPhoto = "https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512";
        }

        // Skip tasks that are not "Waiting to be accepted" status
        if (!["Waiting to be accepted"].includes(taskDetails.status)) return;

        // Get specified address of the task
        let taskAddress = taskDetails.details["address"] ?? "";
        try {
          let result = await getCoordinates(taskAddress);
          markerLatLng = { lat: result.lat, lng: result.lng };
          let formattedAddress = result.address;
          console.log("Formatted Address: " + formattedAddress);
          console.log("Formatted Address Coordinates: " + JSON.stringify(markerLatLng));
        } catch (error) {
          console.log(error);
          return;
        }

        // Calculate the distance between the current location and the task location
        let distance = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(latitude, longitude), new google.maps.LatLng(markerLatLng.lat, markerLatLng.lng));
        console.log("Distance: " + distance + " meters");

        // Create a marker for the task
        const marker = new AdvancedMarkerElement({
          map: map,
          position: markerLatLng,
          title: id,
        });

        // Add a click event to the marker
        marker.addListener(
          "click",
          // TODO: Midfy according to our design team's wireframe
          (function (marker) {
            return function () {
              console.log(marker.title);
              const contentString = `
              <div class=infoWindow>
                <a href="/tasks/accept.html?taskid=${id}" data-taskid="${id} data-distance=${distance}"></a>
                <h3 class="title">${taskName}</h3>
                <div class="statusColor"></div>
                <p class="date">${taskDate}</p>
                <p class="duration">Estimated Favor Length: <span class="bold">${taskDuration}</span></p>
                <div class="requester">
                  <img class="photo" src="${taskRequesterPhoto}">
                  <div class="profile">
                    <p class="name">${taskRequesterName}</p>
                    <p class="address">${taskRequesterAddress}</p>
                  </div>
                </div>
              </div>
              `;
              const infowindow = new google.maps.InfoWindow({
                content: contentString,
              });
              infowindow.open({
                anchor: marker,
                map,
              });
              infoWindows.push(infowindow);
            };
          })(marker)
        );
      })
      .catch((error) => {
        console.log(error);
      });
  });

  // Wait for all markers to be created
  await Promise.all(markerPromises);

  // Close all info windows when the map is clicked
  map.addListener("click", function () {
    closeAllInfoWindows();
  });

  function closeAllInfoWindows() {
    for (var i = 0; i < infoWindows.length; i++) {
      infoWindows[i].close();
    }
    infoWindows = [];
  }
}

/**
 * Get the coordinates of the specified address
 * @param {string} address - Array of tasks
 * @return {object} location - Latitude and longitude of the address
 *
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

export { createMapView };

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
  // Display map with current location
  const position = { lat: latitude, lng: longitude };

  const mapElement = document.getElementById("map");
  if (!mapElement) return;

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

  let infoWindows = [];

  // Add markers for each task location
  let markerPromises = taskArray.map((task) => {
    let lat = latitude + (Math.random() - 0.5) / 111.0;
    let lng = longitude + (Math.random() - 0.5) / (111.0 * Math.cos((latitude * Math.PI) / 180));
    let markerLatLng = { lat: lat, lng: lng };
    let id = task[0]; // Task ID
    let taskDetails = task[1]; // Task detail data

    getDocument("users", taskDetails.requesterID)
      .then(async (requester) => {
        console.log(requester);
        console.log(taskDetails);

        // Get task information
        let taskName = taskDetails.name ? taskDetails.name : "Not provided";
        let taskDate = taskDetails.details["date"] ? taskDetails.details["date"] : "Not provided";
        let taskDuration = taskDetails.details["duration"] ? taskDetails.details.duration : "Not provided";
        let taskRequesterName = requester.firstName + " " + requester.lastName ? requester.firstName + " " + requester.lastName : "Not provided";
        let taskRequesterAddress = requester.address ? requester.address : "Not provided";
        let taskRequesterPhoto;
        try {
          taskRequesterPhoto = await getFile("profile/" + requester.profilePictureURL);
        } catch (error) {
          taskRequesterPhoto = "https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512";
        }

        // Skip tasks that are not "Waiting to be accepted" status
        if (!["Waiting to be accepted"].includes(taskDetails.status)) return;

        // Create a marker and add clickevent
        const marker = new AdvancedMarkerElement({
          map: map,
          position: markerLatLng,
          title: id,
        });
        marker.addListener(
          "click",
          // TODO: Midfy according to our design team's wireframe
          (function (marker) {
            return function () {
              console.log(marker.title);
              const contentString = `
              <div class=infoWindow>
                <a href="/tasks/accept.html?taskid=${id}"></a>
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

export { createMapView };

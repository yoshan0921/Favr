const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
const { Map } = await google.maps.importLibrary("maps");

/**
 * Create a map view with current location and task markers
 * @param {object} taskArray - Array of tasks
 *
 * Example:
 * let taskArray = {
 *    task1: {
 *      taskName: "Delivery Errand",
 *      status: "1 hour",
 *      requester: "Yosuke",
 *    },
 *    task2: {},
 *    task3: {},
 * };
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

  var infoWindows = [];

  // Add markers for each task location
  // TODO: This is just a dummy data. Location data should be fetched from the database.
  for (let task of taskArray) {
    let lat = latitude + (Math.random() - 0.5) / 111.0;
    let lng = longitude + (Math.random() - 0.5) / (111.0 * Math.cos((latitude * Math.PI) / 180));
    let markerLatLng = { lat: lat, lng: lng };

    const marker = new AdvancedMarkerElement({
      map: map,
      position: markerLatLng,
      title: task[0],
    });

    // Add clickevent to each marker
    marker.addListener(
      "click",
      // TODO: Midfy according to our design team's wireframe
      (function (marker) {
        return function () {
          console.log(marker.title);
          const contentString = `
          <div class=infoWindow>
            <a href="/tasks/accept.html?taskid=${task[0]}"></a>
            <h2 class="title">${task[1].name}</a></h2>
            <p class="date">May 28th, 10:00am</p>
            <p class="duration">Estimated Favor Length: <span class="bold">1hour</span></p>
            <div class="requester">
              <img class="photo" src="https://ca.slack-edge.com/T61666YTB-U01K4V1UYJU-gb4b5740b553-512">
              <div class="profile">
                <p class="name">${task[1].requester}</p>
                <p class="address">Marpole Vancouver, BC</p>
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
  }

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

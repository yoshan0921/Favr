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
      // title: Object.keys(taskArray)[i],
      title: task[0],
    });

    // Add clickevent to each marker
    marker.addListener(
      "click",
      // TODO: Midfy according to our design team's wireframe
      (function (marker) {
        return function () {
          console.log(marker.title);

          // =========== TEST
          const contentString = `
          <h3><a href="index.html">${task[1].name}</a></h3>
          <p>May 28th, 10:00am</p>
          <p>Estimated Favor Length: <span class="bold">1hour</span></p>
          <div class="requester">
            <img class="photo" src="https://ca.slack-edge.com/T61666YTB-U06C1DELWP3-a8c7ced7390c-512">
            <div class="profile">
              <p class="name">${task[1].requester}</p>
              <p>Marpole Vancouver, BC</p>
            </div>
          </div>
          <style>
          h3 { 
            margin-bottom: 1rem; 
            font-family: Arial Black, sans-serif;
            font-size: 1.2rem;
          }
          .bold { font-weight: bold; }
          .requester { display: flex; }
          .requester .name {
            font-family: Arial Black, sans-serif;
            font-size: 1rem;
          }
          .photo { 
            display: block; 
            border-radius: 50%; 
            width: 60px; 
            height: 60px; 
            margin: .5rem .5rem .5rem 0;
          }
          .profile {
            align-self: center;
          }
          </style>
          `;
          const infowindow = new google.maps.InfoWindow({
            content: contentString,
            ariaLabel: "Uluru",
          });
          infowindow.open({
            anchor: marker,
            map,
          });
          infoWindows.push(infowindow);
          // =========== TEST

          let infoArea = document.getElementById("taskinfo");
          infoArea.innerHTML = "";
          let card = document.createElement("div");
          card.classList.add("taskCard");
          let title = marker.title;
          card.innerHTML = `
          <h2>${task[1].name}</h2>
          <p>status: ${task[1].status}</p>
          <p>Requester: ${task[1].requester}</p>
          <button><a href="./create-task.html">See more</button>
        `;
          infoArea.appendChild(card);
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

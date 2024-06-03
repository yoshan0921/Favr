// Maps JavaScript API (Dynamic Library Import)
// The snippet is provided by Google Map site.
((g) => {
  var h,
    a,
    k,
    p = "The Google Maps JavaScript API",
    c = "google",
    l = "importLibrary",
    q = "__ib__",
    m = document,
    b = window;
  b = b[c] || (b[c] = {});
  var d = b.maps || (b.maps = {}),
    r = new Set(),
    e = new URLSearchParams(),
    u = () =>
      h ||
      (h = new Promise(async (f, n) => {
        await (a = m.createElement("script"));
        e.set("libraries", [...r] + "");
        for (k in g)
          e.set(
            k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
            g[k]
          );
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = f;
        a.onerror = () => (h = n(Error(p + " could not load.")));
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
  d[l] ? console.warn(p + " only loads once. Ignoring:", g) : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
})({
  key: "AIzaSyCmy-0P_Y1HQdMacXnu9a2zs4dcm5FQ40w",
  // Add other bootstrap parameters as needed, using camel case.
  // Use the 'v' parameter to indicate the version to load (alpha, beta, weekly, etc.)
});
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

    // TODO: Decide Data Model officially. Now, add tentative treatment.
    // let filteredTaskArray = {};
    // data.forEach((item, index) => {
    //   filteredTaskArray[`task${index + 1}`] = item[1];
    // });
    // console.log(filteredTaskArray);

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
  const map = new Map(document.getElementById("map"), {
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
          let infoArea = document.getElementById("taskinfo");
          infoArea.innerHTML = "";
          let card = document.createElement("div");
          card.classList.add("taskCard");
          let title = marker.title;
          card.innerHTML = `
          <h2>${task[1].name}</h2>
          <p>status: ${task[1].status}</p>
          <p>Requester: ${task[1].requester}</p>
          <button><a href="./task-detail.html">See more</button>
        `;
          infoArea.appendChild(card);
        };
      })(marker)
    );
  }
}

export { createMapView };

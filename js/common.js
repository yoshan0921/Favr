import { signOut } from "./utils.js";

/**
 * An object that maps some pages to their title that will show to the user
 */
let pageTitles = {
  "dashboard.html": "Dashboard",
  "profile.html": "Profile",
  "tasks/create.html": "Request favor",
  "tasks/details.html": "Task Details",
  "tasks/updates.html": "Updates",
};

loadCommonContent();

/**
 *
 */
async function loadCommonContent() {
  loadPartial("_header", "header").then(loadPageTitle).catch((error)=>console.log(error));
  loadPartial("_sidebar", "leftside-column").then(addListenerToLogoutButton).catch((error)=> console.log(error));

  const backButton = document.getElementById("backBtn");
  if (backButton)
    backButton.addEventListener("click", (e) => {
      window.history.back();
    });
}

/**
 *
 * @param {string} partial - the name of the partial file (without .html)
 * @param {string} destination - the unique id of the HTML element where the partial will be loaded
 */

// async function loadPartial(partial, destination) {
//   fetch(`../partials/${partial}.html`)
//     .then((response) => response.text())
//     .then((data) => (document.getElementById(destination).innerHTML = data));
// }

// Memo by Yosuke:
// Revised: Returns a Promise when the DOM update is complete.
async function loadPartial(partial, destination) {
  const response = await fetch(`../partials/${partial}.html`);
  const data = await response.text();

  return new Promise((resolve) => {
    const targetElement = document.getElementById(destination);
    if(targetElement){
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });
  
      observer.observe(targetElement, { childList: true });
      targetElement.innerHTML = data;
    }else{
      reject(`Could not load "../partials/${partial}.html. There is no element with the id "${destination}"`);
    }
  });
}

/**
 * 
 */
function loadPageTitle() {
    let path = window.location.pathname;
    let title = "";
    for (let pathEnding in pageTitles) {
      if (path.endsWith(pathEnding)) {
        title = pageTitles[pathEnding];
      }
    }
    const pageTitle = document.getElementById("page-title");
    pageTitle.innerText = title;
  
}
/**
 * 
 */
function addListenerToLogoutButton(){
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click",signOut);
}

export { loadPartial };

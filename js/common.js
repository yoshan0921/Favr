import { enableBackButton, signOut } from "./utils.js";

/**
 * An object that maps some pages to their title that will show to the user
 * on the page <header>
 */
let pageTitles = {
  "dashboard.html": "Dashboard",
  "profile.html": "Profile",
  "profile/edit.html": "Profile",
  "tasks/create.html": "Request favor",
  "tasks/details.html": "Task Details",
  "tasks/updates.html": "Updates",
  "tasks/accept.html": "Accept favor",
  "support.html": "Get support",
  "tasks/tracking.html": "Favor Tracking"
};
const menuLinks = {
  "dashboard.html" : "home-menu",
  "updates.html":"updates-menu",
  "profile.html":"profile-menu"
}
loadCommonContent();

/**
 * Loads the header, the menu and the footer
 */
async function loadCommonContent() {
  Promise.all([
    loadPartial("_header", "header"),
    loadPartial("_sidebar", "leftside-column"),
    loadPartial("_footer", "footer")
  ])
  .then(()=>{
    loadPageTitle();
    addListenerToLogoutButton();
    activateMenuLinkAndBackButton();
  })
  .catch((error) => console.log(error));
}

/**
 *
 * @param {string} partial - the name of the partial file (without .html)
 * @param {string} destination - the unique id of the HTML element where the partial will be loaded
 */
async function loadPartial(partial, destination) {
  const response = await fetch(`../partials/${partial}.html`);
  const data = await response.text();

  return new Promise((resolve, reject) => {
    const targetElement = document.getElementById(destination);
    if (targetElement) {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });

      observer.observe(targetElement, { childList: true });
      targetElement.innerHTML = data;
    } else {
      reject(`Could not load "../partials/${partial}.html. There is no element with the id "${destination}"`);
    }
  });
}

/**
 * Sets the title of the page header based on the current URL.
 * It tries to match the path on the URL to one the of the fields
 * of the pageTitles object. If there is no field on this object
 * for the current page, then the title will remain empty
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
 * Self explanatory
 */
function addListenerToLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", signOut);
}

// Get the <span> element that closes the modal
const closeModalBtns = document.getElementsByClassName("closeModal");
// When the user clicks on <span> (x), close the modal
if(closeModalBtns.length>0) {
  for(const btn of closeModalBtns){
    btn.onclick = function() {
      let parentModal = btn.closest(".modal");
      closeModal(parentModal);
    }
  }
}

function openModal(modal){
  modal.style.display = "block";
  window.addEventListener("click", function(event) {
    if (event.target == modal) {
      closeModal(modal);
    }
  });
}
function closeModal(modal){
  modal.style.display = "none";
  removeEventListener("click", window);
}
/**
 * 
 */
function activateMenuLinkAndBackButton(){
  const currentPath = window.location.pathname.split("/").pop();
  let currentPageRequiresBackButton = true;
  for(let pathName in menuLinks){
    if(pathName == currentPath){
      const menuLink = document.getElementById(menuLinks[pathName]);
      menuLink.classList.add("active");
      currentPageRequiresBackButton = false;
    }
  }
  if(currentPageRequiresBackButton){
    enableBackButton();
  }
}
export { 
  loadPartial,
  openModal,
  closeModal,
 };

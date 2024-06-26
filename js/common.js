import { enableBackButton, redirect, signOut } from "./utils.js";
import { getFile } from "./firebase/firestore.js";
import { checkUserAuthorization } from "./firebase/authentication.js";

/**
 * GLOBAL VARIABLES: Task Status
 */
Object.defineProperty(window, "STATUS_WAITING", { value: "Waiting to be accepted", writable: false });
Object.defineProperty(window, "STATUS_ONGOING", { value: "On going", writable: false });
Object.defineProperty(window, "STATUS_PENDING", { value: "Pending approval", writable: false });
Object.defineProperty(window, "STATUS_COMPLETED", { value: "Completed", writable: false });
Object.defineProperty(window, "STATUS_CANCELLED", { value: "Cancelled", writable: false });

/**
 * An object that maps some pages to their title that will show to the user
 * on the page <header>
 */
let pageTitles = {
  "dashboard.html": "Dashboard",
  "profile.html": "Profile",
  "history.html": "History",
  "profile/edit.html": "Profile",
  "tasks/create.html": "Request favor",
  "tasks/elder-favor.html": "Favor Tracking",
  "tasks/accept.html": "Favor Details",
  "tasks/myfavr.html": "My Favor",
  "tasks/volunteer-favor.html": "My Favor",
  "tasks/updates.html": "Updates",
  "support.html": "Get support",
  "chat.html": "Messages",
};
const menuLinks = {
  "dashboard.html": "home-menu",
  "updates.html": "updates-menu",
  "history.html": "history-menu",
  "profile.html": "profile-menu",
};
document.getElementsByTagName("body")[0].style.visibility = "hidden";
checkUserAuthorization()
  .then(() => {
    loadCommonContent().then(() => {
      document.getElementsByTagName("body")[0].style.visibility = "visible";
    });
  })
  .catch((error) => redirect("403.html"));

/**
 * Loads the header, the menu and the footer
 */
async function loadCommonContent() {
  Promise.all([loadPartial("_header", "header"), loadPartial("_sidebar", "leftside-column"), loadPartial("_footer", "footer")])
    .then(() => {
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
if (closeModalBtns.length > 0) {
  for (const btn of closeModalBtns) {
    btn.onclick = function () {
      let parentModal = btn.closest(".modal");
      closeModal(parentModal);
    };
  }
}

function openModal(modal) {
  modal.style.display = "block";
  window.addEventListener("click", function (event) {
    if (event.target == modal) {
      closeModal(modal);
    }
  });
}
function closeModal(modal) {
  modal.style.display = "none";
  removeEventListener("click", window);
}
/**
 *
 */
function activateMenuLinkAndBackButton() {
  const currentPath = window.location.pathname.split("/").pop();
  let currentPageRequiresBackButton = true;
  for (let pathName in menuLinks) {
    if (pathName == currentPath) {
      const menuLink = document.getElementById(menuLinks[pathName]);
      menuLink.classList.add("active");
      currentPageRequiresBackButton = false;
    }
  }
  if (currentPageRequiresBackButton) {
    enableBackButton();
    const headerLogo = document.getElementsByClassName("logo-wrapper")[0];
    headerLogo.classList.add("disappear-mobile");
    const menu = document.getElementsByClassName("sidebar")[0];
    menu.classList.add("disappear-mobile");
  }
}
/**
 *
 */
function showTabmenu() {
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
            if (storagePath != "profile/null" && storagePath != "profile/" && storagePath != "profile/undefined") {
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

export { loadPartial, openModal, closeModal, showTabmenu, lazyLoadImages };

import { enableBackButton, redirect, signOut } from "./utils.js";
import { getFile } from "./firebase/firestore.js";
import { checkUserAuthorization, getCurrentUserID, getCurrentUserRole } from "./firebase/authentication.js";
import { listenToNotifications } from "./notification.js";

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
  "tasks/create.html": "Create Favor",
  "tasks/elder-favor.html": "Favor Tracking",
  "tasks/accept.html": "Favor Details",
  "tasks/myfavr.html": "My Favor",
  "tasks/volunteer-favor.html": "My Favor",
  "updates.html": "Updates",
  "support.html": "Get Support",
  "chat.html": "Messages",
  "complete.html": "Favor Tracking",
  "cancel.html": "Favor Tracking",
};
const menuLinks = {
  "dashboard.html": "home-menu",
  "updates.html": "updates-menu",
  "history.html": "history-menu",
  "profile.html": "profile-menu",
};
/*
checkUserAuthorization()
  .then(() => loadCommonContent())
  .catch((error) => {
    redirect("403.html")
  });
  */
loadCommonContent();
/**
 * Loads the header, the menu and the footer
 */
async function loadCommonContent() {
  Promise.all([loadPartial("_header", "header"), loadPartial("_sidebar", "leftside-column"), loadPartial("_footer", "footer")])
    .then(() => {
      loadPageTitle();
      activateMenuLinkAndBackButton();
      return Notification.requestPermission();
    })
    .then((permission) => {
      if (permission == "granted") {
        listenToNotifications();
      }
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
    let targetElement = document.getElementById(destination);
    if (!targetElement) targetElement = document.getElementsByTagName(destination)[0];
    if (targetElement) {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });

      observer.observe(targetElement, { childList: true });

      // Create a temporary container to hold the fetched HTML
      const tempContainer = document.createElement("div");
      tempContainer.innerHTML = data;

      // Append the children of the temporary container to the target element
      while (tempContainer.firstChild) {
        targetElement.appendChild(tempContainer.firstChild);
      }
    } else {
      reject(`Could not load "../partials/${partial}.html. There is no element with the id or tag name "${destination}"`);
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

/**
 * Sorts the given task cards based on the provided date filter value.
 *
 * @param {string} dateFilterValue - The value of the date filter. It can be 'newest' or 'oldest'.
 * @param {NodeList} taskCards - The task cards to be sorted. Each task card is a DOM node.
 *
 * If the date filter value is 'newest', the task cards are sorted from newest to oldest.
 * If the date filter value is 'oldest', the task cards are sorted from oldest to newest.
 */
function sortTasksByDate(dateFilterValue, taskCards, target) {
  // Convert NodeList to Array
  let taskCardsArray = Array.from(taskCards);

  // Sort the array based on the date
  taskCardsArray.sort((a, b) => {
    let dateA = new Date(a.getAttribute("data-date"));
    let dateB = new Date(b.getAttribute("data-date"));

    // Check if dateA or dateB is invalid and sort accordingly
    if (isNaN(dateA)) return 1; // Place dateA at the end if invalid
    if (isNaN(dateB)) return -1; // Place dateB at the end if invalid

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
  taskCardsArray.forEach((card) => {
    target.appendChild(card);
  });
}

export { loadPartial, openModal, closeModal, showTabmenu, lazyLoadImages, sortTasksByDate };

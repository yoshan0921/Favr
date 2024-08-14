import { redirect } from "../utils.js";

import { auth } from "./firebase.js";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInAnonymously} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getDocument } from "./firestore.js";

/**
 * An object that maps a restricted page to its authorized user role.
 * Ex.: A volunteer shouldn't be able to access the page for task creation
 * even if they type the path to the page on the URL, because only elders
 * are authorized to access it
 */
const pagesWithRestrictedAccess = {
  "tasks/create.html": "elder",
  "tasks/elder-favor.html":"elder",
  "tasks/volunteer-favor.html":"volunteer"
};

/**
 * Creates user based on provided email and password
 * @param {string} email
 * @param {string} password
 * @returns  userCredential object containing user ID
 */
async function createUserWithEmail(email, password) {
  try {
    let userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Signed in
    return userCredential;
  } catch (error) {
    throw error;
  }
}

/**
 * Authenticates user based on the provided email and password
 * @param {string} email
 * @param {string} password
 * @returns userCredential object containing user ID
 */
async function authenticateUser(email, password) {
  try {
    let userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Signed in
    getCurrentUserID();
    await getCurrentUserRole();
    return userCredential;
  } catch (error) {
    throw error;
  }
}

/**
 * Checks if the user is authenticated or not
 *
 * @returns Promise
 */
async function monitorAuthenticationState() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Logged
        resolve(user);
      } else {
        // Not logged
        reject("Unauthenticated user");
      }
    });
  });
}

/**
 * Checks if the user is authenticated and has access to the current page
 */
async function checkUserAuthorization() {
  return new Promise((resolve, reject) => {
    monitorAuthenticationState()
      .then((user) => {
        if (user.uid) {
          console.log("Current user ID: " + user.uid);
          return getDocument("users", user.uid);
        }
      })
      .then((userInfo) => {
        if (userInfo) {
          let currentPath = window.location.pathname;
          for (let restrictedPage in pagesWithRestrictedAccess) {
            if (currentPath.endsWith(restrictedPage)) {
              if (pagesWithRestrictedAccess[restrictedPage] != userInfo.role) {
                throw new Error("Unauthorized access");
              }
              break;
            }
          }
        }
        resolve();
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
}
/**
 * Gets the ID of the user that is currently logged in. On the first time this function
 * is called, it gets this information from Firebase authentication, and add it to the local storage.
 * The next time this function is called, it should get this information from the local storage
 * instead.
 *
 * @returns a string containing the current user's ID
 */
function getCurrentUserID() {
  let currentUserID = localStorage.getItem("currentUserID");
  if (!currentUserID) {
    let user = auth.currentUser;
    if (user) {
      currentUserID = user.uid;
      localStorage.setItem("currentUserID", currentUserID);
    }
  }
  return currentUserID;
}
/**
 * Gets the role of the user that is currently logged in. On the first time this function
 * is called, it goes to the database, gets this information, and add it to the local storage.
 * The next time this function is called, it should get this information from the local storage
 * instead.
 *
 * @returns a string containing the current user's role
 */
async function getCurrentUserRole() {
  return new Promise((resolve, reject) => {
    let currentUserRole = localStorage.getItem("currentUserRole");
    if (!currentUserRole) {
      let currentUserID = localStorage.getItem("currentUserID");
      if (!currentUserID) currentUserID = getCurrentUserID();
      getDocument("users", currentUserID)
        .then((userInfo) => {
          currentUserRole = userInfo.role;
          localStorage.setItem("currentUserRole", currentUserRole);
          resolve(currentUserRole);
        })
        .catch((e) => reject(e));
    } else {
      resolve(currentUserRole);
    }
  });
}
/**
 * 
 * @param {*} role 
 */
function setCurrentUserRole(role){
    localStorage.setItem("currentUserRole", role);
}
/**
 * 
 * @returns 
 */
async function anonymousSignIn(){
  return new Promise((resolve, reject) => {
    signInAnonymously(auth)
    .then(() => {
      resolve();
    })
    .catch((error) => {
      reject(error);
    });
  })
}

export { createUserWithEmail, authenticateUser, monitorAuthenticationState, checkUserAuthorization, getCurrentUserID, getCurrentUserRole,anonymousSignIn, setCurrentUserRole };

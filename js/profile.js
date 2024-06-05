import {
    loadPartial
} from "./common.js"
import {
    getCurrentUserRole
} from "./firebase/authentication.js";
import { redirect } from "./utils.js";


/* -------------------------------------------------- */
/* On Load Event                                      */
/* -------------------------------------------------- */

window.addEventListener("load", function (event) {
  //Give "active" class to a tag under nav#sidebar based on the current html file name
  const filename = window.location.pathname.split("/").pop();
  if (filename === "profile.html") {
    document.getElementById("home-menu").classList.add("active");
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  console.log(document.readyState);
  runFunction();
}
/**
 * This adds an event listener to the page that triggers once everything is done downloading. 
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 * 
 */
async function runFunction() {
  getCurrentUserRole().then((currentUserRole)=>{
    //if(!currentUserRole || currentUserRole == "undefined") redirect("500.html");
    loadPartial(`task/createTask`,"profile-content");
    loadPartial(`profile/_${currentUserRole}Profile`,"profile-content");

  });
}
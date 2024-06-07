import { checkUserAuthorization } from "../firebase/authentication.js";
import { signOut } from "../utils.js";

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 *
 * Commented by Yosuke on 2 June 2024:
 * Due to async, it seems that some times the DOMContentLoaded event is not triggered.
 * So, check the readyState of the document if it's alreadt "complete" to run the code.
 */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  console.log(document.readyState);
  runFunction();
}

function runFunction() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut();
  });
}

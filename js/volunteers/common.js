import { checkUserAuthorization } from "../firebase/authentication.js";
import { signOut } from "../utils.js";
import { getAll, deleteDocument, updateDocument, createDocument } from "../firebase/firestore.js";
import { createMapView } from "../map.js";

checkUserAuthorization();

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
  /**
   * Open and close sidebar
   */
  const check = document.getElementById("check");
  if (check) {
    check.addEventListener("click", () => {
      if (check.checked) {
        localStorage.setItem("sidebar", "checked");
      } else {
        localStorage.removeItem("sidebar");
      }
    });
  }
}

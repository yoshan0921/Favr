import { signOut } from "./utils.js";

/* -------------------------------------------------- */
/* Side Bar Menu                                      */
/* -------------------------------------------------- */
window.addEventListener("load", async function (event) {
    await loadCommonContent();
    // Open and close sidebar
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
})

/**
 * 
 */
async function loadCommonContent(){
    await loadPartial("_sidebar","leftside-column");

    //adding event listener to dynamically loaded logout button
    document.addEventListener("click", function(e){
      const target = e.target.closest("#logoutBtn"); // Or any other selector.
      if(target){
        signOut();
      }
    });
}

/**
 * 
 * @param {string} partial - the name of the partial file (without .html)
 * @param {string} destination - the unique id of the HTML element where the partial will be loaded
 */
async function loadPartial(partial,destination){
    fetch(`../partials/${partial}.html`)
    .then((response) => response.text())
    .then((data) => document.getElementById(destination).outerHTML = data);
}
export {
    loadPartial
}
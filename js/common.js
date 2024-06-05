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

async function loadCommonContent(){
    await loadPartial("_sidebar","leftside-column");
    const logoutBtn = document.getElementById("logoutBtn");

    if(logoutBtn)logoutBtn.addEventListener("click",signOut);
}

async function loadPartial(partial,destination){
    fetch(`../partials/${partial}.html`)
    .then((response) => response.text())
    .then((data) => document.getElementById(destination).outerHTML = data);
}
export {
    loadPartial
}
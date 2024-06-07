import { signOut } from "./utils.js";
let pageTitles = {
  "dashboard.html": "Dashboard",
  "tasks/create.html": "Request favor",
  "profile.html": "Profile",
  "updates.html": "Updates",
}

loadCommonContent();

/**
 * 
 */
async function loadCommonContent(){
    loadPartial("_header","header").then(()=>{
      loadPageTitle(window.location.pathname);
    });
    await loadPartial("_sidebar","leftside-column");
    const backButton = document.getElementById("backBtn");
    if(backButton) backButton.addEventListener("click",(e)=>{window.history.back()});

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
    return fetch(`../partials/${partial}.html`)
    .then((response) => response.text())
    .then((data) => document.getElementById(destination).innerHTML = data);
}
/**
 * 
 * @param {string} path 
 */
function loadPageTitle(path){
  document.addEventListener("readystatechange",()=>{
    if(document.readyState === "complete"){
      let title = "";
      console.log(path);
      for(let pathEnding in pageTitles){
        if(path.endsWith(pathEnding)){
          title = pageTitles[pathEnding];
        }
      }
      const pageTitle = document.getElementById("page-title");
      pageTitle.innerText = title;
    }
  })
}
export {
    loadPartial
}
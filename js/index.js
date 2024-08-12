import {
    resetLocalStorage,
    installServiceWorkers
} from "./utils.js";

resetLocalStorage();
installServiceWorkers();

/**
 * This adds an event listener to the page that triggers once everything is done downloading. 
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 * 
 */
document.addEventListener('DOMContentLoaded', function() {
   const menu = document.getElementById("menu");
   const toggleMenuBtn = document.getElementById("toggleMenuBtn");

   toggleMenuBtn.addEventListener("click",()=>{
    menu.classList.toggle("show");
   })
});
import {
    auth
} from "./firebase/firebase.js";

let localStorageItems = [
    "currentUserID",
    "currentUserRole"
]
/**
 * Redirects to the page specified on the path
 * @param {String} path - path to the requested page
 */
function redirect(path){
    window.location.pathname = path;
}
/**
 * Self-explanatory
 */
function signOut(){
    auth.signOut().then(() => {
        // Sign-out successful.
        redirect("/index.html");
      }).catch((error) => {
        // An error happened.
        console.log("Error while trying to logout")
      });
}
/**
 * Function that will display an error message for the user.
 * Every page that might throw an error should call this function
 * 
 * Obs.: In the future it should be rewritten to trigger a
 * visual response (i.e a modal or redirect to an error page)
 * 
 * @param {Error} error object
 */
function handleError(error){
    console.log(error);
}

function resetLocalStorage(){
    for(let item of localStorageItems){
        window.localStorage.removeItem(item);
    }
}
function enableBackButton(){
    const backBtn = document.getElementsByClassName("back-btn-wrapper")[0];
    if(backBtn) {
        backBtn.style.display = "flex";
        backBtn.addEventListener("click", (e) => {
            window.history.back();
        });
    }

}
export {
    signOut,
    redirect,
    handleError,
    resetLocalStorage,
    enableBackButton
}
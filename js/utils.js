import {
    auth
} from "./firebase/firebase.js";

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
        redirect("index.html");
      }).catch((error) => {
        // An error happened.
        console.log("Error while trying to logout")
      });
}
export {
    signOut,
    redirect
}
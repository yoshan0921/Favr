import {
    auth
} from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

/**
 * Creates user based on provided email and password
 * @param {string} email 
 * @param {string} password 
 * @returns  userCredential object containing user ID
 */
async function createUserWithEmail(email,password){
    try{
        let userCredential = await createUserWithEmailAndPassword(auth, email,password)
        // Signed in
        return userCredential;
    }catch(error){
        throw error;
    }
}

/**
 * Authenticates user based on the provided email and password
 * @param {string} email 
 * @param {string} password 
 * @returns userCredential object containing user ID
 */
async function authenticateUser(email,password){
    try{
        let userCredential = await signInWithEmailAndPassword(auth, email,password)
        // Signed in
        return userCredential;
    }catch(error){
        throw error;
    }
}

/**
 * Checks if the user is authenticated or not
 * @returns 
 */
async function monitorAuthenticationState() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Logged
                resolve(user);
            } else {
                // Not logged
                reject((window.location.pathname = "403.html"));
            }
        })
    });
}

/**
 * Checks if the user is authenticated and has permission to view the current page
 */
async function checkUserAuthorization(){
    monitorAuthenticationState()
    .then((result)=>{
        console.log(result);
    });
    /*
        TODO: check if the user has authorization to see the page based 
        on their role (ex.: redirecting to 403.html if they are a volunteer
            trying to access and elder interface)
        )
    */
}
export {
    createUserWithEmail,
    authenticateUser,
    monitorAuthenticationState,
    checkUserAuthorization
}
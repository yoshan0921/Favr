import { redirect } from "../utils.js";
import {
    auth
} from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDocument } from "./firestore.js";

let currentUserID = null;
let currentUserRole = null;
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
        getCurrentUserID();
        getCurrentUserRole();
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
                reject((redirect("/403.html")));
            }
        })
    });
}

/**
 * Checks if the user is authenticated and has permission to view the current page
 */
async function checkUserAuthorization(){
    monitorAuthenticationState()
    .then((user)=>{
        if(user.uid) currentUserID = user.uid;
        console.log("Current user ID: "+ currentUserID);
        return getDocument("users",currentUserID);
    })
    .then((userInfo)=>{
        console.log(userInfo);
        if(userInfo){
            let currentUserRole = userInfo.role;
            let currentPathName = window.location.pathname;
            if((currentUserRole == "elder" && currentPathName.includes("volunteer"))
                ||(currentUserRole == "volunteer" && currentPathName.includes("elder")) ){
                throw new Error("User unauthorized to view page");
            }
        }
    })
    .catch((error)=>{
        console.log(error);
        redirect("/403.html");
    });
}
function getCurrentUserID(){
    if(currentUserID){
        let user = auth.currentUser;
        if(user){
            currentUserID = user.uid;
        }
    }
    return currentUserID;
}
function getCurrentUserRole(){
    try{
        if(!currentUserID) getCurrentUserID();
        getDocument("users",currentUserID)
        .then((userInfo)=>{
            currentUserRole = userInfo.role;
            return currentUserRole
        }
        )
    }catch(error){
        console.log(error);
    }
}
export {
    createUserWithEmail,
    authenticateUser,
    monitorAuthenticationState,
    checkUserAuthorization,
    getCurrentUserID,
    getCurrentUserRole,
    currentUserID,
    currentUserRole
}
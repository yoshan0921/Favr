import {
    checkUserAuthorization
} from "../firebase/authentication.js";
import { signOut } from "../utils.js";

checkUserAuthorization();

document.addEventListener("DOMContentLoaded",(e)=>{
    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn.addEventListener("click",signOut);
})
import { loadPartial } from "./common.js";
import { getCurrentUserID } from "./firebase/authentication.js";
import { database } from "./firebase/firebase.js";
import { ref, child, query, push, get, onChildAdded, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUserID = getCurrentUserID();

function listenToNotifications(){
    onChildAdded(ref(database, currentUserID), async function (data) {
        const v = data.val();
        await loadPartial("_notification", "body");
        console.log(v);
        const notificationCard = document.getElementById("notificationCard");
        const notificationLink = document.querySelector(".notification a");
        const notificationIcon = document.querySelector(".notification #notificationIcon");
        const notificationTitle = document.querySelector(".notification a h2");
        const notificationText = document.querySelector(".notification a p");
        notificationLink.setAttribute("href", v.link)
        if(v.icon && v.icon !== "#") notificationIcon.setAttribute("src",v.icon);
        notificationTitle.innerText = v.title;
        notificationText.innerText = v.message;
        notificationCard.classList.add("show");
        const notificationCloseButton = document.getElementsByClassName("closeNotificationModal")[0];
        notificationCloseButton.addEventListener("click",()=>{
            notificationCard.classList.remove("show");
            document.getElementsByTagName("body")[0].removeChild(notificationCard);
        })
    });
}
function sendNotification(data,receiverID){
    push(ref(database, receiverID), {
        title: data.title,
        message: data.message
    }).catch((error) => {
        console.error("Failed to save data:", error);
    });
}
function loadAllNotifications(){

}
export {
    listenToNotifications,
    sendNotification,
    loadAllNotifications
}

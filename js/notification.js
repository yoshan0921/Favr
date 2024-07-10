import { loadPartial } from "./common.js";
import { getCurrentUserID } from "./firebase/authentication.js";
import { database } from "./firebase/firebase.js";
import { ref, push, onChildAdded, update, onValue,orderByKey } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUserID = getCurrentUserID();

/**
 * A function that will listen to any updates on the realtime database.
 * More especifically, it will listen to updates for the current user.
 * When a new update is detected, it will display a notification for the user.
 * OnChildAdded actually will be called for every document under the user's
 * collection, even if they are not new. To avoid displaying notifications for
 * old updates, the notification document has a isNew field
 */
function listenToNotifications(){
    onChildAdded(ref(database, currentUserID), async function (data) {
        const v = data.val();
        if(v.isNew){
            const updatesMenu = document.querySelector("#updates-menu .icon-wrapper");
            const chatMenu = document.querySelector("header .chat-icon-wrapper .icon-wrapper");
            if(v.isMessage){
                if(v.isMessage && !chatMenu.classList.contains("has-updates")){
                    chatMenu.classList.add("has-updates");
                }  
            }else{
                if(!updatesMenu.classList.contains("has-updates")) {
                    updatesMenu.classList.add("has-updates");
                }
            }

            if(!v.wasSent && !alreadyOnChatPage(v)){
                await loadPartial("_notification", "body");
                const notificationCard = document.getElementById("notificationCard");
                const notificationLink = document.querySelector(".notification a");
                const notificationIcon = document.querySelector(".notification #notificationIcon");
                const notificationTitle = document.querySelector(".notification a .title");
                const notificationText = document.querySelector(".notification a .message");
                notificationLink.href = v.link;
                if(v.icon && v.icon !== "#") notificationIcon.setAttribute("src",v.icon);
                notificationTitle.innerText = v.title;
                notificationText.innerText = v.message
                setTimeout(()=>{
                    let notificationSound = new Audio("../assets/notification.mp3");
                    notificationSound.play();
                    notificationCard.classList.add("show");
                    setTimeout(()=>{
                        notificationCard.classList.remove("show");
                        setTimeout(()=>document.body.removeChild(notificationCard),1000);
                    },
                    5000)
                }
                ,500)
                
                const notificationCloseButton = document.getElementsByClassName("closeNotificationModal")[0];
                notificationCloseButton.addEventListener("click",()=>{
                    notificationCard.classList.remove("show");
                    setTimeout(()=>document.body.removeChild(notificationCard),1000);
                    
                })
                const updateObj = {};
                v.wasSent = true;
                updateObj[`/${getCurrentUserID()}/${v.id}`] = v;
                update(ref(database),updateObj);
            }
        }
    });
}
/**
 * Adds a new update to the realtime database. This will trigger listenToNotifications() on the recipient user
 * 
 * @param {Object} data - an object that contains the info about the update. The data object is can have these fields:
 *  - title (string)
 *  - message (string)
 *  - icon (url to an image)
 *  - link (url to somewhere in the app)
 *  - isMessage (boolean) - set to true if the notification is from a new direct message (chat)
 *
 * If any of these are missing from the object, this function will use a default value for them
 * 
 * @param {string} receiverID - the ID of the user that will receive the notification
 */
async function sendNotification(data,receiverID){
    const notificationObj = {
        id: "",
        title: (data.title) ? data.title : "New update",
        message: (data.message) ? data.message : "You received a new update",
        icon: (data.icon) ? data.icon : "../assets/icons/icon-128x128.png",
        link: (data.link) ? data.link : "#",
        isMessage: (data.isMessage) ? data.isMessage : false,
        time: (new Date()).toLocaleDateString(),
        isNew: true,
        wasSent: false
    }
    const notificationID = push(ref(database, receiverID)).key;
    const updateObj = {};
    notificationObj.id = notificationID;
    updateObj[`/${receiverID}/${notificationID}`] = notificationObj;
    update(ref(database),updateObj);
}

/**
 * Updates the notification status from new to not new (should be called when the notification is clicked on)
 * 
 * @param {string} receiverID - the user under which this notification is stored on the realtime database
 * @param {Object} notification - an object containing the notification (it should have ALL the expected fields for a notification, as in lines 65-73 of this file)
 */
function updateNotificationStatus(receiverID, notification){
    if(notification.isNew){
        const updateObj = {};
        notification.isNew = false;
        updateObj[`/${receiverID}/${notification.id}`] = notification;
        update(ref(database),updateObj);
    }
}

/**
 * Check if the notification is from a new message and if the user is already on the chat page
 * @param {Object} notification 
 * @returns boolean value
 */
function alreadyOnChatPage(notification){
    if(window.location.pathname.includes("chat.html") && notification.isMessage){
        return true;
    }
    return false;
}
export {
    listenToNotifications,
    sendNotification,
    updateNotificationStatus
}

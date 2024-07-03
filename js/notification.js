import { loadPartial } from "./common.js";
import { getCurrentUserID } from "./firebase/authentication.js";
import { database } from "./firebase/firebase.js";
import { ref, push, onChildAdded, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUserID = getCurrentUserID();

/**
 * 
 */
function listenToNotifications(){
    onChildAdded(ref(database, currentUserID), async function (data) {
        const v = data.val();
        if(v.isNew){
            const updatesMenu = document.querySelector("#updates-menu .icon-wrapper");
            const chatMenu = document.querySelector("header .chat-icon-wrapper .icon-wrapper");
            if(!updatesMenu.classList.contains("has-updates")) updatesMenu.classList.add("has-updates");
            if(v.isMessage && !chatMenu.classList.contains("has-updates")) chatMenu.classList.add("has-updates");
            if(!v.wasSent){
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
                notificationCard.classList.add("show");
                const notificationCloseButton = document.getElementsByClassName("closeNotificationModal")[0];
                notificationCloseButton.addEventListener("click",()=>{
                    notificationCard.classList.remove("show");
                    document.body.removeChild(notificationCard);
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
 * 
 * @param {*} data 
 * @param {*} receiverID 
 */
async function sendNotification(data,receiverID){
    const notificationObj = {
        id: "",
        title: data.title,
        message: data.message,
        icon: (data.icon) ? data.icon : "../assets/icons/icon-128x128.png",
        link: (data.link) ? data.link : "#",
        isMessage: (data.isMessage) ? data.isMessage : false,
        time: (new Date()).toLocaleString(),
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
 * 
 * @param {*} userID 
 * @returns 
 */
async function loadAllNotifications(userID){
    return new Promise(async (resolve)=>{
        let result = [];
        await onChildAdded(ref(database, userID), function (data){
            result.push(data.val());
        });
        resolve(result);
    })
}
/**
 * 
 * @param {*} receiverID 
 * @param {*} notification 
 */
function updateNotificationStatus(receiverID, notification){
    const updateObj = {};
    notification.isNew = false;
    updateObj[`/${receiverID}/${notification.id}`] = notification;
    update(ref(database),updateObj);
}
export {
    listenToNotifications,
    sendNotification,
    loadAllNotifications,
    updateNotificationStatus
}

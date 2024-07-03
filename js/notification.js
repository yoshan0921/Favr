import { loadPartial } from "./common.js";
import { getCurrentUserID } from "./firebase/authentication.js";
import { database } from "./firebase/firebase.js";
import { ref, child, query, push, get, onChildAdded, onValue, orderByKey, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUserID = getCurrentUserID();

function listenToNotifications(){
    onChildAdded(ref(database, currentUserID), async function (data) {
        const v = data.val();
        console.log(v);
        if(v.isNew){
            const updatesMenu = document.querySelector("#updates-menu");
            updatesMenu.classList.add("has-updates");
            if(!v.wasSent){
                await loadPartial("_notification", "body");
                const notificationCard = document.getElementById("notificationCard");
                const notificationLink = document.querySelector(".notification a");
                const notificationIcon = document.querySelector(".notification #notificationIcon");
                const notificationTitle = document.querySelector(".notification a h2");
                const notificationText = document.querySelector(".notification a p");
                notificationLink.href = v.link;
                if(v.icon && v.icon !== "#") notificationIcon.setAttribute("src",v.icon);
                notificationTitle.innerText = v.title;
                notificationText.innerText = v.message;
                notificationCard.classList.add("show");
                const notificationCloseButton = document.getElementsByClassName("closeNotificationModal")[0];
                notificationCloseButton.addEventListener("click",()=>{
                    notificationCard.classList.remove("show");
                    document.body.removeChild(notificationCard);
                })
                const updateObj = {};
                v.wasSent = true;
                updateObj[`/${currentUserID}/${v.notificationID}`] = v;
                update(ref(database),updateObj);
            }
        }
    });
}
async function sendNotification(data,receiverID){
    const notificationObj = {
        id: "",
        title: data.title,
        message: data.message,
        icon: data.icon,
        link: data.link,
        time: new Date(),
        isNew: true,
        wasSent: false
    }
    const notificationID = push(child(ref(database), receiverID)).key;
    notificationObj["id"] = notificationID;
    const updateObj = {};
    updateObj[`/${receiverID}/${notificationID}`] = notificationObj;
    update(ref(database),updateObj);
}
function loadAllNotifications(userID){
    onValue(ref(database, userID), (snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const childKey = childSnapshot.key;
          const childData = childSnapshot.val();
          console.log(childKey, childData);
          // ...
        });
        return snapshot;
      }, {
        onlyOnce: true
      });
}
export {
    listenToNotifications,
    sendNotification,
    loadAllNotifications
}

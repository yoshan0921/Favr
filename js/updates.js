import { getCurrentUserID } from "./firebase/authentication"
import { loadAllNotifications } from "./notification.js";

document.addEventListener("DOMContentLoaded",async ()=>{
    var notifications = await loadAllNotifications(getCurrentUserID());
    notifications.then((snapshot)=>{
        const updatesList = document.getElementById("updates");
        updatesList.innerHTML = "";
        snapshot.forEach((notification)=>{
            const card = document.createElement("a");
            card.href = notification.link;
            const notificationIcon = document.createElement("div");
            notificationIcon.classList.add("icon-wrapper");
            notificationIcon.innerHTML = `
                <img src="${notification.icon}" alt="Notification icon">
            `;
            const notificationContent = document.createElement("div");
            notificationContent.classList.add("notification-content");
            notificationContent.innerHTML = `
            <h2 class="notification-title">${notification.title}/h2>
            <span class="notification-time">${notification.time}</span>
            <p class="notification-text">${notification.message}</p>`;

            card.appendChild(notificationIcon)
            card.appendChild(notificationContent);

            if(notification.isNew == true){
                card.classList.add("new");
            }
            updatesList.appendChild(card);
        })
    })
    notifications.catch(e=>console.log(e));
})
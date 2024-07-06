import { getCurrentUserID, monitorAuthenticationState } from "./firebase/authentication.js"
import { updateNotificationStatus } from "./notification.js";
import { database } from "./firebase/firebase.js";
import { ref, child, query, push, get, onChildAdded, onValue, orderByKey, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { redirect } from "./utils.js";

window.addEventListener("load", function (event) {
    // Check if the user is logged in
    monitorAuthenticationState();
});
  
  /**
   * Memo:
   * runFunction(); should be called when DOMContentLoaded event is triggered
   * However, there is a case DOMContentLoaded is not triggered.
   * That is why we need to check the readyState of the document.
   */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runFunction);
  } else {
    runFunction();
  }
  
  /**
   * This adds an event listener to the page that triggers once everything is done downloading.
   * This is to prevent the code from trying to access an element from the page before it was
   * rendered there.
   */
  async function runFunction() {
    const updatesList = document.getElementById("updates");
    onValue(ref(database, getCurrentUserID()), (snapshot) => {
      let sortedArray = [];
      if(snapshot.length>0) updatesList.innerHTML = "";
      snapshot.forEach((notification) => {
        sortedArray.push(notification.val());
    });
      sortedArray = sortedArray.sort((a,b)=>{
          if(a.time > b.time) return 1;
          if(a.time < b.time) return -1;
          return 0;
      });
      sortedArray.forEach((notification)=>{
        const card = document.createElement("div");
        card.setAttribute("href",notification.link);
        card.classList.add("update");
        const notificationIcon = document.createElement("div");
        notificationIcon.classList.add("icon-wrapper");
        notificationIcon.innerHTML = `
            <img src="${notification.icon}" alt="Notification icon">
        `;
        const notificationContent = document.createElement("div");
        notificationContent.classList.add("notification-content");
        notificationContent.innerHTML = `
        <h2 class="notification-title">${notification.title}</h2>
        <p class="notification-text">${notification.message}</p>
        <span class="notification-time">${notification.time}</span>
        <a id="link-${notification.id}" href="${notification.link} class="visually-hidden"></a>
        `;

        card.appendChild(notificationIcon)
        card.appendChild(notificationContent);

        if(notification.isNew == true){
            card.classList.add("new");
        }
        updatesList.appendChild(card);
        console.log(notification.link);
        card.addEventListener("click",e=>{
            updateNotificationStatus(getCurrentUserID(), notification);
            document.getElementById(`link-${notification.id}`).click();
        })
      })
    }, {
      onlyOnce: true
    });
  }
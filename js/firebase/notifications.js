import { messaging } from "../firebase/firebase.js";
import { getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { getDocument, updateDocument } from "./firestore.js";
import { getCurrentUserID } from "./authentication.js";

const VAPID_KEY = 'BAa_0mfBX5XyXGJdq6hgYXnQBZEXGgcy1EQYLHjSTr0e-2QI8ztPWMMq0ureDp8Rlvle3kYg_JmMnVw6X-byaLU';
const API_KEY = 'AIzaSyA98KYP3hvGX8q7uk1WNdEStxMo1S85HmA';

async function sendTokenToDB(done) {
    getToken(messaging, {
        vapidKey: VAPID_KEY
    }).then(async (currentToken) => {
        if (currentToken) {
            console.log('current token for client: ', currentToken);
            const currentUser = await getDocument("users", getCurrentUserID());
            if(currentUser.notificationsSubscription){
                if(!currentUser.notificationsSubscription.includes(currentToken)){
                    currentUser.notificationsSubscription.push(currentToken);
                }
            }else{
                currentUser.notificationsSubscription = [currentToken];
            }
            updateDocument("users", getCurrentUserID(), currentUser);

            // Track the token -> client mapping, by sending to backend server
            // show on the UI that permission is secured
            // ... add you logic to send token to server
        }
    }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
        // catch error while creating client token
    });
}
/**
 * 
 * @param {Object} notification - notification obj should look like:
 * {
        title: "Message Title",
        body: "Message body",
        icon: "/img/icon.png",
        link_url: "http://localhost:5001"
    }
 */
async function onNotification(notification) {
    return new Promise((resolve, reject) => {
        const { title, link_url, ...options } = notification;
        notification_options.data.link_url = link_url;

        if ('serviceWorker' in navigator) {
        // this will register the service worker or update it. More on service worker soon
            navigator.serviceWorker.register('../../firebase-messaging-sw.js', { scope: '../../' })
            .then(function (registration) {
                console.log("Service Worker Registered");
                setTimeout(() => {
                    // display the notificaiton
                    registration.showNotification(title, { ...notification_options, ...options })
                    .then(done => {
                        console.log(done);
                        //const audio = new Audio("./util/sound/one_soft_knock.mp3"); // only works on windows chrome
                        //audio.play();
                        registration.update();
                        resolve(`Sent notification to user: ${title}`);
                    })
                    .catch(err => {
                        reject(`Error sending notification to user: ${err}`);
                    });
                    //registration.update();
                }, 100);
            }).catch(function (err) {
                reject(`Service Worker Failed to Register: ${err}`);
            });
        }else{
            reject("No service worker");
        }
    })
}
async function getMessagingToken(){
    return new Promise((reject,resolve), ()=> {
        getToken(messaging, { vapidKey: VAPID_KEY})
        .then((currentToken) => {
            if (currentToken) {
            // Send the token to your server and update the UI if necessary
            // ...
                resolve(currentToken);
            } else {
            // Show permission request UI

            reject('No registration token available. Request permission to generate one.');
            }
        })
        .catch((err) => {
            reject('An error occurred while retrieving token.');
        })
    });
}

async function checkUserPushSubscription(){
    return new Promise((resolve, reject)=>{
        navigator.serviceWorker.ready.then(reg=>{
            reg.pushManager.getSubscription().then(sub=>{
                if(sub == undefined){
                    reject("User is not subscribed for push notifications");
                }else{
                    resolve(sub);
                }
            })
        })
    })
}
function requestNotificationPermission(){
    if("Notification" in window){
        if(Notification.permission !== "granted") {
            Notification.requestPermission()
            .then((permission) => {
                // If the user accepts, create a token and send to server
                console.log(permission);
                if (permission === "granted") {
                    navigator.serviceWorker.getRegistration()
                    .then(reg => {
                        reg.pushManager.subscribe({
                            userVisibleOnly: true
                        })
                        .then(sub => {
                            console.log(sub.toJSON());
                            return [sub, getDocument("users", getCurrentUserID())];
                        })
                        .then(response => {
                            let sub = response[0];
                            let user = response[1];
                            user.notificationSubscriptions.push(sub);
                            return updateDocument("users", getCurrentUserID(), user);
                        })
                        .catch((error)=>console.log(error));
                    })
                    
                    sendTokenToDB(done => {
                        if (done) {
                            onNotification({ title: "Successful", body: "Your device has been registered", tag: "welcome" });
                        }
                    });
                    
                } else {
                    alert("You won't be able to receive important notifications 😥!");
                }
          });
        }
    }
}
function registerUserFCM() {
    if (!("Notification" in window)) {
        // Check if the browser supports notifications
        console.log("Browser does not support notifications");
    } else if (Notification.permission === "granted") {
        // Check whether notification permissions have already been granted;
        // if so, create a token for that user and send to server
        sendTokenToDB(done => {
            console.log("done sending token to db", done);
            if (done) {
                onNotification({ title: "Successful", body: "Your device has been registered", tag: "welcome" });
            }
        });
    } else {//if (Notification.permission !== "denied") {
        // We need to ask the user for permission
        Notification.requestPermission().then((permission) => {
            // If the user accepts, create a token and send to server
            if (permission === "granted") {
                sendTokenToDB(done => {
                    console.log("done sending token to db", done);
                    if (done) {
                        onNotification({ title: "Successful", body: "Your device has been register", tag: "welcome" });
                    }
                });
            } else {
                alert("You won't be able to receive important notifications 😥!");
            }
        });
    }
}

async function sendNotification(receiverID, message){
    const receiver = await getDocument("users", receiverID);
    for(let token of receiver.notificationsSubscription){
        message["to"] = token;
        messaging.send(message)
        .then((response) => {
          // Response is a message ID string.
          console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          });
      }
}

export {
    getMessagingToken,
    sendTokenToDB,
    registerUserFCM,
    checkUserPushSubscription,
    requestNotificationPermission,
    sendNotification
}
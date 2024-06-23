self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
self.importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const API_KEY = 'AIzaSyA98KYP3hvGX8q7uk1WNdEStxMo1S85HmA';
const VAPID_KEY = "BAa_0mfBX5XyXGJdq6hgYXnQBZEXGgcy1EQYLHjSTr0e-2QI8ztPWMMq0ureDp8Rlvle3kYg_JmMnVw6X-byaLU";
var user_subscription = {};

const firebaseConfig = {
    apiKey: "AIzaSyA98KYP3hvGX8q7uk1WNdEStxMo1S85HmA",
    authDomain: "integrated-project-pwa.firebaseapp.com",
    projectId: "integrated-project-pwa",
    storageBucket: "integrated-project-pwa.appspot.com",
    messagingSenderId: "773054560330",
    appId: "1:773054560330:web:49b001fd6ab030f08c4eb3",
    measurementId: "G-BWXW6C61EP"
  };

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();
const firestore = firebase.firestore();

async function getDocument(id){
    const documentReference = doc(firestore, `users/${id}`);
    try {
        const docSnap = await getDoc(documentReference);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.log(error);
        return null
    }
}
function setDocument(object, id){
    try {
        const documentReference = doc(firestore, "users", id);
        return setDoc(documentReference, object);
    } catch (error) {
        console.log(error);
    }
}

self.addEventListener("fetch", (e)=>{

})
self.addEventListener("activate", async (e)=>{
    self.registration.pushManager.subscribe({
        userVisibleOnly : true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
    })
    .then(subscription =>{
        user_subscription = subscription;
        const userID = window.localStorage.getItem("currentUserID");
        const user = getDocument(userID);
        console.log(user);
        console.log(`Subscription saved by service worker!`);
        console.log(subscription);
    })
    .catch((error)=>console.log(error));
})
self.addEventListener("push", event => {
    const title = event.data.text();
    self.registration.showNotification(title);
})

async function onNotification(notification) {
    return new Promise((resolve, reject) => {
        const { title, link_url, ...options } = notification;
        notification_options.data.link_url = link_url;

        if ('serviceWorker' in navigator) {
        // this will register the service worker or update it. More on service worker soon
            navigator.serviceWorker.register('./firebase-messaging-sw.js', { scope: './' }).then(function (registration) {
                console.log("Service Worker Registered");
                setTimeout(() => {
                    // display the notificaiton
                    self.registration.showNotification(title, { ...notification_options, ...options }).then(done => {
                        console.log("sent notification to user");
                        //const audio = new Audio("./util/sound/one_soft_knock.mp3"); // only works on windows chrome
                        //audio.play();
                        resolve("notification sent");
                    }).catch(err => {
                        console.error("Error sending notification to user", err);
                        reject(err);
                    });
                    registration.update();
                }, 100);
            }).catch(function (err) {
                console.log("Service Worker Failed to Register", err);
            });
        }else{
            console.log("No service worker");
        }
    })
}

messaging.getToken( { vapidKey: VAPID_KEY}) //'AIzaSyA98KYP3hvGX8q7uk1WNdEStxMo1S85HmA'
.then((currentToken) => { return new Promise((resolve,reject)), ()=> {
    if (currentToken) {
        resolve(currentToken);
    } else {
        reject('No registration token available. Request permission to generate one.');
    }
}})
.catch((err) => {
    console.log('An error occurred while retrieving token.');
})
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = 'Background Message Title';
    const notificationOptions = {
        body: 'Background Message body.',
    };

    self.registration.showNotification(notificationTitle,
        notificationOptions);
    });

messaging.onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    const theNotification = payload.data

    if (Notification.permission === "granted") {
        console.log("nofitications granted");
        onNotification(theNotification);
    }
})
function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for(let i = 0; i < rawData.length; ++i){
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
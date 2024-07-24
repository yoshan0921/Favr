const CACHE_NAME = "favr_cache";
const CACHE_ASSETS = [
    //pages
    'dashboard.html',
    'profile.html',
    //partials
    '/partials/dashboard/_elderDashboard.html',
    '/partials/dashboard/_volunteerDashboard.html',
    '/partials/_header.html',
    '/partials/_sidebar.html',
    '/partials/_footer.html',
    //css
    '/css/styles.css',
    '/css/dashboard.css',
    '/css/profile.css',
    '/css/error.css',
    //js
    '/js/dashboard.js',
    '/js/common.js',
    '/js/profile.js',
    '/js/utils.js',
    '/js/firebase/authentication.js',
    '/js/firebase/firebase.js',
    '/js/firebase/firestore.js',
    //assets
    '/assets/images/offline.svg'

]

const OFFLINE_PAGE = "offline.html";

self.addEventListener('install', event => {
    console.log('Service worker installed');

    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Service worker: caching files');
            cache.addAll(CACHE_ASSETS);
            cache.add(OFFLINE_PAGE);
        })
    )
})

self.addEventListener('activate', event => {
    console.log('Service worker activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if(cache !== CACHE_NAME){
                        console.log('Service worker: Deleting old caches');
                        caches.delete(cache);
                    }
                })
            )
        })
    )
})
self.addEventListener('fetch', event => {
    // Fires whenever the app requests a resource (file or data)  normally this is where the service worker would check to see
    // if the requested resource is in the local cache before going to the server to get it. 
    //console.log(`[SW] Fetch event for ${event.request.url}`);
    event.respondWith(
        fetch(event.request)
        .catch(()=> {
            if(event.request.mode === 'navigate'){
                return caches.match(OFFLINE_PAGE);
            }else{
                return caches.match(event.request);
            }
        })
    )
});
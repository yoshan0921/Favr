
self.addEventListener('fetch', event => {
    // Fires whenever the app requests a resource (file or data)  normally this is where the service worker would check to see
    // if the requested resource is in the local cache before going to the server to get it. 
    console.log(`[SW] Fetch event for ${event.request.url}`);

});
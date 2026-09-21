// Remove the previous worker's clinical response cache on upgrade. This is a
// disposable browser cache, not the clinic database or consultation drafts.
self.addEventListener('activate', event => {
    event.waitUntil(caches.delete('firestore-cache'));
});

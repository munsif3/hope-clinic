import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, memoryLocalCache, connectFirestoreEmulator } from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Explicit local-only demo mode. A production build can never enable emulators.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
const app = initializeApp(useEmulators
    ? { projectId: 'demo-hope-clinic', apiKey: 'demo-key', authDomain: 'localhost' }
    : firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    localCache: useEmulators ? memoryLocalCache() : persistentLocalCache()
});



if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
export default app;

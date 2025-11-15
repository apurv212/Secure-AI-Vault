import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const CONFIG_ENDPOINT = `${API_URL}/config/firebase`;

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  googleProvider: GoogleAuthProvider;
};

let firebasePromise: Promise<FirebaseServices> | null = null;

const loadFirebaseServices = async (): Promise<FirebaseServices> => {
  if (!firebasePromise) {
    firebasePromise = fetch(CONFIG_ENDPOINT, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load Firebase configuration');
        }

        const config = await response.json();
        const app = initializeApp(config);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);
        const googleProvider = new GoogleAuthProvider();

        return { app, auth, db, storage, googleProvider };
      })
      .catch((error) => {
        firebasePromise = null;
        throw error;
      });
  }

  return firebasePromise;
};

export const getFirebaseApp = async () => (await loadFirebaseServices()).app;
export const getAuthInstance = async () => (await loadFirebaseServices()).auth;
export const getFirestoreInstance = async () => (await loadFirebaseServices()).db;
export const getStorageInstance = async () => (await loadFirebaseServices()).storage;
export const getGoogleProvider = async () => (await loadFirebaseServices()).googleProvider;




import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN9W1jPK849ZXprBLHMbWeHn18Z1ol0f8",
  authDomain: "hisabbook-c5996.firebaseapp.com",
  projectId: "hisabbook-c5996",
  storageBucket: "hisabbook-c5996.appspot.com",
  messagingSenderId: "37493519736",
  appId: "1:37493519736:android:6f0874e49767371beac48d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { db, auth };

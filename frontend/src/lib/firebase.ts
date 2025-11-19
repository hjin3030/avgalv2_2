import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCygTcmnphAEuwKkMS5uWe6nNtp0bSAeWo",
  authDomain: "avgalv2.firebaseapp.com",
  projectId: "avgalv2",
  storageBucket: "avgalv2.firebasestorage.app",
  messagingSenderId: "532487408821",
  appId: "1:532487408821:web:5104261076204593fdc2fc",
  measurementId: "G-9LK5BN4XVX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app)
export const db = getFirestore(app)

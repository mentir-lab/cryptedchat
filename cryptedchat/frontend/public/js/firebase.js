import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import {
    getDatabase,
    ref,
    push,
    onValue,
    serverTimestamp,
    off,
    get
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBl_Xnj9Q0tv_vhXmZFL6JVBOjn0VKNJsY",
    authDomain: "cryptedbase-36c89.firebaseapp.com",
    databaseURL: "https://cryptedbase-36c89-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cryptedbase-36c89",
    storageBucket: "cryptedbase-36c89.firebasestorage.app",
    messagingSenderId: "33184687056",
    appId: "1:33184687056:web:5e8e6401806d0ebb35cfd5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db, ref, push, get, onValue, serverTimestamp, off, getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut};
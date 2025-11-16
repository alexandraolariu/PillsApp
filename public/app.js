// Firebase CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyAUSrhM5gWbGgUg6DCcqxqCYV_3SF4DTa0",
    authDomain: "pillsproject.firebaseapp.com",
    databaseURL: "https://pillsproject-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pillsproject",
    storageBucket: "pillsproject.firebasestorage.app", 
    messagingSenderId: "766857933896",
    appId: "1:766857933896:web:cb783fca7ab4d43953947d"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Import authentication specific functions
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Auth service using getAuth(app)

window.db = db;
window.app = app; 


const signinEmailInput = document.getElementById('signin-email');
const signinPasswordInput = document.getElementById('signin-password');
const signinButton = document.getElementById('signin-button');

// --- Function to handle redirection after successful login ---
function redirectToDashboard() {
    // You can specify the path to your dashboard or desired page
    window.location.href = 'pills.html';
}


// Email/Password Sign In
signinButton.addEventListener('click', () => {
    const email = signinEmailInput.value;
    const password = signinPasswordInput.value;

    signInWithEmailAndPassword(auth, email, password) // Use imported function
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('User signed in:', user);
            alert('Signed in successfully!');
            
            // *** REDIRECT HERE AFTER SUCCESSFUL SIGN-IN ***
            redirectToDashboard(); // Call the redirect function
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Sign-in error:', errorCode, errorMessage);
            alert(`Sign-in error: ${errorMessage}`);
        });
});


const authFormsDiv = document.getElementById('auth-forms');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');

// *** IMPORTANT: Handle redirection for users who are already logged in ***
onAuthStateChanged(auth, (user) => { // Use imported onAuthStateChanged
    if (user) {
        console.log('User is logged in:', user.email);
        // If the user is already logged in and on the sign-in page, redirect them
        if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
            redirectToDashboard(); 
        }
        userInfoDiv.style.display = 'block';
        authFormsDiv.style.display = 'none';
        userEmailSpan.textContent = user.email;
    } else {
        console.log('User is logged out');
        userInfoDiv.style.display = 'none';
        authFormsDiv.style.display = 'block';
        userEmailSpan.textContent = '';
    }
});

const signoutButton = document.getElementById('signout-button');

signoutButton.addEventListener('click', () => {
    signOut(auth) // Use imported signOut
        .then(() => {
            console.log('User signed out');
            alert('Signed out successfully!');
            // After signing out, you might want to redirect them back to the login page
            // or the home page if they were on a protected page.
            window.location.href = 'index.html'; // Redirect back to the sign-in page
        })
        .catch((error) => {
            console.error('Sign-out error:', error.message);
            alert(`Sign-out error: ${error.message}`);
        });
});
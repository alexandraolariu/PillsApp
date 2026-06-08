import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, inMemoryPersistence } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUSrhM5gWbGgUg6DCcqxqCYV_3SF4DTa0",
    authDomain: "pillsproject.firebaseapp.com",
    databaseURL: "https://pillsproject-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pillsproject",
    storageBucket: "pillsproject.firebasestorage.app", 
    messagingSenderId: "766857933896",
    appId: "1:766857933896:web:cb783fca7ab4d43953947d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); 

const MASTER_EMAIL = "alexandra.olariu2000@gmail.com";

// --- TOAST SYSTEM ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-500' : 'bg-red-500';
    toast.className = `fixed top-5 left-1/2 transform -translate-x-1/2 ${bgClass} text-white px-6 py-3 rounded-xl shadow-xl font-medium text-sm z-[9999] transition-all duration-300`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

// 1. MONITOR SESSION & UPDATE STATUS BADGE
onAuthStateChanged(auth, (user) => {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');

    if (user && user.email === MASTER_EMAIL) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        
        // Update top navigation badge to Active (Green)
        if (dot && text) {
            dot.className = "w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse";
            text.innerText = "Active";
        }
        
        renderConsoleButton(); 
    } else {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
        
        // Reset top navigation badge to Locked (Red)
        if (dot && text) {
            dot.className = "w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse";
            text.innerText = "Locked";
        }
    }
});

// 2. CREATE USER (Isolated Background Process)
document.getElementById('signup-button').addEventListener('click', async (e) => {
    e.preventDefault(); 
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-password').value;

    if (!email || !pass) return showToast("Please fill in both fields!", "error");

    const tempApp = initializeApp(firebaseConfig, "TempApp_" + Date.now());
    const tempAuth = getAuth(tempApp);

    try {
        await setPersistence(tempAuth, inMemoryPersistence);
        await createUserWithEmailAndPassword(tempAuth, email, pass);
        
        showToast("Account successfully created in Firebase!", "success");
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';

    } catch (error) {
        showToast("Error: " + error.message, "error");
    } finally {
        await deleteApp(tempApp);
    }
});

// 3. GENERATE EXTERNAL LINK BUTTON WITH ICON
function renderConsoleButton() {
    const wrapper = document.getElementById('console-link-wrapper');
    if (!wrapper) return;
    
    wrapper.innerHTML = `
        <a 
            href="https://console.firebase.google.com/project/pillsproject/authentication/users" 
            target="_blank" 
            class="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 active:scale-95"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            Open Firebase Console
        </a>
    `;
}

// 4. MASTER AUTH CONTROL
document.getElementById('login-button').addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => showToast("Access Granted. Welcome back!", "success"))
        .catch(() => showToast("Invalid Master Credentials!", "error"));
});

document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth).then(() => showToast("Logged out secure session.", "success"));
});
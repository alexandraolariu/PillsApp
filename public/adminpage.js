import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// 1. FIREBASE CONFIGURATION
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
const db = getFirestore(app);
const auth = getAuth(app);

// Your Master Admin Email
const MASTER_EMAIL = "alexandra.olariu2000@gmail.com";

// 2. HTML ELEMENTS SELECTION
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const userTableBody = document.getElementById('pills-table-body');
const signupEmailInp = document.getElementById('signup-email');
const signupPassInp = document.getElementById('signup-password');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');

// 3. AUTH STATE MANAGEMENT
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Security check: If a non-master user tries to stay logged in
        if (user.email !== MASTER_EMAIL) {
            signOut(auth);
            alert("Access Denied! Only the Master Admin can access this panel.");
            return;
        }

        // Show Dashboard
        loginSection.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        updateStatusBadge("Master Admin", "bg-green-400");
        
        // Load the users list from Database
        loadUsersFromFirestore();
    } else {
        // Show Login Screen
        loginSection.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
        updateStatusBadge("Locked", "bg-red-400");
    }
});

// 4. LOGIN LOGIC (ONLY FOR MASTER)
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    if (email !== MASTER_EMAIL) {
        return alert("Access restricted to the Master Administrator.");
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        alert("Login failed: Invalid email or password.");
    }
});

// 5. CREATE NEW USER (Authentication + Database Sync)
document.getElementById('signup-button').addEventListener('click', async () => {
    const email = signupEmailInp.value;
    const pass = signupPassInp.value;

    if (!email || !pass) return alert("Please enter both email and password for the new user.");

    try {
        // A. Create user in Firebase Authentication (The list in your screenshot)
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = userCredential.user.uid;

        // B. Save user in Firestore "users" collection (For the website table)
        await addDoc(collection(db, "users"), {
            uid: uid,
            email: email,
            dateCreated: new Date().toLocaleDateString('en-US'),
            role: "admin"
        });

        alert(`User ${email} created successfully!`);
        
        // Reset inputs
        signupEmailInp.value = "";
        signupPassInp.value = "";

        // Important: Re-syncing as Master Admin
        alert("System will refresh to maintain Master Admin session.");
        location.reload(); 

    } catch (error) {
        alert("Error creating user: " + error.message);
    }
});

// 6. LOAD TABLE DATA FROM FIRESTORE
async function loadUsersFromFirestore() {
    if (!userTableBody) return;
    userTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">Loading records...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        userTableBody.innerHTML = ''; 

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = `
                <tr class="hover:bg-gray-50/80 transition-all border-b border-gray-100">
                    <td class="px-6 py-4">
                        <span class="font-semibold text-gray-700 text-xs">${data.email}</span>
                    </td>
                    <td class="px-6 py-4 text-center text-[10px] text-gray-400 font-mono">
                        ${data.dateCreated || 'N/A'}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="removeUser('${docSnap.id}')" class="text-red-400 hover:text-red-600 p-2 transition-colors">
                            <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
            userTableBody.innerHTML += row;
        });

        if (querySnapshot.empty) {
            userTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">No users found in database.</td></tr>';
        }
    } catch (e) {
        console.error("Load Error:", e);
    }
}

// 7. DELETE USER FROM DATABASE
window.removeUser = async (docId) => {
    if(confirm("Are you sure you want to remove this user from the records?")) {
        try {
            await deleteDoc(doc(db, "users", docId));
            loadUsersFromFirestore(); 
        } catch (error) {
            alert("Error deleting user: " + error.message);
        }
    }
};

// 8. LOGOUT
document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth);
});

// UI STATUS UPDATE
function updateStatusBadge(text, colorClass) {
    if(statusText) statusText.innerText = text;
    if(statusDot) statusDot.className = `w-2 h-2 rounded-full mr-2 animate-pulse ${colorClass}`;
}
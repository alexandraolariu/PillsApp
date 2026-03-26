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

// Necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Firebase configuration and app ID are provided globally by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Initialize Firestore for data operations
const auth = getAuth(app);

let userId = null;
let allPills = [];

function showMessage(message) {
    messageText.textContent = message;
    messageModal.style.display = 'flex';
}

window.closeMessageModal = function () {
    messageModal.style.display = 'none';
}


// Helper Function for Redirection back to sign-in
function redirectToSignInPage() {
    window.location.href = 'index.html';
}

// Function for getting user id
onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            userId = user.uid;
        } else {
            if (initialAuthToken) {
                const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                userId = userCredential.user.uid;
            } else {
                const userCredential = await signInAnonymously(auth);
                userId = userCredential.user.uid;
            }
        }
        setupFirestoreListener(userId);
    } catch (error) {
        console.error("Authentication Error:", error);
    }
});


function setupFirestoreListener(currentUserId) {
    if (!currentUserId) {
        console.error("User ID is not available for Firestore listener.");
        errorMessageDisplay.textContent = "Cannot load stock data: User not authenticated.";
        errorMessageDisplay.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
        return;
    }

    const pillsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/pills_stock`);
    const q = query(pillsCollectionRef);

    onSnapshot(q, (snapshot) => {
        loadingIndicator.classList.add('hidden');
        allPills = [];
        snapshot.forEach(doc => {
            allPills.push({ id: doc.id, ...doc.data() });
        });
        searchPills(); // Re-render the table with current search filter
    }, (error) => {
        console.error("Error fetching pills:", error);
        errorMessageDisplay.textContent = `Failed to load pills: ${error.message}`;
        errorMessageDisplay.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    });
}

// --- Stock Table Rendering and Search ---
function renderPillsTable(pillsToDisplay) {
    pillsTableBody.innerHTML = '';
    if (pillsToDisplay.length === 0) {
        noPillsMessage.classList.remove('hidden');
    } else {
        noPillsMessage.classList.add('hidden');
        pillsToDisplay.forEach(pill => {
            renderPillRow(pill.id, pill);
        });
    }
}



function renderPillRow(id, pill) {
    const tableRow = document.createElement('tr');
    tableRow.id = `pill-${id}`;
    tableRow.innerHTML = `
                <td class="pill-name font-bold cursor-pointer" onclick="showPillDetails('${id}')" data-label="Pill Name">${pill.name}</td>
                <td class="pill-quantity" data-label="Quantity">${pill.quantity}</td>
                <td class="expiry-date ${(new Date(pill.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) <= 30 ? 'text-red' : ''}" data-label="Expiry Date">  ${pill.expiryDate}</td>
                <td class="" data-label="Price ($)">$${pill.price.toFixed(2)}</td>
                <td class="" data-label="Form">${pill.form || 'N/A'}</td>
                <td class="" data-label="Category">${pill.pillCategory || 'N/A'}</td>
                <td class="" data-label="Prescription Status">${pill.prescriptionStatus || 'N/A'}</td>
                <td class="" data-label="Active Substance">${pill.pillActiveSubstance || 'N/A'}</td>
                <td class="table-actions">
                    <button onclick="openEditModal('${id}', '${pill.name}', ${pill.quantity}, '${pill.expiryDate}', ${pill.price}, '${pill.indications || ''}', '${pill.contraindications || ''}', '${pill.form || ''}', '${pill.codDeBare || ''}', '${pill.pillCategory || ''}', '${pill.prescriptionStatus || ''}', '${pill.pillActiveSubstance || ''}', '${pill.pillProspectLink || ''}')"
                            class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm mr-2">Edit</button>
                    <button onclick="deletePill('${id}')"
                            class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm mr-2">Delete</button>
                    <button onclick="showPillDetails('${id}')"
                            class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm mr-2">Details</button>
                    <button onclick="addToBasket('${id}')"
                            class="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm">Add to Basket</button>
                </td>
            `;
    pillsTableBody.appendChild(tableRow);
}
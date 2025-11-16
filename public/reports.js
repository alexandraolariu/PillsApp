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
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, onSnapshot } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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
const LOW_STOCK_THRESHOLD = 20;

const userEmailSpan = document.getElementById('user-email');
const signoutButton = document.getElementById('signout-button');
const userInfoDiv = document.getElementById('user-info');
const lowStockBody = document.getElementById('low-stock-body');
const expiringBody = document.getElementById('expiring-body');

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

// --- Event Listener for Sign Out ---
if (signoutButton) {
    signoutButton.addEventListener('click', () => {
        signOut(auth)
            .then(() => {
                console.log('User signed out from pills page');
                alert('You have been signed out.'); // Optional alert
                redirectToSignInPage(); // Redirect after sign-out
            })
            .catch((error) => {
                console.error('Sign-out error from pills page:', error.message);
                alert(`Sign-out error: ${error.message}`);
            });
    });
}

// --- Authentication State Change Listener---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in, display info and show protected content
        console.log('Auth state changed on pills: User is logged in.', user.email);
        if (userInfoDiv) {
            userInfoDiv.style.display = 'block';
        }
        if (userEmailSpan) {
            userEmailSpan.textContent = user.email.split("@")[0];
        }

    } else {
        // User is NOT logged in, redirect them away from the protected page
        console.log('Auth state changed on pills: User is logged out.');
        redirectToSignInPage();
    }
});

// Helper Function for Redirection back to sign-in
function redirectToSignInPage() {
    window.location.href = 'index.html';
}

window.filterPillsLowQuantity = filterPillsLowQuantity;
let sortAscending = true;
function filterPillsLowQuantity() {
    lowStockBody.innerHTML = '';

    const filteredPillsLowStock = allPills
        .filter(pill => pill.quantity <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => {
            return sortAscending ? a.quantity - b.quantity : b.quantity - a.quantity;
        });

    if (filteredPillsLowStock.length === 0) {
        lowStockBody.innerHTML = '<td colspan="5" class="text-center py-4 text-gray-500">No products with low stock</td>';
    } else {
        filteredPillsLowStock.forEach(pill => {
            addPillsInTable(pill.id, pill, lowStockBody);
        });
    }
    sortAscending = !sortAscending;
}

// Pills that will expiry 
window.filterPillsExpiryDate = filterPillsExpiryDate;
function filterPillsExpiryDate() {
    expiringBody.innerHTML = '';

    const filteredPillsExpiry = allPills
        .filter(pill => {
            const daysLeft = Math.round((new Date(pill.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            return daysLeft <= 90;
        })
        .sort((a, b) => {
            const daysA = Math.round((new Date(a.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            const daysB = Math.round((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            return sortAscending ? daysA - daysB : daysB - daysA;
        });

    if (filteredPillsExpiry.length === 0) {
        expiringBody.innerHTML = '<td colspan="5" class="text-center py-4 text-gray-500">No products that will expire</td>';
    } else {
        filteredPillsExpiry.forEach(pill => {
            addPillsInTable(pill.id, pill, expiringBody);
        });
    }

    sortAscending = !sortAscending;
}


function addPillsInTable(id,filteredPills,targetBody){
    let classToAddQuantity = '';
    let classToAddExpiry = '';
    const daysLeft = Math.round((new Date(filteredPills.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    let daysLeftShow = "<p class='font-bold'>" + daysLeft + " day(s)</p>";

    if (daysLeft <= 30){
        classToAddExpiry = "text-red";
    } else if(daysLeft <= 60){
        classToAddExpiry = "text-orange-400";
    } else if(daysLeft <= 90){
        classToAddExpiry = "text-yellow-500";
    } else{
        classToAddExpiry = "text-gray-400";
    }

    if (filteredPills.quantity<= 5){
        classToAddQuantity = "text-red";
    } else if(filteredPills.quantity<= 10){
        classToAddQuantity = "text-orange-400";
    }else if(filteredPills.quantity<= 20){
        classToAddQuantity = "text-yellow-500";
    }

    const tableRow = document.createElement('tr');
    tableRow.id = `filteredPills-${id}`;
    tableRow.innerHTML = `
                <td class="pill-name font-bold" data-label="Pill Name">${filteredPills.name}</td>
                <td class="" data-label="Barcode">${filteredPills.codDeBare || 'N/A'}</td>
                <td class="pill-quantity ${classToAddQuantity}" data-label="Quantity">${filteredPills.quantity}</td>
                <td class="expiry-date ${classToAddExpiry}" data-label="Expiry Date">  ${filteredPills.expiryDate} ${daysLeft > 0 ? daysLeftShow : '<p class="font-bold">Expired</p>'}</td>
                <td class="" data-label="Price ($)">$${filteredPills.price.toFixed(2)}</td>
            `;
    targetBody.appendChild(tableRow);
}



window.exportToExcel = exportToExcel;
function exportToExcel() {
    const table = document.getElementById('low-stock-body').parentElement; // selectează <table>
    const tableHTML = table.outerHTML.replace(/ /g, '%20');

    const filename = 'low_stock.xls';
    const dataType = 'application/vnd.ms-excel';

    const link = document.createElement('a');
    link.href = 'data:' + dataType + ', ' + tableHTML;
    link.download = filename;
    link.click();
}

window.exportToExcel2 = exportToExcel2;
function exportToExcel2() {
    const table = document.getElementById('expiring-body').parentElement; // selectează <table>
    const tableHTML = table.outerHTML.replace(/ /g, '%20');

    const filename = 'expiry.xls';
    const dataType = 'application/vnd.ms-excel';

    const link = document.createElement('a');
    link.href = 'data:' + dataType + ', ' + tableHTML;
    link.download = filename;
    link.click();
}

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
        //loadingIndicator.classList.add('hidden');
        allPills = [];
        snapshot.forEach(doc => {
            allPills.push({ id: doc.id, ...doc.data() });
        });
        filterPillsLowQuantity(allPills);
        filterPillsExpiryDate(allPills);
    }, (error) => {
        console.error("Error fetching pills:", error);
        errorMessageDisplay.textContent = `Failed to load pills: ${error.message}`;
        errorMessageDisplay.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    });
}
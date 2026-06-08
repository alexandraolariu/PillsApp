import { firebaseConfig } from "./config.js";
import { IMGBB_API_KEY } from "./config.js";

// Necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDoc, setDoc, addDoc, getDocs, deleteDoc, updateDoc, doc, query, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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

const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');

const searchPillsInput = document.getElementById('searchPills');
const noPillsMessage = document.getElementById('no-pills-message');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const signoutButton = document.getElementById('signout-button');
const pillsTableBody = document.getElementById('pills-table-body');
const errorMessageDisplay = document.getElementById('error-message');
const loadingIndicator = document.getElementById('loading-indicator');
const onlineShopButton = document.getElementById('online-shop-button');


function showMessage(message) {
    if (messageText && messageModal) {
        messageText.innerHTML = message; // SCHIMBĂ DIN textContent ÎN innerHTML
        messageModal.style.display = 'flex';
    }
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
        setupOrdersListener(userId);
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

    onlineShopButton.href = `https://pillsproject.web.app/onlineshop.html?seller=${currentUserId}`;

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



function setupOrdersListener(currentUserId) {
    const salesRef = collection(db, `artifacts/${appId}/users/${currentUserId}/sales`);


    onSnapshot(salesRef, (snapshot) => {
        const containers = {
            'new': document.getElementById('container-new'),
            'processing': document.getElementById('container-processing'),
            'delivered': document.getElementById('container-delivered')
        };

        Object.values(containers).forEach(c => c.innerHTML = '');

        const counts = { 'new': 0, 'processing': 0, 'delivered': 0 };

        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };

            if (order.onlineshop === true) {
                const status = order.status || 'new';

                if (containers[status]) {
                    counts[status]++;
                    renderOrderCard(containers[status], order);
                }
            }
        });

        updateBadgeCounts(counts);
        onlineShopSettings(currentUserId);

    });
}



async function onlineShopSettings(currentUserId) {
    const onlineShopRef = doc(db, `artifacts/${appId}/users/${currentUserId}/onlineShopSettings`, "settings");
    
    try {
        const docSnap = await getDoc(onlineShopRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            document.getElementById('shop-name-input').value = data.name || "";
            document.getElementById('shop-phone-input').value = data.phone || "";
            document.getElementById('shop-address-input').value = data.address || "";
            document.getElementById('shop-announcement-input').value = data.announcement || "";
            
        } else {
            console.log("No settings in the database.");
        }
    } catch (error) {
        console.error("Error at online shop settings loading:", error);
    }
}

window.saveSettings = async function() {
    // 1. Verificare critică: avem userId?
    if (!userId) {
        console.error("Salvare anulată: userId este null.");
        showMessage("<span class='text-red-500 font-bold'>Error:</span> User not identified. Please refresh.");
        return;
    }

    const saveBtn = document.querySelector('button[onclick="saveSettings()"]');
    const originalBtnText = saveBtn ? saveBtn.innerHTML : "Save Settings";

    // Feedback vizual: Schimbăm textul butonului
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <svg class="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full inline-block" viewBox="0 0 24 24"></svg>
            Saving...
        `;
    }

    const docRef = doc(db, `artifacts/${appId}/users/${userId}/onlineShopSettings`, "settings");

    const updatedData = {
        name: document.getElementById('shop-name-input')?.value || "",
        phone: document.getElementById('shop-phone-input')?.value || "",
        address: document.getElementById('shop-address-input')?.value || "",
        announcement: document.getElementById('shop-announcement-input')?.value || "",
        lastUpdated: new Date()
    };

    try {
        await setDoc(docRef, updatedData, { merge: true });
        
        // Închidem modalul de setări
        const modal = document.getElementById('settings-modal'); 
        if (modal) modal.classList.add('hidden');

        // Folosim funcția ta showMessage în loc de alert
        showMessage(`
            <div class="text-center p-4">
                <div class="text-green-500 mb-2">
                    <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-bold text-slate-800">Success!</h3>
                <p class="text-sm text-slate-500">Shop settings have been updated correctly.</p>
            </div>
        `);
        
    } catch (error) {
        console.error("Eroare la salvarea setărilor:", error);
        showMessage(`<span class="text-red-500 font-bold">Save failed:</span> ${error.message}`);
    } finally {
        // Resetăm butonul la starea inițială
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    }
}


function updateBadgeCounts(counts) {
    const newBadge = document.querySelector('.border-blue-500 span');
    const procBadge = document.querySelector('.border-yellow-500 span');
    const delivBadge = document.querySelector('.border-green-500 span');


    if (newBadge) newBadge.textContent = counts['new'] || 0;
    if (procBadge) procBadge.textContent = counts['processing'] || 0;
    if (delivBadge) delivBadge.textContent = counts['delivered'] || 0;
}


function renderOrderCard(container, order) {
    const card = document.createElement('div');
    card.className = "bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer";

    const total = order.totalAmount ? order.totalAmount.toFixed(2) : "0.00";
    const date = order.date ? new Date(order.date.seconds * 1000).toLocaleDateString() : "Recent";

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="text-[10px] font-bold text-slate-400">#${order.id.slice(-5)}</span>
            <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${date}</span>
        </div>
        <h3 class="font-bold text-slate-800 text-sm mb-1">${order.customerName || 'Anonim'}</h3>
        <p class="text-xs text-slate-500 mb-3">${order.items ? order.items.length : 0} product(s) • <strong>$${total}</strong></p>
        
        <div class="flex gap-2">
            ${statusButtons(order)}
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            showOrderDetails(order);
        }
    });

    container.appendChild(card);
}

function statusButtons(order) {
    if (order.status === 'new') {
        return `<button onclick="updateOrderStatus('${order.id}', 'processing')" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-[10px] font-bold py-1.5 rounded">Prepare</button>`;
    } else if (order.status === 'processing') {
        return `<button onclick="updateOrderStatus('${order.id}', 'delivered')" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold py-1.5 rounded">Deliver</button>`;
    }
    return `<span class="text-green-600 text-[10px] font-bold italic">Completed ✅</span>`;
}

// Funcția care schimbă statusul în baza de date
window.updateOrderStatus = async function (orderId, newStatus) {
    const orderRef = doc(db, `artifacts/${appId}/users/${userId}/sales`, orderId);
    try {
        await updateDoc(orderRef, { status: newStatus });
    } catch (e) {
        console.error("Error updating order:", e);
    }
};


window.showOrderDetails = function(order) {
    const date = order.date ? new Date(order.date.seconds * 1000).toLocaleString('ro-RO') : 'Recent';

    const itemsHtml = order.items.map(item => `
        <div class="flex justify-between py-1">
            <span class="text-slate-600">${item.name} <span class="text-xs text-slate-400">x${item.quantity}</span></span>
            <span class="font-semibold text-slate-800">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    // Secțiunea pentru Rețetă
    const prescriptionHtml = order.prescriptionUrl 
        ? `<div class="mt-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 text-indigo-600">📄 Medical Prescription</p>
            <a href="${order.prescriptionUrl}" target="_blank">
                <img src="${order.prescriptionUrl}" class="w-full h-32 object-cover rounded-lg border border-indigo-100 hover:opacity-90 transition-opacity" alt="Prescription">
                <p class="text-[9px] text-center text-indigo-400 mt-1 italic italic">Click image to enlarge</p>
            </a>
           </div>`
        : `<div class="mt-4 py-2 px-3 bg-slate-50 rounded text-[10px] text-slate-400 italic">No prescription attached / OTC</div>`;

    const htmlContent = `
        <div class="text-left pr-8">
            <h3 class="text-xl font-bold text-indigo-600 mb-4 uppercase">Order #${order.id.slice(-5)}</h3>
            
            <div class="grid grid-cols-2 gap-4 mb-4 border-t pt-4">
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">Client</p>
                    <p class="text-sm font-bold">${order.customerName || 'Online Visitor'}</p>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                    <p class="text-sm font-bold">${order.customerPhone || 'N/A'}</p>
                </div>
            </div>

            <div class="mb-4">
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 font-bold">Products</p>
                <div class="border-t border-b py-2 max-h-32 overflow-y-auto">
                    ${itemsHtml}
                </div>
            </div>

            ${prescriptionHtml}

            <div class="flex justify-between items-center mt-6 border-t pt-4">
                <div class="text-right w-full">
                    <span class="text-xs font-bold text-slate-400">TOTAL AMOUNT</span>
                    <p class="text-2xl font-black text-indigo-600 leading-none">$${order.totalAmount.toFixed(2)}</p>
                </div>
            </div>
        </div>
    `;

    showMessage(htmlContent);
};



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

    const isOnline = pill.isInOnlineShop === true;
    const classBtn = isOnline ? "bg-red-500 hover:bg-red-700" : "bg-green-500 hover:bg-green-700";
    const textBtn = isOnline ? "Remove" : "Add";

    tableRow.innerHTML = `
                <td class="pill-name font-bold cursor-pointer" data-label="Pill Name">${pill.name}</td>
                <td class="pill-quantity" data-label="Quantity">${pill.quantity}</td>
                <td class="expiry-date ${(new Date(pill.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) <= 30 ? 'text-red' : ''}" data-label="Expiry Date">  ${pill.expiryDate}</td>
                <td class="" data-label="Price ($)">$${pill.price.toFixed(2)}</td>
                <td class="" data-label="Category">${pill.pillCategory || 'N/A'}</td>
                <td class="" data-label="Prescription Status">${pill.prescriptionStatus || 'N/A'}</td>
                <td class="table-actions">
                    <button onclick="changeOnlineStatus('${id}', ${isOnline})"
                            class="${classBtn} text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm">${textBtn}</button>
                </td>
            `;
    pillsTableBody.appendChild(tableRow);
}

window.changeOnlineStatus = async function (id, currentStatus) {

    const pillDocRef = doc(db, `artifacts/${appId}/users/${userId}/pills_stock`, id);

    try {
        await updateDoc(pillDocRef, {
            isInOnlineShop: !currentStatus
        });
    } catch (e) {
        console.error("Error updating status:", e);
    }

};

window.searchPills = function () {
    const searchTerm = searchPillsInput.value.toLowerCase().trim();
    if (!searchTerm) {
        renderPillsTable(allPills);
        return;
    }

    const filteredPills = allPills.filter(pill => {
        const nameMatch = pill.name.toLowerCase().includes(searchTerm);
        const indicationsMatch = (pill.indications || '').toLowerCase().includes(searchTerm);
        const contraindicationsMatch = (pill.contraindications || '').toLowerCase().includes(searchTerm);
        const formMatch = (pill.form || '').toLowerCase().includes(searchTerm);
        const barcodeMatch = (pill.codDeBare || '').toLowerCase().includes(searchTerm);
        const activeSubstanceMatch = (pill.pillActiveSubstance || '').toLowerCase().includes(searchTerm);
        const prescriptionStatusMatch = (pill.prescriptionStatus || '').toLowerCase().includes(searchTerm);
        const categoryMatch = (pill.pillCategory || '').toLowerCase().includes(searchTerm);

        return nameMatch || indicationsMatch || contraindicationsMatch || formMatch || barcodeMatch || activeSubstanceMatch || prescriptionStatusMatch || categoryMatch;
    });
    renderPillsTable(filteredPills);
};



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
        // You can now load user-specific data here, e.g.:
        // loadUserPillSchedule(user.uid); 

    } else {
        // User is NOT logged in, redirect them away from the protected page
        console.log('Auth state changed on pills: User is logged out.');
        redirectToSignInPage();
    }
});
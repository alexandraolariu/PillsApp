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
let allPills = []; // Global array to store all pills for client-side filtering
let basket = []; // Global array to store items in the basket


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
const addPillForm = document.getElementById('add-pill-form');

// Basket section
const basketTableBody = document.getElementById('basket-table-body');
const basketTotalSpan = document.getElementById('basket-total');
const emptyBasketMessage = document.getElementById('empty-basket-message');
const generateBonFiscalBtn = document.getElementById('generate-bon-fiscal-btn');
const bonFiscalModal = document.getElementById('bon-fiscal-modal');
const bonFiscalContent = document.getElementById('bon-fiscal-content');
const barcodeInput = document.getElementById('barcodeInput');

// Edit pill form
const editPillModal = document.getElementById('edit-pill-modal');
const editPillForm = document.getElementById('edit-pill-form');
const editPillIdInput = document.getElementById('editPillId');
const editPillNameInput = document.getElementById('editPillName');
const editPillQuantityInput = document.getElementById('editPillQuantity');
const editPillExpiryDateInput = document.getElementById('editPillExpiryDate');
const editPillPriceInput = document.getElementById('editPillPrice');
const editPillIndicationsInput = document.getElementById('editPillIndications');
const editPillContraindicationsInput = document.getElementById('editPillContraindications');
const editPillFormInput = document.getElementById('editPillForm');
const editPillCodDeBareInput = document.getElementById('editPillCodDeBare');

// Modal text
const confirmModal = document.getElementById('confirm-modal');
const confirmText = document.getElementById('confirm-text');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
let confirmCallback = null;

//Pop up texts
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

// --- Truncate Text If Too Long(indications/contraindications) ---
function truncateText(text, maxLength = 30) {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

// --- Adding Pills in the Table ---
function renderPillRow(id, pill) {
    const tableRow = document.createElement('tr');
    tableRow.id = `pill-${id}`;
    tableRow.innerHTML = `
                <td class="pill-name font-bold" data-label="Pill Name">${pill.name}</td>
                <td class="pill-quantity" data-label="Quantity">${pill.quantity}</td>
                <td class="expiry-date ${(new Date(pill.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) <= 90 ? 'text-red' : ''}" data-label="Expiry Date">  ${pill.expiryDate}</td>
                <td class="" data-label="Price ($)">$${pill.price.toFixed(2)}</td>
                <td class="pill-indication" data-label="Indications" title="${pill.indications || 'N/A'}"> ${truncateText(pill.indications)} </td>
                <td class="pill-contraindication" data-label="Contraindications" title="${pill.contraindications || 'N/A'}">${truncateText(pill.contraindications)}</td>
                <td class="" data-label="Form">${pill.form || 'N/A'}</td>
                <td class="" data-label="Barcode">${pill.codDeBare || 'N/A'}</td>
                <td class="table-actions">
                    <button onclick="openEditModal('${id}', '${pill.name}', ${pill.quantity}, '${pill.expiryDate}', ${pill.price}, '${pill.indications || ''}', '${pill.contraindications || ''}', '${pill.form || ''}', '${pill.codDeBare || ''}')"
                            class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm mr-2">Edit</button>
                    <button onclick="deletePill('${id}')"
                            class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm mr-2">Delete</button>
                    <button onclick="addToBasket('${id}')"
                            class="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition duration-150 ease-in-out shadow-sm">Add to Basket</button>
                </td>
            `;
    pillsTableBody.appendChild(tableRow);
}


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
        return nameMatch || indicationsMatch || contraindicationsMatch || formMatch || barcodeMatch;
    });
    renderPillsTable(filteredPills);
};


// --- Edit Pill Functions ---
window.closeEditModal = function () {
    editPillModal.style.display = 'none';
}

window.openEditModal = function (pillId, name, quantity, expiryDate, price, indications, contraindications, form, codDeBare) {
    editPillIdInput.value = pillId;
    editPillNameInput.value = name;
    editPillQuantityInput.value = quantity;
    editPillExpiryDateInput.value = expiryDate;
    editPillPriceInput.value = price;
    editPillIndicationsInput.value = indications || '';
    editPillContraindicationsInput.value = contraindications || '';
    editPillFormInput.value = form || '';
    editPillCodDeBareInput.value = codDeBare || '';
    editPillModal.style.display = 'flex';
}

editPillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userId) {
        showMessage("Please wait for authentication to complete.");
        return;
    }

    const pillId = editPillIdInput.value;
    const name = editPillNameInput.value;
    const quantity = parseInt(editPillQuantityInput.value);
    const expiryDate = editPillExpiryDateInput.value;
    const price = parseFloat(editPillPriceInput.value);
    const indications = editPillIndicationsInput.value;
    const contraindications = editPillContraindicationsInput.value;
    const form = editPillFormInput.value;
    const codDeBare = editPillCodDeBareInput.value;

    if (!name || isNaN(quantity) || !expiryDate || isNaN(price)) {
        showMessage("Please fill in all required fields correctly (Name, Quantity, Expiry Date, Price).");
        return;
    }

    try {
        const pillDocRef = doc(db, `artifacts/${appId}/users/${userId}/pills_stock`, pillId);
        await updateDoc(pillDocRef, {
            name,
            quantity,
            expiryDate,
            price,
            indications,
            contraindications,
            form,
            codDeBare
        });
        showMessage("Pill updated successfully!");
        closeEditModal();
    } catch (error) {
        console.error("Error updating pill:", error);
        showMessage(`Error updating pill: ${error.message}`);
    }
});


// --- Delete Pill ---
window.deletePill = async function (pillId) {
    if (!userId) {
        showMessage("Please wait for authentication to complete.");
        return;
    }

    showConfirmModal("Are you sure you want to delete this pill?", async (confirmed) => {
        if (confirmed) {
            try {
                const pillDocRef = doc(db, `artifacts/${appId}/users/${userId}/pills_stock`, pillId);
                await deleteDoc(pillDocRef);
                showMessage("Pill deleted successfully!");
            } catch (error) {
                console.error("Error deleting pill:", error);
                showMessage(`Error deleting pill: ${error.message}`);
            }
        } else {
            showMessage("Pill deletion cancelled.");
        }
    });
};



// --- Basket Functions ---
window.addToBasket = function (pillId) {
    const pillToAdd = allPills.find(p => p.id === pillId);
    if (!pillToAdd) {
        showMessage("Pill not found in stock.");
        return;
    }

    if (pillToAdd.quantity <= 0) {
        showMessage(`${pillToAdd.name} is out of stock.`);
        return;
    }

    const existingBasketItem = basket.find(item => item.id === pillId);

    if (existingBasketItem) {
        if (existingBasketItem.quantity < pillToAdd.quantity) {
            existingBasketItem.quantity++;
            showMessage(`${pillToAdd.name} quantity increased in basket.`);
        } else {
            showMessage(`Maximum available quantity (${pillToAdd.quantity}) for ${pillToAdd.name} reached in basket.`);
        }
    } else {
        basket.push({
            id: pillToAdd.id,
            name: pillToAdd.name,
            price: pillToAdd.price,
            quantity: 1,
            originalStockQuantity: pillToAdd.quantity
        });
        showMessage(`${pillToAdd.name} added to basket.`);
    }
    renderBasket();
};

window.updateBasketItemQuantity = function (pillId, newQuantity) {
    const itemIndex = basket.findIndex(item => item.id === pillId);
    if (itemIndex === -1) return;

    const pillInStock = allPills.find(p => p.id === pillId);
    if (!pillInStock) return;

    if (newQuantity <= 0) {
        removeFromBasket(pillId);
        return;
    }

    if (newQuantity > pillInStock.quantity) {
        showMessage(`Cannot add more than available stock (${pillInStock.quantity}) for ${basket[itemIndex].name}.`);
        basket[itemIndex].quantity = pillInStock.quantity;
    } else {
        basket[itemIndex].quantity = newQuantity;
    }
    renderBasket();
};

window.removeFromBasket = function (pillId) {
    basket = basket.filter(item => item.id !== pillId);
    showMessage("Item removed from basket.");
    renderBasket();
};

function renderBasket() {
    basketTableBody.innerHTML = '';
    let total = 0;

    if (basket.length === 0) {
        emptyBasketMessage.classList.remove('hidden');
        generateBonFiscalBtn.disabled = true;
    } else {
        emptyBasketMessage.classList.add('hidden');
        generateBonFiscalBtn.disabled = false;
        basket.forEach(item => {
            const subtotal = item.quantity * item.price;
            total += subtotal;

            const row = document.createElement('tr');
            row.classList.add('hover:bg-gray-50');
            row.innerHTML = `
                        <td class="px-4 py-2 text-sm font-medium text-gray-900">${item.name}</td>
                        <td class="px-4 py-2 text-sm text-gray-500 text-center">
                            <input type="number" min="1" value="${item.quantity}"
                                   onchange="updateBasketItemQuantity('${item.id}', parseInt(this.value))"
                                   class="w-16 text-left border rounded-md p-1">
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-500 text-left">$${item.price.toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-500 text-left">$${subtotal.toFixed(2)}</td>
                        <td class="px-4 py-2 text-right">
                            <button onclick="removeFromBasket('${item.id}')"
                                    class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-lg transition duration-150 ease-in-out">Remove</button>
                        </td>
                    `;
            basketTableBody.appendChild(row);
        });
    }
    basketTotalSpan.textContent = total.toFixed(2);
}

// --- Add to Basket by Barcode ---
let audioCtx = null;

window.initAudio = function () {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext activat");
    }
}

function playBeep() {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
}


window.openScannerModal = function() {
  document.getElementById("scanner-modal").classList.remove("hidden");
  window.addByBarcode(); // pornește scanarea
}

window.closeScannerModal = function () {
  document.getElementById("scanner-modal").classList.add("hidden");
  Quagga.stop(); // oprește camera
}

window.addByBarcode = function () {
    let scanCooldown = false;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner'),
        },
        decoder: {
            readers: ["ean_reader", "code_128_reader", "upc_reader"]
        }
    }, function (err) {
        if (!err) Quagga.start();
    });

    // elimină orice handler anterior
    Quagga.offDetected();

    // adaugă handlerul cu protecție
    Quagga.onDetected(data => {
        if (scanCooldown) return; // ignoră dacă suntem în cooldown

        const barcode = data.codeResult.code.trim();
        const pillFound = allPills.find(p => p.codDeBare === barcode);

        if (pillFound) {
            scanCooldown = true; // activăm blocarea
            playBeep();
            addToBasket(pillFound.id);
            if (barcodeInput) {
                barcodeInput.value = '';
            }

            // deblocăm după 1 secundă
            setTimeout(() => {
                scanCooldown = false;
            }, 1000);
        } else {
            // showMessage(`Pill with barcode "${barcode}" not found in stock.`);
        }
    });


    // const barcode = barcodeInput.value.trim();
    // if (!barcode) {
    //     showMessage("Please enter a barcode.");
    //     return;
    // }


    // const pillFound = allPills.find(p => p.codDeBare === barcode);

    // if (pillFound) {
    //     addToBasket(pillFound.id);
    //     barcodeInput.value = ''; // Clear input after adding
    // } else {
    //     showMessage(`Pill with barcode "${barcode}" not found in stock.`);
    // }
};



// --- Bon Fiscal Generation and Print ---
generateBonFiscalBtn.addEventListener('click', async () => {
    if (basket.length === 0) {
        showMessage("Basket is empty. Add items to generate a receipt.");
        return;
    }

    if (!userId) {
        showMessage("Authentication in progress. Please wait.");
        return;
    }

    const updates = [];
    let allQuantitiesValid = true;

    // First, validate all quantities and prepare updates
    for (const item of basket) {
        const pillInStock = allPills.find(p => p.id === item.id);
        if (!pillInStock || pillInStock.quantity < item.quantity) {
            showMessage(`Insufficient stock for ${item.name}. Available: ${pillInStock ? pillInStock.quantity : 0}, Requested: ${item.quantity}.`);
            allQuantitiesValid = false;
            break;
        }
        updates.push({
            id: item.id,
            newQuantity: pillInStock.quantity - item.quantity
        });
    }

    if (!allQuantitiesValid) {
        return; // Stop if any quantity is invalid
    }

    try {
        // Perform all updates
        for (const update of updates) {
            const pillDocRef = doc(db, `artifacts/${appId}/users/${userId}/pills_stock`, update.id);
            await updateDoc(pillDocRef, { quantity: update.newQuantity });
        }

        // Generate receipt content
        let bonFiscalHtml = `
                    <h2 class="text-2xl font-bold mb-2">PHARMACY RECEIPT</h2>
                    <h3 class="text-lg font-semibold mb-4">Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</h3>
                    <table class="w-full text-sm">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th class="text-center">Qty</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
        let finalTotal = 0;
        basket.forEach(item => {
            const itemTotal = item.quantity * item.price;
            finalTotal += itemTotal;
            bonFiscalHtml += `
                        <tr>
                            <td>${item.name}</td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">$${item.price.toFixed(2)}</td>
                            <td class="text-right">$${itemTotal.toFixed(2)}</td>
                        </tr>
                    `;
        });
        bonFiscalHtml += `
                        </tbody>
                    </table>
                    <div class="text-right mt-4 text-lg font-bold">
                        Total: $${finalTotal.toFixed(2)}
                    </div>
                    <p class="text-center mt-6 text-gray-600">Thank you for your purchase!</p>
                `;

        bonFiscalContent.innerHTML = bonFiscalHtml;
        bonFiscalModal.style.display = 'flex';
        basket = []; // Clear basket after generating receipt
        renderBasket(); // Update basket display
        showMessage("Receipt generated and stock updated!");

    } catch (error) {
        console.error("Error generating receipt or updating stock:", error);
        showMessage(`Error: ${error.message}. Stock might not be fully updated.`);
    }
});

window.printBonFiscal = function () {
    const printContent = document.getElementById('bon-fiscal-content').innerHTML;
    const originalBody = document.body.innerHTML;

    // Create a temporary iframe or new window for printing to isolate content
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Receipt</title>');
    // Copy relevant styles for printing
    printWindow.document.write('<link href="https://cdn.tailwindcss.com" rel="stylesheet">');
    printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">');
    printWindow.document.write('<style>body { font-family: \'Inter\', sans-serif; } table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; } th, td { border-bottom: 1px dashed #ccc; padding: 5px 0; } th:nth-child(1), td:nth-child(1) { width: 50%; text-align: left; } th:nth-child(2), td:nth-child(2) { width: 15%; text-align: center; } th:nth-child(3), td:nth-child(3) { width: 15%; text-align: right; } th:nth-child(4), td:nth-child(4) { width: 20%; text-align: right; } h2, h3 { text-align: center; margin-bottom: 10px; } .text-right { text-align: right; } .text-center { text-align: center; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close(); // Close the print window after printing
};

// Initial render of basket
renderBasket();


// --- Add Pills Function --- 
addPillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userId) {
        showMessage("Please wait for authentication to complete.");
        return;
    }

    const name = document.getElementById('pillName').value;
    const quantity = parseInt(document.getElementById('pillQuantity').value);
    const expiryDate = document.getElementById('pillExpiryDate').value;
    const price = parseFloat(document.getElementById('pillPrice').value);
    const indications = document.getElementById('pillIndications').value;
    const contraindications = document.getElementById('pillContraindications').value;
    const form = document.getElementById('pillForm').value;
    const codDeBare = document.getElementById('pillCodDeBare').value;

    if (!name || isNaN(quantity) || !expiryDate || isNaN(price)) {
        showMessage("Please fill in all required fields correctly (Name, Quantity, Expiry Date, Price).");
        return;
    }

    try {
        const pillsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/pills_stock`);
        await addDoc(pillsCollectionRef, {
            name,
            quantity,
            expiryDate,
            price,
            indications,
            contraindications,
            form,
            codDeBare
        });
        showMessage("Pill added successfully!");
        addPillForm.reset();
    } catch (error) {
        console.error("Error adding pill:", error);
        showMessage(`Error adding pill: ${error.message}`);
    }
});


window.closeBonFiscalModal = function () {
    bonFiscalModal.style.display = 'none';
}

function showConfirmModal(message, callback) {
    confirmText.textContent = message;
    confirmCallback = callback;
    confirmModal.style.display = 'flex';
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
    confirmCallback = null;
}

confirmYesBtn.addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback(true);
    }
    closeConfirmModal();
});

confirmNoBtn.addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback(false);
    }
    closeConfirmModal();
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
        // You can now load user-specific data here, e.g.:
        // loadUserPillSchedule(user.uid); 

    } else {
        // User is NOT logged in, redirect them away from the protected page
        console.log('Auth state changed on pills: User is logged out.');
        redirectToSignInPage();
    }
});

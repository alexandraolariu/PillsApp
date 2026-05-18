import { firebaseConfig, IMGBB_API_KEY } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getFirestore, collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// --- INITIALIZARE CORE ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- VARIABILE GLOBALE ---
const urlParams = new URLSearchParams(window.location.search);
const adminId = urlParams.get('seller');

const shopContainer = document.getElementById('shop-container');
const detailsModal = document.getElementById('details-modal');
const searchPillsInput = document.getElementById('searchPills');

// Basket section
const basketSectionContainer = document.getElementById("basket-section-container");
const basketTableBody = document.getElementById('basket-table-body');
const basketTotalSpan = document.getElementById('basket-total');
const basketTotalSpan2 = document.getElementById('basket-total-2');
const emptyBasketMessage = document.getElementById('empty-basket-message');
const checkoutButton = document.getElementById('checkout-button');
const cartCounter = document.getElementById("cart-counter");

// Rx Upload Elements (Asigură-te că aceste ID-uri există în HTML-ul tău conform indicațiilor anterioare)
const rxUploadSection = document.getElementById('rx-upload-section');
const prescriptionUrlInput = document.getElementById('prescription-url');
const fileNameDisplay = document.getElementById('file-name-display');

let currentVisitorId = null;
let allPills = [];
let basket = [];

// --- LOGICA DE START ---
if (!adminId) {
    if (shopContainer) {
        shopContainer.innerHTML = `<div class="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <h2 class="text-2xl font-bold text-gray-800">Pharmacy Not Found</h2>
        </div>`;
    }
} else {
    initShopSession();
}

function initShopSession() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentVisitorId = user.uid;
            loadOnlineProducts();
            loadShopBranding();
        } else {
            signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
        }
    });
}

// --- ÎNCĂRCARE DATE ---
function loadOnlineProducts() {
    const pillsRef = collection(db, `artifacts/${appId}/users/${adminId}/pills_stock`);
    const q = query(pillsRef, where("isInOnlineShop", "==", true));

    onSnapshot(q, (snapshot) => {
        if (!shopContainer) return;
        shopContainer.innerHTML = "";
        allPills = [];

        if (snapshot.empty) {
            shopContainer.innerHTML = `<div class="col-span-full text-center py-12 italic text-gray-400">No products in the shop.</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            allPills.push(data);
            renderProductCard(data);
        });
    });
}

async function loadShopBranding() {
    if (!adminId) return;

    try {
        // 1. Luăm Setările (Nume, Anunț, Adresă, Tel)
        const settingsRef = doc(db, `artifacts/${appId}/users/${adminId}/onlineShopSettings`, "settings");
        const settingsSnap = await getDoc(settingsRef); // Asigură-te că ai importat getDoc sus!

        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            
            // Actualizăm elementele din HTML (folosind ID-urile stabilite anterior)
            if (data.name) {
                const nameEl = document.getElementById('display-shop-name');
                if (nameEl) nameEl.innerText = data.name;
                document.title = data.name + " - Online Shop";
            }
            if (data.announcement) {
                const annEl = document.getElementById('display-shop-announcement');
                if (annEl) annEl.innerText = data.announcement;
            }
            if (data.address) {
                const addrEl = document.getElementById('display-shop-address');
                if (addrEl) addrEl.innerText = data.address;
            }
            if (data.phone) {
                const phoneEl = document.getElementById('display-shop-phone');
                if (phoneEl) phoneEl.innerText = data.phone;
            }
        }

        

    } catch (error) {
        console.error("Error loading shop branding:", error);
    }
}


// --- SEARCH ---
window.searchPills = function () {
    const searchTerm = searchPillsInput.value.toLowerCase().trim();
    if (!shopContainer) return;
    shopContainer.innerHTML = "";

    if (!searchTerm) {
        allPills.forEach(pill => renderProductCard(pill));
        return;
    }

    const filteredPills = allPills.filter(pill => {
        return (pill.name || '').toLowerCase().includes(searchTerm) ||
            (pill.indications || '').toLowerCase().includes(searchTerm) ||
            (pill.pillCategory || '').toLowerCase().includes(searchTerm);
    });

    if (filteredPills.length === 0) {
        shopContainer.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">Nu am găsit niciun produs.</div>`;
    } else {
        filteredPills.forEach(pill => renderProductCard(pill));
    }
};


window.filterProducts = function () {
    const searchTerm = searchPillsInput.value.toLowerCase().trim();
    const selectedCat = document.getElementById('categoryFilter').value;
    const isRxOnly = document.getElementById('rxOnly').checked;
    const sortValue = document.getElementById('priceSort').value;

    if (!shopContainer) return;
    shopContainer.innerHTML = "";

    // 1. Filtrare
    let filteredPills = allPills.filter(pill => {
        const matchesSearch = !searchTerm ||
            (pill.name || '').toLowerCase().includes(searchTerm) ||
            (pill.indications || '').toLowerCase().includes(searchTerm);

        const matchesCategory = (selectedCat === 'all' || pill.pillCategory === selectedCat);

        const matchesRx = !isRxOnly || (isRxOnly && pill.prescriptionStatus === 'Rx');

        return matchesSearch && matchesCategory && matchesRx;
    });

    // 2. Sortare
    if (sortValue === 'low') {
        filteredPills.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortValue === 'high') {
        filteredPills.sort((a, b) => Number(b.price) - Number(a.price));
    }

    // 3. Render
    if (filteredPills.length === 0) {
        shopContainer.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">No products found for these criteria.</div>`;
    } else {
        filteredPills.forEach(pill => renderProductCard(pill));
    }
};

// --- RENDERING CARD ---
function renderProductCard(pill) {
    const isOutOfStock = Number(pill.quantity) <= 0;
    const card = document.createElement('div');
    card.className = "bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 flex flex-col group cursor-pointer";

    card.innerHTML = `
        <div onclick="showPillDetails('${pill.id}')" class="h-44 bg-gray-50 rounded-xl mb-4 flex items-center justify-center p-4 relative overflow-hidden">
             <img src="${pill.finalImageUrl || 'https://via.placeholder.com/150'}" 
                  class="max-h-full object-contain group-hover:scale-110 transition-transform duration-500">
             ${pill.prescriptionStatus === 'Rx' ?
            '<span class="absolute top-2 right-2 bg-red-100 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase">Rx Needed</span>' : ''}
        </div>
        <div class="flex-1" onclick="showPillDetails('${pill.id}')">
            <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">${pill.pillCategory || 'Medication'}</span>
            <h3 class="font-bold text-gray-900 text-lg leading-tight mb-2">${pill.name}</h3>
            <p class="text-xs text-gray-500 line-clamp-2">${pill.indications || 'Fără descriere.'}</p>
        </div>
        <div class="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
            <div>
                <span class="text-[10px] text-gray-400 block uppercase">Price</span>
                <span class="text-xl font-black text-gray-900">$${Number(pill.price).toFixed(2)}</span>
            </div>
            ${isOutOfStock ?
            `<button disabled class="bg-gray-300 text-white text-xs px-5 py-2.5 rounded-xl font-bold cursor-not-allowed">
                    Out Of Stock
                </button>` :
            `<button onclick="addToBasket('${pill.id}')" 
                    class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-100">
                Buy Now
            </button>`
        }
        </div>
    `;
    shopContainer.appendChild(card);
}

// --- BASKET FUNCTIONS ---
window.addToBasket = function (pillId) {
    const pillToAdd = allPills.find(p => p.id === pillId);

    if (!pillToAdd || pillToAdd.quantity <= 0) {
        showBasketMessage("❌ This product is out of stock.");
        return;
    }

    const existingBasketItem = basket.find(item => item.id === pillId);

    if (existingBasketItem) {
        if (existingBasketItem.quantity < pillToAdd.quantity) {
            existingBasketItem.quantity++;
            //showBasketMessage(`✅ New quantity: ${pillToAdd.name}`);
        } else {
            showBasketMessage(`⚠️ Max quantity for ${pillToAdd.name}!`);
        }
    } else {
        basket.push({
            id: pillToAdd.id,
            name: pillToAdd.name,
            price: Number(pillToAdd.price),
            prescriptionStatus: pillToAdd.prescriptionStatus,
            quantity: 1,
            originalStockQuantity: Number(pillToAdd.quantity)
        });
        showBasketMessage(`🌿 ${pillToAdd.name} is added to the basket.`);
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

    basket[itemIndex].quantity = Math.min(newQuantity, pillInStock.quantity);
    renderBasket();
};

window.removeFromBasket = function (pillId) {
    basket = basket.filter(item => item.id !== pillId);
    renderBasket();
};


// --- RENDER BASKET ---
function renderBasket() {
    if (!basketTableBody) return;
    basketTableBody.innerHTML = '';
    let total = 0;

    const hasRx = basket.some(item => item.prescriptionStatus === 'Rx');

    if (basket.length === 0) {
        if (emptyBasketMessage) emptyBasketMessage.classList.remove('hidden');
        if (checkoutButton) checkoutButton.disabled = true;
    } else {
        if (emptyBasketMessage) emptyBasketMessage.classList.add('hidden');
        if (checkoutButton) checkoutButton.disabled = false;

        basket.forEach(item => {
            const subtotal = item.quantity * item.price;
            total += subtotal;

            const row = document.createElement('tr');
            row.className = "hover:bg-gray-50 border-b border-gray-50";
            row.innerHTML = `
                <td class="px-2 py-3 text-sm font-medium text-gray-900 truncate" title="${item.name}">
                    <div class="flex items-center space-x-2">
                        ${item.prescriptionStatus === 'Rx' ? `<span class="px-1 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">Rx</span>` : ''}
                        <span class="truncate">${item.name}</span>
                    </div>
                </td>
                <td class="px-2 py-3 text-center">
                    <input type="number" 
                        min="1" 
                        value="${item.quantity}"
                        oninput="if(parseInt(this.value) > ${item.originalStockQuantity}) { 
                            this.value = ${item.originalStockQuantity}; 
                            showBasketMessage('⚠️ Maximum stock reached!'); 
                        }"
                        onchange="updateBasketItemQuantity('${item.id}', parseInt(this.value))"
                        class="w-10 text-center border rounded-md p-1 text-xs">
                </td>
                <td class="px-2 py-3 text-sm text-gray-500 text-right">$${item.price.toFixed(2)}</td>
                <td class="px-2 py-3 text-sm text-gray-900 font-bold text-right">$${subtotal.toFixed(2)}</td>
                <td class="px-2 py-3 text-center">
                    <button onclick="removeFromBasket('${item.id}')" class="text-red-500 hover:text-red-700 transition p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </td>
            `;
            basketTableBody.appendChild(row);
        });
    }

    // Gestionare secțiune Upload Rx
    if (rxUploadSection) {
        if (hasRx) {
            rxUploadSection.classList.remove('hidden');
        } else {
            rxUploadSection.classList.add('hidden');
            if (prescriptionUrlInput) prescriptionUrlInput.value = "";
        }
    }

    const totalItems = basket.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCounter) cartCounter.textContent = totalItems;
    if (basketTotalSpan) basketTotalSpan.textContent = total.toFixed(2);
    if (basketTotalSpan2) basketTotalSpan2.textContent = total.toFixed(2);
}

// --- UPLOAD IMGBB ---
window.handleRxFileSelect = async function (input) {
    const file = input.files[0];
    if (!file || !fileNameDisplay) return;

    fileNameDisplay.textContent = "Uploading... ⏳";
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            if (prescriptionUrlInput) prescriptionUrlInput.value = result.data.url;
            fileNameDisplay.textContent = "✅ Prescription Ready";
            fileNameDisplay.className = "text-green-600 font-bold italic";
        }
    } catch (err) {
        fileNameDisplay.textContent = "❌ Upload Failed";
        console.error(err);
    }
};

// --- CHECKOUT ---
const basketStep1 = document.getElementById("basket-step-1");
const basketStep2 = document.getElementById("basket-step-2");

window.checkout = async function () {

    const custName = document.getElementById("cust-name").value;
    const custPhone = document.getElementById("cust-phone").value;
    const custAddress = document.getElementById("cust-address").value;
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

    if (!custName || !custPhone || !custAddress) {
        showBasketMessage2("🚨 Please fill in all delivery details (Name, Phone, Address)!");
        return;
    }

    if (paymentMethod == "card") {
        const cardNumber = document.getElementById("card-number").value;
        const cardExpiry = document.getElementById("card-expiry").value;
        const cardCvv = document.getElementById("card-cvv").value;

        if (!cardNumber || !cardExpiry || !cardCvv) {
            showBasketMessage2("🚨 Please complete all card details!");
            return;
        }
    }

    const hasRx = basket.some(item => item.prescriptionStatus === 'Rx');
    const prescriptionUrl = prescriptionUrlInput ? prescriptionUrlInput.value : "";

    if (hasRx && !prescriptionUrl) {
        alert("🚨 Please upload your prescription photo before checking out!");
        return;
    }

    if (!adminId || !currentVisitorId) return alert("Session error. Please refresh.");

    const ordersRef = collection(db, `artifacts/${appId}/users/${adminId}/sales`);


    try {


        console.log("=== VERIFICARE DATE ÎNAINTE DE FIREBASE ===");

        const dataFinala = {
            customerId: currentVisitorId || "lipsa-id",
            customerName: document.getElementById("cust-name")?.value || "lipsa-nume",
            customerPhone: document.getElementById("cust-phone")?.value || "lipsa-tel",
            customerAddress: document.getElementById("cust-address")?.value || "lipsa-adresa",
            paymentMethod: document.querySelector('input[name="payment-method"]:checked')?.value || "cash",
            items: basket || [],
            totalAmount: basket.reduce((sum, i) => sum + (i.price * i.quantity), 0),
            prescriptionUrl: (typeof prescriptionUrlInput !== 'undefined' && prescriptionUrlInput.value) ? prescriptionUrlInput.value : null,
            status: "new",
            onlineshop: true,
            date: "FIREBASE_TIME"
        };

        // Verificăm fiecare câmp să vedem care e undefined
        Object.keys(dataFinala).forEach(key => {
            if (dataFinala[key] === undefined) {
                console.error(`❌ EROARE: Câmpul "${key}" este UNDEFINED!`);
            } else {
                console.log(`✅ ${key}:`, dataFinala[key]);
            }
        });

        if (basket.length === 0) console.error("❌ EROARE: Coșul (basket) este GOL!");
        // --- SFÂRȘIT PRINT DE TEST ---


        await addDoc(ordersRef, {
            customerId: currentVisitorId || "guest",
            customerName: custName || "N/A",
            customerPhone: custPhone || "N/A",
            paymentMethod: paymentMethod || "cash",
            customerAddress: custAddress || "N/A",
            items: basket,
            totalAmount: basket.reduce((sum, i) => sum + (i.price * i.quantity), 0),
            prescriptionUrl: (typeof prescriptionUrl !== 'undefined' && prescriptionUrl) ? prescriptionUrl : null,
            status: "new",
            onlineshop: true,
            date: serverTimestamp()
        });





        for (const item of basket) {
            const pillRef = doc(db, `artifacts/${appId}/users/${adminId}/pills_stock`, item.id);

            // Luăm cantitatea cumpărată și ne asigurăm că e număr negativ pentru scădere
            const qtyToSubtract = Number(item.quantity);

            await updateDoc(pillRef, {
                quantity: increment(-qtyToSubtract)
            });
        }

        showBasketMessage2("Order placed successfully!");
        basket = [];
        renderBasket();
        setTimeout(() => basketSectionContainer.classList.add("hidden"), 2000);
        setTimeout(() => basketStep1.classList.remove("hidden"), 2000);
        setTimeout(() => basketStep2.classList.add("hidden"), 2000);

    } catch (error) {
        console.error("Order error:", error);
        alert("Failed to place order.");
    }
};

// --- MODALS ---
window.showPillDetails = function (id) {
    const pill = allPills.find(p => p.id === id);
    if (!pill) return;
    let prospectLink = "";

    const isOutOfStock = Number(pill.quantity) <= 0;
    detailsModal.classList.remove('hidden');
    document.getElementById("pill-title").innerText = pill.name;
    document.getElementById("pill-image").innerHTML = pill.finalImageUrl
        ? `<img class="max-h-64 mx-auto rounded-xl" src='${pill.finalImageUrl}'>`
        : "<p>No image</p>";

    if (pill.pillProspectLink) {
        prospectLink = `
            <div class="mt-2">
                <a href="${pill.pillProspectLink}" target="_blank" rel="noopener noreferrer" 
                class="inline-flex items-center text-[10px] font-bold text-gray-500 hover:text-[#448132] transition-colors group/link">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 text-gray-400 group-hover/link:text-[#448132]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="uppercase tracking-widest border-b border-transparent group-hover/link:border-[#448132]">
                        Read Prospectus
                    </span>
                </a>
            </div>`;
    }
    document.getElementById("details-content").innerHTML = `
        <div class="text-sm space-y-1 text-gray-600">
            <p><b>Status:</b> ${pill.prescriptionStatus || 'OTC'}</p>
            <p><b>Indications:</b> ${pill.indications || 'N/A'}</p>
            <p><b>Contraindications:</b> ${pill.contraindications || 'N/A'}</p>
            <p><b>Active Substance:</b> ${pill.pillActiveSubstance || 'N/A'}</p>
            <p><b>Category:</b> ${pill.pillCategory || 'N/A'}</p>
            <p> <b>Form:</b> ${pill.form || 'N/A'}</p>
            <p> ${prospectLink} </p>
        </div>
        ${isOutOfStock ?
            `<button disabled class="bg-gray-300 text-white text-xs px-5 py-2.5 rounded-xl font-bold cursor-not-allowed">
                    Out Of Stock
                </button>` :
            `<button onclick="addToBasket('${pill.id}')" 
                    class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-100">
                Buy Now
            </button>`
        }
    `;
};

window.closeModal = () => detailsModal.classList.add('hidden');
window.openBasket = () => basketSectionContainer.classList.remove("hidden");
window.closeBasket = () => basketSectionContainer.classList.add("hidden");

window.showMessageBasket = function (msg) {
    const msgBox = document.getElementById('basket-modal');
    const msgText = document.getElementById('basket-message');

    if (msgBox && msgText) {
        msgText.textContent = msg;
        msgBox.classList.remove('hidden');

        // Mesajul dispare automat după 3 secunde
        setTimeout(() => {
            msgBox.classList.add('hidden');
        }, 3000);
    }
};


function showBasketMessage(msg) {
    const msgBox = document.getElementById('basket-modal');
    const msgText = document.getElementById('basket-message');
    if (!msgBox || !msgText) return;

    msgText.textContent = msg;
    msgBox.classList.remove('hidden');
    setTimeout(() => {
        msgBox.classList.add('hidden');
    }, 3000);
}


function showBasketMessage2(msg) {
    const msgBox = document.getElementById('basket-modal-2');
    const msgText = document.getElementById('basket-message-2');
    if (!msgBox || !msgText) return;

    msgText.textContent = msg;
    msgBox.classList.remove('hidden');
    setTimeout(() => {
        msgBox.classList.add('hidden');
    }, 3000);
}
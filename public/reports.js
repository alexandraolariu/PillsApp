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
const expiryLoss = document.getElementById("expiry-loss");
const stockValue = document.getElementById("stock-value");
const expiryLossBar = document.getElementById("expiry-loss-bar");
const percentLossRate = document.getElementById("percent-loss-rate");
const inventoryItems = document.getElementById("inventory-items");
const todaySalesRate = document.getElementById("today-sales-rate");
const receiptsModal = document.getElementById("receipts-modal");
const receiptsModalContent = document.getElementById("receipts-modal-content");
const total = document.getElementById("total");


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
    expiryLoss.innerHTML = '';
    let expirypillstotal = 0;
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
            const daysLeft = Math.round((new Date(pill.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            addPillsInTable(pill.id, pill, expiringBody);

            if (daysLeft <= 30) {
                expirypillstotal = expirypillstotal + pill.quantity * pill.price;
            }
        });
    }

    expiryLoss.innerHTML = expirypillstotal + " $";
    console.log(expirypillstotal);

    sortAscending = !sortAscending;

    return expirypillstotal;
}



function addPillsInTable(id, filteredPills, targetBody) {
    let classToAddQuantity = '';
    let classToAddExpiry = '';
    const daysLeft = Math.round((new Date(filteredPills.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    let daysLeftShow = "<p class='font-bold'>" + daysLeft + " day(s)</p>";

    if (daysLeft <= 30) {
        classToAddExpiry = "text-red";
    } else if (daysLeft <= 60) {
        classToAddExpiry = "text-orange-400";
    } else if (daysLeft <= 90) {
        classToAddExpiry = "text-yellow-500";
    } else {
        classToAddExpiry = "text-gray-400";
    }

    if (filteredPills.quantity <= 5) {
        classToAddQuantity = "text-red";
    } else if (filteredPills.quantity <= 10) {
        classToAddQuantity = "text-orange-400";
    } else if (filteredPills.quantity <= 20) {
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


//Chart for Stock Overview
let myChart;
function renderDonutChart(totalValue, expiredLoss) {
    const ctx = document.getElementById('myDonutChart').getContext('2d');

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Stock Valid', 'Expired/Expiring'],
            datasets: [{
                data: [totalValue - expiredLoss, expiredLoss],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                cutout: '60%'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}


let salesChartInstance = null; // Trebuie să fie în afara funcției!

function renderSalesChart(weeklySales) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Dacă graficul există deja, doar îi dăm datele noi și îi facem update
    if (salesChartInstance) {
        salesChartInstance.data.datasets[0].data = weeklySales;
        salesChartInstance.update(); // Această metodă e mult mai "blândă" decât destroy/create
        return;
    }

    // Dacă nu există, îl creăm prima dată
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            datasets: [{
                label: 'Sales ($)',
                data: weeklySales,
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Forțează-l să stea în div-ul tău
            animation: {
                duration: 1000 // Face tranziția lină când se schimbă datele
            }
        }
    });
}






window.openModalReceipts = openModalReceipts;
window.closeModal = closeModal;
function openModalReceipts(){
    receiptsModal.classList.remove('hidden');

}

function closeModal(){
    receiptsModal.classList.add('hidden');
}


window.printReceipts = function () {
    const printContent = document.getElementById('receipt-print').innerHTML;
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




function setupFirestoreListener(currentUserId) {
    if (!currentUserId) {
        console.error("User ID is not available for Firestore listener.");
        errorMessageDisplay.textContent = "Cannot load stock data: User not authenticated.";
        errorMessageDisplay.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
        return;
    }

    const pillsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/pills_stock`);
    const salesCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/sales`);
    const q = query(pillsCollectionRef);

    onSnapshot(q, (snapshot) => {
        //loadingIndicator.classList.add('hidden');
        allPills = [];
        snapshot.forEach(doc => {
            allPills.push({ id: doc.id, ...doc.data() });
        });

        const totalStockValue = allPills.reduce((sum, pill) => {
            const price = Number(pill.price) || 0;
            const qty = Number(pill.quantity) || 0;
            return sum + (price * qty);
        }, 0);

        const totalStockUnits = allPills.reduce((sum, pill) => {
            const qty = Number(pill.quantity) || 0;
            return sum + qty;
        }, 0)


        stockValue.innerHTML = totalStockValue + " $";
        inventoryItems.innerHTML = totalStockUnits;

        const lostValue = filterPillsExpiryDate();
        let lostPercent = (lostValue / totalStockValue * 100).toFixed(2);

        expiryLossBar.style.width = lostPercent + "%";
        percentLossRate.innerHTML = lostPercent + "%";

        renderDonutChart(totalStockValue, lostValue);
        filterPillsLowQuantity(allPills);
        filterPillsExpiryDate(allPills);

    }, (error) => {
        console.error("Error fetching pills:", error);
        errorMessageDisplay.textContent = `Failed to load pills: ${error.message}`;
        errorMessageDisplay.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    });



    onSnapshot(salesCollectionRef, (salesSnapshot) => {
        receiptsModalContent.innerHTML = "";
        const weeklySales = [0, 0, 0, 0, 0, 0, 0];
        let todaySales = 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        salesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.date && data.totalAmount) {
                const saleDate = data.date.toDate();

                const tempSaleDate = saleDate;
                tempSaleDate.setHours(0, 0, 0, 0);

                if (today.getTime() == tempSaleDate.getTime()) {
                    todaySales = todaySales + Number(data.totalAmount);
                    const formattedHour = data.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    receiptsModalContent.innerHTML += `<tr><td>${doc.id}</td><td>${formattedHour}</td><td>${data.paymentMethod}</td><td>${data.totalAmount} $</td></tr>`;

                }
                todaySalesRate.innerHTML = todaySales + " $";
                total.innerHTML = todaySales + " $";
                if (saleDate >= sevenDaysAgo) {
                    let dayIndex = saleDate.getDay() - 1;
                    if (dayIndex === -1) dayIndex = 6;
                    weeklySales[dayIndex] += Number(data.totalAmount) || 0;
                }
            }
        });

        renderSalesChart(weeklySales);
    });
}
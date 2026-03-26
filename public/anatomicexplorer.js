const containerFrontImage = document.getElementById("container-front-image");
const containerBackImage = document.getElementById("container-back-image");
const buttonShow = document.getElementById("button-show");
const buttonGenerateDiagnose = document.getElementById("button-diagnose");

function selectPart(text) {
    document.getElementById('description').textContent = text;
}

function showOtherSide() {
    if (containerBackImage.classList.contains('hidden')) {
        containerBackImage.classList.remove('hidden');
        containerFrontImage.classList.add('hidden');
        buttonShow.innerText = "Show Front";
    } else {
        containerBackImage.classList.add('hidden');
        containerFrontImage.classList.remove('hidden');
        buttonShow.innerText = "Show Back";
    }
}

const apiKey = "AIzaSyCZT-9uCKD0R37Cw5fE_xEItrbBvddFWtU";

const resultContainer = document.getElementById("result-container");
const responseDiv = document.getElementById('ai-response');
const loading = document.getElementById("loading");


// async function analyseSymptoms() {
//     buttonGenerateDiagnose.disabled = true;
//     buttonGenerateDiagnose.classList.add("opacity-50");

//     const bodyPart = document.getElementById("description").textContent;
//     const symptoms = document.getElementById("symptoms-text").value.trim();
//     const age = document.getElementById("age").value || "not specified";
//     const weight = document.getElementById("weight").value || "not specified";
//     const allergies = document.getElementById("allergies").value || "not specified";
//     const chronicConditions = document.getElementById("chronic-conditions").value || "not specified";
//     const currentMedication = document.getElementById("current-medication").value || "not specified";

//     const AIPrompt = `
// You are a medical assistant.
// The user selected the area: ${bodyPart}.
// The symptoms described: ${symptoms}.
// Age: ${age}.
// Weight: ${weight}.
// Allergies: ${allergies}.
// Chronic Conditions: ${chronicConditions}.
// Current Medication: ${currentMedication}.

// Provide a possible explanation of symptoms and general advice.
// Do NOT give a final diagnosis. Encourage seeing a doctor.
// Structure:
// 1. Possible causes.
// 2. Recommendations.
// `;

//     try {
//         loading.classList.remove("hidden");

//         const response = await fetch("https://us-central1-pillsproject.cloudfunctions.net/diagnose", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt: AIPrompt })
//         });

//         const data = await response.json();
//         const responseText = data?.choices?.[0]?.message?.content || "No response from AI.";

//         responseDiv.innerHTML = responseText
//             .replace(/\n/g, "<br>")
//             .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
//             .replace(/\* (.*?)/g, "• $1");

//         resultContainer.classList.remove("hidden");

//     } catch (error) {
//         console.error("Detailed Error", error);
//         responseDiv.innerHTML = `<div class="text-red-600 font-medium">There is an error with AI generator: ${error.message}.</div>`;
//         resultContainer.classList.remove("hidden");
//     } finally {
//         loading.classList.add("hidden");
//         buttonGenerateDiagnose.disabled = false;
//         buttonGenerateDiagnose.classList.remove("opacity-50");
//     }
// }





// async function analyseSymptoms() {
//     buttonGenerateDiagnose.disabled = true;
//     buttonGenerateDiagnose.classList.add("opacity-50");

//     const bodyPart = document.getElementById("description").textContent;
//     const symptoms = document.getElementById("symptoms-text").value.trim();
//     const age = document.getElementById("age").value || "not specified";
//     const weight = document.getElementById("weight").value || "not specified";
//     const allergies = document.getElementById("allergies").value || "not specified";
//     const chronicConditions = document.getElementById("chronic-conditions").value || "not specified";
//     const currentMedication = document.getElementById("current-medication").value || "not specified";


//     const AIPrompt = `You are a medical assistant.
//     The user selected the area: ${bodyPart}.
//     The symptoms described: ${symptoms}.
//     Age of person: ${age}.
//     Weight: ${weight}.
//     Allergies: ${allergies}.
//     Chronic Conditions: ${chronicConditions}.
//     Current Medication: ${currentMedication}.

//     Please give a diagnostic and recommended treatment.
//     The structure of your response:
//     1. Diagnostic.
//     2. Recommended pills/treatment.
//     `;

//     console.log(AIPrompt);
//     try {
//         let success = false;
//         let retries = 0;
//         let responseText = "";
//         loading.classList.remove("hidden");

//         // Implementare Exponential Backoff pentru stabilitate
//         while (!success && retries < 5) {
//             try {
//                 const response = await fetch(
//                     `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
//                     {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json" },
//                         body: JSON.stringify({
//                             contents: [
//                                 {
//                                     parts: [
//                                         {
//                                             text: AIPrompt
//                                         }
//                                     ]
//                                 }
//                             ]
//                         })
//                     }
//                 );


//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error?.message || "Eroare la server");
//                 }

//                 const data = await response.json();
//                 responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
//                 if (responseText) {
//                     success = true;
//                 }
//             } catch (err) {
//                 retries++;
//                 if (retries >= 5) throw err;
//                 await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
//             }
//         }

//         if (success) {
//             // Convertire simplă Markdown în HTML pentru afișare
//             responseDiv.innerHTML = responseText
//                 .replace(/\n/g, '<br>')
//                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
//                 .replace(/\* (.*?)/g, '• $1');
//             //loading.classList.add("hidden");
//             resultContainer.classList.remove('hidden');
//         }

//     } catch (error) {
//         console.error("Detailed Error", error);
//         responseDiv.innerHTML = `<div class="text-red-600 font-medium">There is an error with AI generator: ${error.message}.</div>`;
//         resultContainer.classList.remove('hidden');
//     } finally {
//         loading.classList.add('hidden');
//         buttonGenerateDiagnose.disabled = false;
//         buttonGenerateDiagnose.classList.remove('opacity-50');
//     }


// }

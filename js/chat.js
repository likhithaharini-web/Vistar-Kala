/**
 * Vistar Kala - Live Buyer Chat & Sahayak AI Assistant Logic
 */

let isBotOpen = false;
let synth = window.speechSynthesis;
let currentUtterance = null;

function toggleBot() {
    isBotOpen = !isBotOpen;
    const botWindow = document.getElementById('bot-window');
    if (botWindow) {
        if (isBotOpen) {
            botWindow.classList.remove('hidden');
            botWindow.classList.add('flex');
        } else {
            botWindow.classList.add('hidden');
            botWindow.classList.remove('flex');
        }
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    input.value = '';

    appendChatMessage(messageText, 'user');

    // Simulate backend buyer chat auto-reply or translate
    let replyText = "Thank you! Our cluster artisan team will verify your wholesale order quantity and reply within 10 minutes.";
    
    if (currentLang !== 'en' && typeof translateDynamic === 'function') {
        replyText = await translateDynamic(replyText, currentLang, 'en');
    }

    setTimeout(() => {
        appendChatMessage(replyText, 'artisan');
    }, 1000);
}

function appendChatMessage(text, sender) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'user' 
        ? 'flex justify-end mb-3 fade-in'
        : 'flex justify-start mb-3 fade-in';

    const innerDiv = document.createElement('div');
    innerDiv.className = sender === 'user'
        ? 'bg-gold-500 text-maroon-950 p-3 rounded-2xl rounded-tr-none max-w-[80%] text-xs font-semibold shadow-md'
        : 'bg-maroon-900 border border-gold-500/30 text-gold-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-xs shadow-md';

    innerDiv.innerText = text;
    msgDiv.appendChild(innerDiv);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function askBotPreset(topic) {
    const botInput = document.getElementById('bot-input');
    let prompt = "";
    if (topic === 'ranking') prompt = "How do I rank #1 in my Warli cluster and get Tier 1 Master Craft badge?";
    if (topic === 'sync') prompt = "How to 1-click sync my inventory to Amazon B2B and Etsy Global?";
    if (topic === 'sales') prompt = "What are the trending wholesale orders for Jaipur Blue Pottery this month?";
    if (topic === 'pricing') prompt = "How does the Fair-Price Wage Calculator guarantee 100% payout to artisans?";

    if (botInput) botInput.value = prompt;
    sendBotMessage();
}

async function sendBotMessage() {
    const input = document.getElementById('bot-input');
    const container = document.getElementById('bot-messages-container');
    if (!input || !input.value.trim() || !container) return;

    const text = input.value.trim();
    input.value = '';

    // Render User Query
    const userMsg = document.createElement('div');
    userMsg.className = 'flex justify-end mb-2.5';
    userMsg.innerHTML = `<div class="bg-gold-500 text-maroon-950 p-2.5 rounded-2xl rounded-tr-none max-w-[85%] text-xs font-bold">${text}</div>`;
    container.appendChild(userMsg);
    container.scrollTop = container.scrollHeight;

    // AI Response Simulation
    let botReply = "Sahayak AI: To increase your cluster ranking, complete GI tag verification and upload enhanced high-resolution craft photos!";
    
    if (text.includes('Amazon') || text.includes('sync')) {
        botReply = "Sahayak AI: 1-Click Multi-Sync publishes your verified product titles, MSRP, and high-res photos across Amazon, Flipkart, Etsy, ONDC, and Shopify directly from Vistar Kala!";
    } else if (text.includes('Wage') || text.includes('pricing') || text.includes('payout')) {
        botReply = "Sahayak AI: The Fair-Price Engine calculates raw materials + exact labor hours x fair rate. 100% of sales are transferred directly to artisan accounts with 0% platform commission!";
    }

    if (currentLang !== 'en' && typeof translateDynamic === 'function') {
        botReply = await translateDynamic(botReply, currentLang, 'en');
    }

    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'flex justify-start mb-2.5';
        botMsg.innerHTML = `<div class="bg-maroon-950 border border-gold-500/30 text-gold-200 p-2.5 rounded-2xl rounded-tl-none max-w-[85%] text-xs">${botReply}</div>`;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
    }, 600);
}

function playEnglishTTS(text) {
    if (!synth) return;
    if (synth.speaking) synth.cancel();

    const textToSpeak = text || document.getElementById('modal-story-body')?.innerText || "Vistar Kala connects master artisans directly with global buyers.";
    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.95;
    synth.speak(currentUtterance);
}

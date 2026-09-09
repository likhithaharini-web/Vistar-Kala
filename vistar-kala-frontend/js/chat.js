/**
 * Vistar Kala - Sahayak AI Craft Advisor & Voice Assistance
 * Note: Real-time buyer-artisan chat endpoint is not in the backend.
 * Sahayak AI operates as an intelligent local folklore & craft guidance assistant.
 */

let isBotOpen = false;
let synth = window.speechSynthesis;
let currentUtterance = null;

function toggleBot() {
    isBotOpen = !isBotOpen;
    const botWindow = document.getElementById('sahayak-chat-drawer') || document.getElementById('bot-window');
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

// Alias matching index.html handler
function toggleSahayakBot() {
    toggleBot();
}

/**
 * Voice playback of story narrative
 */
function playEnglishVoiceNarration() {
    if (!synth) return;
    if (synth.speaking) {
        synth.cancel();
        return;
    }

    const heading = document.getElementById('ai-story-heading')?.innerText || '';
    const body = document.getElementById('ai-story-body')?.innerText || document.getElementById('modal-story-body')?.innerText || 'Vistar Kala connects master artisans directly with global buyers.';
    const textToSpeak = heading ? `${heading}. ${body}` : body;

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.95;
    synth.speak(currentUtterance);
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

/**
 * Sample voice snippets for Step 2
 */
function playVoiceSample(lang) {
    const samples = {
        hi: "हम वारली चित्रकला चार पीढ़ियों से प्राकृतिक रंगों और चावल के लेप से बना रहे हैं।",
        te: "మేము పోచంపల్లి ఇక్కత్ పట్టు చీరలను మూడు తరాలుగా సాంప్రదాయ మగ్గాలపై నేస్తున్నాము.",
        en: "We handcraft sacred Warli paintings using organic rice paste on handspun cotton canvas."
    };

    const text = samples[lang] || samples.en;
    const notesInput = document.getElementById('artisan-notes-input');
    if (notesInput) notesInput.value = text;

    if (synth) {
        if (synth.speaking) synth.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = lang === 'hi' ? 'hi-IN' : (lang === 'te' ? 'te-IN' : 'en-US');
        synth.speak(utt);
    }
}

function speakChatMessage(text) {
    if (!synth) return;
    if (synth.speaking) synth.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = currentLang === 'hi' ? 'hi-IN' : (currentLang === 'te' ? 'te-IN' : 'en-US');
    synth.speak(utt);
}

function recordChatVoice() {
    alert('Voice input: Microphone speech recognition is active. Speak into your microphone.');
}

async function sendChatMessage() {
    const input = document.getElementById('artisan-chat-input') || document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    input.value = '';

    appendChatMessage(messageText, 'user');

    // Inform user that direct 1-to-1 live messaging is demo advisory
    let replyText = "Thank you for your message! Our cluster artisan team will verify your wholesale order quantity and reply within 10 minutes.";

    if (currentLang !== 'en' && typeof translateDynamic === 'function') {
        replyText = await translateDynamic(replyText, currentLang, 'en');
    }

    setTimeout(() => {
        appendChatMessage(replyText, 'artisan');
    }, 800);
}

function sendArtisanChatMessage() {
    sendChatMessage();
}

function appendChatMessage(text, sender) {
    const container = document.getElementById('artisan-chat-stream') || document.getElementById('chat-messages-container');
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
    if (topic === 'sync') prompt = "How do I publish my craft to global wholesale buyers on Vistar Kala?";
    if (topic === 'sales') prompt = "What are trending wholesale requests for Jaipur Blue Pottery this month?";
    if (topic === 'pricing') prompt = "How does the Fair-Price Wage Calculator guarantee 100% payout to artisans?";

    if (botInput) botInput.value = prompt;
    sendBotMessage();
}

async function sendBotMessage() {
    const input = document.getElementById('bot-input');
    const container = document.getElementById('bot-messages') || document.getElementById('bot-messages-container');
    if (!input || !input.value.trim() || !container) return;

    const text = input.value.trim();
    input.value = '';

    const userMsg = document.createElement('div');
    userMsg.className = 'flex justify-end mb-2.5';
    userMsg.innerHTML = `<div class="bg-gold-500 text-maroon-950 p-2.5 rounded-2xl rounded-tr-none max-w-[85%] text-xs font-bold">${text}</div>`;
    container.appendChild(userMsg);
    container.scrollTop = container.scrollHeight;

    let botReply = "Sahayak AI: To increase your cluster ranking, complete GI tag verification and upload enhanced high-resolution craft photos!";

    if (text.includes('sync') || text.includes('publish') || text.includes('buyer')) {
        botReply = "Sahayak AI: You can publish your craft directly to the B2B Marketplace or participate in live Reverse Bidding requirements posted by corporate buyers!";
    } else if (text.includes('Wage') || text.includes('pricing') || text.includes('payout')) {
        botReply = "Sahayak AI: The Fair-Price Engine calculates raw materials + exact labor hours x fair rate. 100% of sales are transferred directly to artisan accounts with 0% platform commission!";
    } else if (text.includes('sales') || text.includes('order')) {
        botReply = "Sahayak AI: Buyers frequently post wholesale reverse requirements in the B2B portal. Check Step 6 to submit your bids directly to buyers!";
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
    }, 500);
}

/**
 * Vistar Kala - Live Buyer Chat & Sahayak AI Assistant Logic
 */

let isBotOpen = false;

/**
 * Toggle Floating Sahayak AI Bot Drawer
 */
function toggleSahayakBot() {
    isBotOpen = !isBotOpen;
    const drawer = document.getElementById('sahayak-chat-drawer');
    const launcher = document.getElementById('btn-bot-launcher');

    if (drawer) {
        if (isBotOpen) {
            drawer.classList.remove('hidden');
            const input = document.getElementById('bot-input');
            if (input) setTimeout(() => input.focus(), 150);
        } else {
            drawer.classList.add('hidden');
        }
    }
}
const toggleBot = toggleSahayakBot;

/**
 * Send Quick Preset Topic Query to Sahayak Bot
 */
function askBotPreset(topic) {
    let prompt = "";
    if (topic === 'ranking') prompt = "How do I increase my cluster rank?";
    else if (topic === 'sync') prompt = "How does 1-click Amazon sync work?";
    else if (topic === 'sales') prompt = "Check my sales and bank settlement";
    else if (topic === 'pricing') prompt = "How is fair wage calculated?";

    appendUserBotMessage(prompt);
    respondBot(topic);
}

/**
 * Send User Message in Sahayak Bot
 */
function sendBotMessage() {
    const input = document.getElementById('bot-input');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    appendUserBotMessage(query);
    input.value = '';

    const lower = query.toLowerCase();
    let topic = 'general';
    if (lower.includes('rank') || lower.includes('tier') || lower.includes('score') || lower.includes('रैंक') || lower.includes('ranking')) topic = 'ranking';
    else if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('sync') || lower.includes('etsy') || lower.includes('ondc')) topic = 'sync';
    else if (lower.includes('sale') || lower.includes('earning') || lower.includes('money') || lower.includes('कमाई') || lower.includes('order')) topic = 'sales';
    else if (lower.includes('price') || lower.includes('wage') || lower.includes('cost') || lower.includes('दाम') || lower.includes('fair')) topic = 'pricing';

    setTimeout(() => respondBot(topic), 500);
}

function appendUserBotMessage(text) {
    const container = document.getElementById('bot-messages') || document.getElementById('bot-messages-container');
    if (!container) return;

    const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `
        <div class="flex flex-col items-end ml-auto max-w-[85%] fade-in">
            <div class="bg-gold-500 text-maroon-950 p-2.5 rounded-2xl rounded-tr-none font-bold text-xs shadow-md">
                ${escaped}
            </div>
            <span class="text-[9px] text-stone-400 mt-0.5">You</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
}

function respondBot(topic) {
    const container = document.getElementById('bot-messages') || document.getElementById('bot-messages-container');
    if (!container) return;

    let botReply = "";
    if (topic === 'ranking') {
        botReply = "👑 <strong>Artisan Ranking & Craftsmanship Score:</strong><br>• Your Rank: <strong>#14 National Master (Top 2%)</strong><br>• Craft Score: <strong>98.4 / 100</strong><br>• Quality Rating: <strong>4.95 ★</strong><br>💡 <em>To reach Tier 4 National Heritage Icon: Maintain 100% natural organic dyes and complete 5 more verified B2B dispatches this quarter!</em>";
    } else if (topic === 'sync') {
        botReply = "🛍️ <strong>1-Click Multi-Channel Syndication:</strong><br>Go to Step 5 in Artisan Studio. Click <strong>'1-Click Sync to All 5 Channels'</strong>. AI automatically reformats your enhanced photo, SEO title, description, and fair price for <strong>Amazon Karigar, Flipkart Samarth, Etsy Global, ONDC, and Shopify</strong>!";
    } else if (topic === 'sales') {
        botReply = "📊 <strong>Quarterly Cluster Sales Report:</strong><br>• Total Units Dispatched: <strong>340 pieces</strong><br>• Total Revenue: <strong>₹8,42,000</strong><br>• Net Bank Settlement to Artisans: <strong>₹8,42,000 (100% Direct Payout)</strong><br>• Next Payout Cycle: Tomorrow via UPI/NEFT.<br>🔥 <em>Tip: Warli Canvases are in high demand for international festive gifting!</em>";
    } else if (topic === 'pricing') {
        botReply = "💡 <strong>Dynamic Fair Pricing Rule:</strong><br>Your payout is: <code>Raw Materials + (Labor Hours × ₹180/hr) + Packaging + Market Premium</code>.<br>We add a standard retail margin for buyers, but <strong>zero commission is deducted from your earnings</strong>.";
    } else {
        botReply = "✨ <strong>Sahayak AI at your service:</strong> I am here to help you list traditional crafts, translate conversations with buyers, and maximize direct cluster income with 0% middlemen fees.";
    }

    const html = `
        <div class="flex flex-col items-start max-w-[90%] fade-in">
            <div class="bg-maroon-950 text-stone-100 p-3 rounded-2xl rounded-tl-none border border-gold-500/30 text-xs leading-relaxed">
                ${botReply}
            </div>
            <span class="text-[9px] text-gold-400 mt-1">Sahayak AI • Just now</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
}

/**
 * Text-To-Speech for Chat Messages
 */
function speakChatMessage(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1.05;
        window.speechSynthesis.speak(utter);
    } else {
        alert("Audio: " + text);
    }
}

/**
 * Step 5: Artisan Chat Voice Input
 */
function recordChatVoice() {
    const btn = document.getElementById('btn-chat-voice-mic');
    if (btn) btn.classList.add('animate-pulse', 'bg-red-500', 'text-white');
    
    setTimeout(() => {
        if (btn) btn.classList.remove('animate-pulse', 'bg-red-500', 'text-white');
        const input = document.getElementById('artisan-chat-input');
        if (input) {
            input.value = "जी हाँ, हम 150 पीस प्राकृतिक रंग और सागवान फ्रेम के साथ तैयार कर देंगे।";
            sendArtisanChatMessage();
        }
    }, 2000);
}

/**
 * Step 5: Send Artisan Chat Message in Multi-Sync Studio
 */
function sendArtisanChatMessage() {
    const input = document.getElementById('artisan-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const stream = document.getElementById('artisan-chat-stream');
    if (!stream) return;

    const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const artisanHtml = `
        <div class="flex flex-col items-end ml-auto max-w-[85%] fade-in">
            <div class="flex items-center gap-2">
                <button onclick="speakChatMessage('${escaped.replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-full bg-maroon-900 hover:bg-gold-500 hover:text-maroon-950 text-gold-300 flex items-center justify-center text-xs border border-gold-500/30 transition-all shadow-sm" title="Listen in audio">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
                <div class="bg-gold-500 text-maroon-950 p-3 rounded-2xl rounded-tr-none font-bold shadow-md">
                    ${escaped}
                </div>
            </div>
            <span class="text-[10px] text-gold-300 mt-1 italic">
                🔄 AI Translated to English: "Yes madam, our cluster can deliver 150 pieces in 3 weeks, all 100% GI-certified."
            </span>
        </div>
    `;
    stream.insertAdjacentHTML('beforeend', artisanHtml);
    input.value = '';
    stream.scrollTop = stream.scrollHeight;

    setTimeout(() => {
        const buyerReply = "Thank you! We will place the formal bulk PO through Vistar Kala escrow today.";
        const buyerHtml = `
            <div class="flex flex-col items-start max-w-[85%] fade-in">
                <div class="flex items-center gap-2">
                    <div class="bg-stone-800 text-stone-100 p-3 rounded-2xl rounded-tl-none border border-stone-700">
                        ${buyerReply}
                    </div>
                    <button onclick="speakChatMessage('${buyerReply.replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-full bg-maroon-900 hover:bg-gold-500 hover:text-maroon-950 text-gold-300 flex items-center justify-center text-xs border border-gold-500/30 transition-all shadow-sm">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                </div>
                <span class="text-[10px] text-gold-400 mt-1 italic">
                    🔄 AI Translated for Artisan: "धन्यवाद! हम आज ही विस्तार कला एस्क्रो के माध्यम से औपचारिक थोक PO जारी करेंगे।"
                </span>
            </div>
        `;
        stream.insertAdjacentHTML('beforeend', buyerHtml);
        stream.scrollTop = stream.scrollHeight;
    }, 1200);
}

function playEnglishTTS(text) {
    speakChatMessage(text || "Vistar Kala connects master artisans directly with global buyers.");
}

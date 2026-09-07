/**
 * Vistar Kala - API Integration & Network Service Layer
 */

const API_BASE = 'http://localhost:4000/api';

let authToken = localStorage.getItem('vk_token') || null;
let currentUser = JSON.parse(localStorage.getItem('vk_user') || 'null');

/**
 * Updates authentication state in memory and localStorage
 */
function setAuthState(token, user) {
    authToken = token;
    currentUser = user;
    if (token) {
        localStorage.setItem('vk_token', token);
    } else {
        localStorage.removeItem('vk_token');
    }
    if (user) {
        localStorage.setItem('vk_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('vk_user');
    }
}

/**
 * Universal fetch wrapper for Vistar Kala Backend API
 * Automatically attaches Authorization header if token exists.
 */
async function apiFetch(endpoint, options = {}) {
    const headers = options.headers || {};
    
    if (authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Do not set Content-Type for FormData (browser sets boundary automatically)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type');
        let data = null;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        return data;
    } catch (err) {
        console.warn(`[API] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
        throw err;
    }
}

// ─── DYNAMIC TRANSLATION SERVICE ────────────────────────────────────────────
const _txCache = new Map();

/**
 * Dynamic translation via backend /api/translate
 * Falls back to original text gracefully if backend is unreachable.
 */
async function translateDynamic(text, targetLang, sourceLang = null) {
    if (!text || !text.trim()) return text;
    if (sourceLang && sourceLang === targetLang) return text;
    if (targetLang === 'en' && sourceLang === 'en') return text;

    const cacheKey = `${sourceLang || 'auto'}|${targetLang}|${text.trim()}`;
    if (_txCache.has(cacheKey)) return _txCache.get(cacheKey);

    try {
        const data = await apiFetch('/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: text.trim(),
                targetLanguage: targetLang,
                ...(sourceLang ? { sourceLanguage: sourceLang } : {})
            })
        });

        const translated = data.translatedText || text;
        _txCache.set(cacheKey, translated);
        return translated;
    } catch (_err) {
        return text;
    }
}

async function translateBatch(texts, targetLang, sourceLang = null) {
    return Promise.all(texts.map(t => translateDynamic(t, targetLang, sourceLang)));
}

// ─── PRODUCT & MARKETPLACE APIS ──────────────────────────────────────────────

/**
 * Fetches product catalog from backend API
 */
async function fetchProductsAPI(category = null) {
    let url = '/products';
    if (category && category !== 'all') {
        url += `?category=${encodeURIComponent(category)}`;
    }
    return await apiFetch(url, { method: 'GET' });
}

/**
 * Posts new product with Cloudinary image upload (via FormData)
 */
async function createProductAPI(formData) {
    return await apiFetch('/products', {
        method: 'POST',
        body: formData
    });
}

/**
 * Creates live Heritage auction for a product
 */
async function createAuctionAPI(auctionData) {
    return await apiFetch('/auctions', {
        method: 'POST',
        body: JSON.stringify(auctionData)
    });
}

// ─── AUTHENTICATION APIS ─────────────────────────────────────────────────────

async function requestOtpAPI(phone, role) {
    return await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, role })
    });
}

async function verifyOtpAPI(phone, role, otp) {
    const data = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, role, otp })
    });
    if (data.token) {
        setAuthState(data.token, data.user);
    }
    return data;
}

// ─── CHAT & NOTIFICATION APIS ────────────────────────────────────────────────

async function sendNotificationAPI(notificationData) {
    return await apiFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
    });
}

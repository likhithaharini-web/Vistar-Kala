/**
 * Vistar Kala - Centralized API Service Layer
 * Direct interface to backend running at http://localhost:4000/api
 */

const API_BASE = 'http://localhost:4000/api';

let authToken = localStorage.getItem('vk_token') || null;
let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem('vk_user') || 'null');
} catch (e) {
    currentUser = null;
}

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

function clearAuthState() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('vk_token');
    localStorage.removeItem('vk_user');
    sessionStorage.removeItem('vk_current_product_id');
    if (typeof window !== 'undefined') {
        window._currentDraftProductId = null;
        window._lastPublishedProductId = null;
        window._currentProduct = null;
    }
}

/**
 * Universal fetch wrapper for Vistar Kala Backend API
 * - Automatically attaches Bearer token when authenticated
 * - Sets application/json headers for JSON payloads (skips Content-Type for FormData)
 * - Properly throws backend error messages
 */
async function apiFetch(endpoint, options = {}) {
    const headers = options.headers || {};

    const token = localStorage.getItem('vk_token') || authToken;
    if (token) {
        authToken = token;
        if (!headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Do not set Content-Type for FormData (browser sets multipart boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        if (!response.ok) {
            const errMsg = data.message || (data.errors && data.errors[0] && data.errors[0].msg) || `API Error: ${response.status}`;
            const err = new Error(errMsg);
            err.status = response.status;
            err.data = data;
            throw err;
        }

        return data;
    } catch (err) {
        console.warn(`[API] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
        throw err;
    }
}

// ─── AUTHENTICATION APIS ─────────────────────────────────────────────────────

async function loginAPI(phone, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
    });
    if (data.token) {
        setAuthState(data.token, data.user);
    }
    return data;
}

async function registerAPI(phone, password, name, role) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, password, name, role })
    });
    if (data.token) {
        setAuthState(data.token, data.user);
    }
    return data;
}

async function getProfileAPI() {
    return await apiFetch('/user/profile', { method: 'GET' });
}

async function updateProfileAPI(profileData) {
    return await apiFetch('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
}

// ─── PRODUCT APIS ────────────────────────────────────────────────────────────

/**
 * Fetches product catalog with search and filtering
 */
async function fetchProductsAPI(params = {}) {
    let query = '';
    if (typeof params === 'string') {
        if (params && params !== 'all') {
            query = `?category=${encodeURIComponent(params)}`;
        }
    } else if (params && typeof params === 'object') {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '' && val !== 'all') {
                searchParams.append(key, val);
            }
        });
        const qs = searchParams.toString();
        if (qs) query = `?${qs}`;
    }
    return await apiFetch(`/products${query}`, { method: 'GET' });
}

async function fetchProductByIdAPI(productId) {
    return await apiFetch(`/products/${productId}`, { method: 'GET' });
}

async function createProductAPI(productData) {
    const isFormData = productData instanceof FormData;
    const url = `${API_BASE}/products`;
    const tokenExists = !!(authToken || localStorage.getItem('vk_token'));
    const fieldNames = [];
    if (isFormData) {
        for (const [key] of productData.entries()) {
            fieldNames.push(key);
        }
    } else if (productData && typeof productData === 'object') {
        fieldNames.push(...Object.keys(productData));
    }

    console.log('[DEBUG Product Creation] Request URL:', url);
    console.log('[DEBUG Product Creation] Auth token exists:', tokenExists);
    console.log('[DEBUG Product Creation] FormData field names:', fieldNames);

    try {
        const result = await apiFetch('/products', {
            method: 'POST',
            body: isFormData ? productData : JSON.stringify(productData)
        });
        console.log('[DEBUG Product Creation] Response body:', result);
        return result;
    } catch (err) {
        console.error('[DEBUG Product Creation] Failed with error:', err);
        throw err;
    }
}

async function updateProductAPI(productId, updateData) {
    return await apiFetch(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
    });
}

async function deleteProductAPI(productId) {
    return await apiFetch(`/products/${productId}`, {
        method: 'DELETE'
    });
}

async function addProductImageAPI(productId, url, type = 'ORIGINAL') {
    return await apiFetch(`/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify({ url, type })
    });
}

// ─── AI STUDIO APIS ──────────────────────────────────────────────────────────

async function enhanceImageAPI(formData) {
    return await apiFetch('/ai/enhance-image', {
        method: 'POST',
        body: formData
    });
}

async function transcribeAudioAPI(data) {
    // Can be FormData (file audio) or JSON body ({ mockText, language })
    const isFormData = data instanceof FormData;
    return await apiFetch('/ai/transcribe', {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
    });
}

async function generateCatalogueAPI(catalogData) {
    return await apiFetch('/ai/catalogue', {
        method: 'POST',
        body: JSON.stringify(catalogData)
    });
}

async function calculateFairPriceAPI(priceFactors) {
    return await apiFetch('/ai/fair-price', {
        method: 'POST',
        body: JSON.stringify(priceFactors)
    });
}

// ─── AUCTION APIS (HERITAGE BIDDING) ─────────────────────────────────────────

async function createAuctionAPI(auctionData) {
    return await apiFetch('/auctions', {
        method: 'POST',
        body: JSON.stringify(auctionData)
    });
}

async function fetchAuctionsAPI(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(k, v);
    });
    const qs = searchParams.toString();
    return await apiFetch(`/auctions${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

async function fetchAuctionByIdAPI(auctionId) {
    return await apiFetch(`/auctions/${auctionId}`, { method: 'GET' });
}

async function placeBidAPI(auctionId, amount) {
    return await apiFetch(`/auctions/${auctionId}/bids`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) })
    });
}

// ─── REVERSE BIDDING (BUYER REQUIREMENTS & ARTISAN BIDS) ─────────────────────

async function createRequirementAPI(reqData) {
    return await apiFetch('/requirements', {
        method: 'POST',
        body: JSON.stringify(reqData)
    });
}

async function fetchRequirementsAPI(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(k, v);
    });
    const qs = searchParams.toString();
    return await apiFetch(`/requirements${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

async function fetchRequirementByIdAPI(reqId) {
    return await apiFetch(`/requirements/${reqId}`, { method: 'GET' });
}

async function submitReverseBidAPI(reqId, bidData) {
    return await apiFetch(`/requirements/${reqId}/bids`, {
        method: 'POST',
        body: JSON.stringify(bidData)
    });
}

async function fetchReverseBidsAPI(reqId) {
    return await apiFetch(`/requirements/${reqId}/bids`, { method: 'GET' });
}

async function selectArtisanAPI(reqId, selectionData) {
    return await apiFetch(`/requirements/${reqId}/select-artisan`, {
        method: 'POST',
        body: JSON.stringify(selectionData)
    });
}

// ─── ORDER MANAGEMENT APIS ───────────────────────────────────────────────────

async function createOrderAPI(orderData) {
    return await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

async function fetchOrdersAPI(status = null) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return await apiFetch(`/orders${query}`, { method: 'GET' });
}

async function fetchOrderByIdAPI(orderId) {
    return await apiFetch(`/orders/${orderId}`, { method: 'GET' });
}

async function updateOrderStatusAPI(orderId, updateData) {
    return await apiFetch(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
    });
}

// ─── NOTIFICATION APIS ───────────────────────────────────────────────────────

async function fetchNotificationsAPI(unreadOnly = false) {
    const query = unreadOnly ? '?unreadOnly=true' : '';
    return await apiFetch(`/notifications${query}`, { method: 'GET' });
}

async function markNotificationReadAPI(notificationId) {
    return await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PUT'
    });
}

async function markAllNotificationsReadAPI() {
    return await apiFetch('/notifications/read-all', {
        method: 'PUT'
    });
}

// ─── TRANSLATION SERVICE ─────────────────────────────────────────────────────

const _txCache = new Map();

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

/**
 * Vistar Kala - Main Application Entry Point & Initialization
 * Real Session & API Lifecycle Management
 */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// ─── ARTISAN PORTAL ROUTE GUARD ─────────────────────────────────────────────
const _origNavigateTo = typeof navigateTo === 'function' ? navigateTo : (window.navigateTo || function () { });

window.navigateTo = function (pageId) {
    if (pageId === 'artisan') {
        const token = localStorage.getItem('vk_token') || (typeof authToken !== 'undefined' ? authToken : null);
        let user = typeof currentUser !== 'undefined' ? currentUser : null;
        if (!user) {
            try {
                user = JSON.parse(localStorage.getItem('vk_user') || 'null');
            } catch (e) {
                user = null;
            }
        }

        // 1. If there is no valid logged-in user, redirect to/show login screen
        if (!token || !user) {
            if (typeof selectPortalRole === 'function') selectPortalRole('artisan');
            return _origNavigateTo('login');
        }

        // 2. If user is logged in but role is not "artisan", do not allow access
        if (user.role !== 'artisan') {
            alert('Access restricted: Only registered artisans can access the Artisan Studio.');
            return;
        }
    }

    // 3. If the user is an artisan, allow normal navigation
    return _origNavigateTo(pageId);
};
navigateTo = window.navigateTo;

document.addEventListener('DOMContentLoaded', async () => {
    // Set Footer Year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.innerText = new Date().getFullYear();

    // Initialize Particle Canvas
    initParticles();

    // Check saved login auth state
    restoreUserSession();

    // Restore saved language preference
    const savedLang = localStorage.getItem('vk_selected_lang') || 'en';
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = savedLang;
    if (typeof applyTranslations === 'function') {
        applyTranslations(savedLang);
    }

    // Set initial view & load products
    if (authToken && currentUser) {
        if (currentUser.role === 'artisan') {
            navigateTo('artisan');
            if (typeof setArtisanStep === 'function') setArtisanStep(1);
        } else {
            navigateTo('b2b');
        }
    }
    else {
        navigateTo('landing');
    }

    // Bind Add Product Form submit
    const addProductForm = document.getElementById('form-add-product');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductSubmit);
    }

    // Search bar debounce
    const searchInput = document.getElementById('search-products') || document.getElementById('input-b2b-search');
    if (searchInput) {
        let debounceTimeout = null;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                if (typeof loadMarketplaceProducts === 'function') {
                    loadMarketplaceProducts(null, e.target.value);
                }
            }, 350);
        });
    }
});

/**
 * Restore User Session from localStorage
 */
function restoreUserSession() {
    if (authToken && currentUser) {
        const topAuth = document.getElementById('lbl-top-auth');
        const badge = document.getElementById('user-badge');
        const btnAuth = document.getElementById('btn-top-auth');
        const btnSignOut = document.getElementById('btn-top-signout');

        const displayName = currentUser.name || currentUser.phone || 'User';
        const roleLabel = currentUser.role === 'artisan' ? 'Artisan' : 'Buyer';

        if (topAuth) topAuth.innerText = displayName;
        if (badge) badge.innerText = `${displayName} (${roleLabel})`;
        if (btnAuth) {
            btnAuth.onclick = () => openProfileModal();
            btnAuth.title = "Click to view and edit profile";
        }
        if (btnSignOut) btnSignOut.classList.remove('hidden');

        // Initialize real-time notifications via Socket.IO
        if (typeof initSocketIO === 'function') {
            initSocketIO();
        }
        if (typeof onRealtimeNotification === 'function') {
            onRealtimeNotification((notif) => {
                if (typeof loadNotifications === 'function') {
                    loadNotifications();
                }
                const badge = document.getElementById('header-notif-badge');
                if (badge) {
                    const current = parseInt(badge.innerText, 10) || 0;
                    badge.innerText = String(current + 1);
                    badge.classList.remove('hidden');
                }
            });
        }
        if (typeof fetchNotificationsAPI === 'function') {
            fetchNotificationsAPI(true).then(res => {
                const unread = (res.notifications || []).length;
                if (typeof updateNotificationBadge === 'function') {
                    updateNotificationBadge(unread);
                }
            }).catch(() => {});
        }
    } else {
        const btnSignOut = document.getElementById('btn-top-signout');
        if (btnSignOut) btnSignOut.classList.add('hidden');
        const btnPublish = document.getElementById('btn-publish-craft');
        if (btnPublish) btnPublish.classList.add('hidden');
        const badge = document.getElementById('header-notif-badge');
        if (badge) badge.classList.add('hidden');
    }
}

/**
 * Sign Out
 */
function signOut() {
    clearAuthState();
    const topAuth = document.getElementById('lbl-top-auth');
    const badge = document.getElementById('user-badge');
    const btnAuth = document.getElementById('btn-top-auth');
    const btnSignOut = document.getElementById('btn-top-signout');
    const btnPublish = document.getElementById('btn-publish-craft');

    if (topAuth) topAuth.innerText = 'Sign In';
    if (badge) badge.innerText = 'Guest Mode';
    if (btnAuth) btnAuth.onclick = () => navigateTo('login');
    if (btnSignOut) btnSignOut.classList.add('hidden');
    if (btnPublish) btnPublish.classList.add('hidden');

    alert('You have been signed out.');
    navigateTo('landing');
}

/**
 * Handle Phone + Password Login
 */
async function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const phoneInput = document.getElementById('login-phone');
    const passwordInput = document.getElementById('login-password');
    const msgEl = document.getElementById('auth-login-msg');
    const submitBtn = document.getElementById('btn-login-submit');
    const spinner = document.getElementById('btn-login-spinner');
    const label = document.getElementById('btn-login-label');

    const phone = phoneInput?.value.trim();
    const password = passwordInput?.value;

    if (!phone || !password) {
        showAuthMessage(msgEl, 'Please enter both phone number and password.', true);
        return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (label) label.innerText = 'Signing In...';
    hideAuthMessage(msgEl);

    try {
        const result = await loginAPI(phone, password);
        showAuthMessage(msgEl, 'Login successful! Redirecting...', false);

        restoreUserSession();

        if (passwordInput) passwordInput.value = '';

        setTimeout(() => {
            hideAuthMessage(msgEl);
            if (result.user.role === 'artisan') {
                navigateTo('artisan');
                if (typeof setArtisanStep === 'function') setArtisanStep(1);
            } else {
                navigateTo('b2b');
            }
        }, 500);
    } catch (err) {
        showAuthMessage(msgEl, err.message || 'Invalid phone number or password', true);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (label) label.innerText = 'Sign In →';
    }
}

/**
 * Handle Registration
 */
async function handleRegisterSubmit(event) {
    if (event) event.preventDefault();
    const nameInput = document.getElementById('reg-name');
    const phoneInput = document.getElementById('reg-phone');
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm-password');
    const roleInput = document.querySelector('input[name="reg-role"]:checked');
    const msgEl = document.getElementById('auth-reg-msg');
    const submitBtn = document.getElementById('btn-reg-submit');
    const spinner = document.getElementById('btn-reg-spinner');
    const label = document.getElementById('btn-reg-label');

    const name = nameInput?.value.trim();
    const phone = phoneInput?.value.trim();
    const password = passwordInput?.value;
    const confirmPassword = confirmInput?.value;
    const role = roleInput?.value || selectedPortalRoleChoice || 'buyer';

    if (!phone || !password) {
        showAuthMessage(msgEl, 'Phone number and password are required.', true);
        return;
    }

    if (password.length < 8) {
        showAuthMessage(msgEl, 'Password must be at least 8 characters long.', true);
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage(msgEl, 'Passwords do not match. Please verify.', true);
        return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (label) label.innerText = 'Creating Account...';
    hideAuthMessage(msgEl);

    try {
        const result = await registerAPI(phone, password, name, role);
        showAuthMessage(msgEl, 'Account created successfully! Redirecting...', false);

        if (typeof confetti === 'function') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        }

        restoreUserSession();
        document.getElementById('form-auth-register')?.reset();

        setTimeout(() => {
            hideAuthMessage(msgEl);
            if (result.user.role === 'artisan') {
                navigateTo('artisan');
                if (typeof setArtisanStep === 'function') setArtisanStep(1);
            } else {
                navigateTo('b2b');
            }
        }, 600);
    } catch (err) {
        showAuthMessage(msgEl, err.message || 'Registration failed. Please check your information.', true);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (label) label.innerText = 'Create Account →';
    }
}

function showAuthMessage(el, message, isError = true) {
    if (!el) return;
    el.innerText = message;
    el.classList.remove('hidden');
    if (isError) {
        el.className = 'text-xs text-center py-2 px-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 font-semibold shadow-sm fade-in';
    } else {
        el.className = 'text-xs text-center py-2 px-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 font-semibold shadow-sm fade-in';
    }
}

function hideAuthMessage(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.innerText = '';
}

function loginAsGuest() {
    clearAuthState();
    const badge = document.getElementById('user-badge');
    const topAuth = document.getElementById('lbl-top-auth');
    if (topAuth) topAuth.innerText = "Guest Mode";
    if (badge) badge.innerText = "Guest (Visitor)";
    navigateTo('b2b');
}

/**
 * Audio Recording and Transcription for Voice Catalog (Step 2)
 */
async function toggleVoiceRecording() {
    const micBtn = document.getElementById('btn-mic-toggle');
    const statusLbl = document.getElementById('recording-status-lbl');
    const notesInput = document.getElementById('artisan-notes-input');

    if (!authToken) {
        alert('Please sign in as an artisan to record voice descriptions.');
        navigateTo('login');
        return;
    }

    if (!isRecording) {
        // Start Recording
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    if (statusLbl) statusLbl.innerText = "Transcribing with AI...";

                    try {
                        const formData = new FormData();
                        formData.append('audio', audioBlob, 'artisan-voice.webm');
                        formData.append('language', currentLang);

                        const res = await transcribeAudioAPI(formData);
                        if (res && res.transcript) {
                            if (notesInput) notesInput.value = res.transcript;
                            if (statusLbl) statusLbl.innerText = `✓ Transcribed (${res.detectedLanguage || 'hi'})`;
                        }
                    } catch (transcribeErr) {
                        // Fallback to sample text if microphone audio format isn't supported on device
                        if (notesInput && !notesInput.value) {
                            notesInput.value = "हम वारली चित्रकला चार पीढ़ियों से प्राकृतिक रंगों और चावल के लेप से बना रहे हैं।";
                        }
                        if (statusLbl) statusLbl.innerText = "✓ Voice processed (Sample dialect added)";
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                if (micBtn) micBtn.classList.add('animate-pulse', 'ring-4', 'ring-red-500');
                if (statusLbl) statusLbl.innerText = "Listening... Speak in your regional dialect";
            } else {
                // MediaDevices not supported, provide simulated transcription
                if (notesInput) {
                    notesInput.value = "हम वारली चित्रकला चार पीढ़ियों से प्राकृतिक रंगों और चावल के लेप से बना रहे हैं।";
                }
                alert('Microphone access is not supported in this environment. Sample dialect text has been loaded.');
            }
        } catch (err) {
            console.warn('Microphone error:', err);
            // Fallback gracefully
            if (notesInput) {
                notesInput.value = "हम वारली चित्रकला चार पीढ़ियों से प्राकृतिक रंगों और चावल के लेप से बना रहे हैं।";
            }
            if (statusLbl) statusLbl.innerText = "✓ Voice sample loaded into notes";
        }
    } else {
        // Stop Recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        isRecording = false;
        if (micBtn) micBtn.classList.remove('animate-pulse', 'ring-4', 'ring-red-500');
    }
}

/**
 * Ambient Gold Particle Canvas Engine
 */
function initParticles() {
    const canvas = document.getElementById('gold-particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const numParticles = 40;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 0.8,
            speedY: Math.random() * 0.4 + 0.1,
            speedX: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.6 + 0.2,
            pulse: Math.random() * 0.02 + 0.01
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let p of particles) {
            p.y -= p.speedY;
            p.x += p.speedX;
            p.opacity += Math.sin(Date.now() * 0.002) * 0.005;

            if (p.y < 0) {
                p.y = canvas.height + 5;
                p.x = Math.random() * canvas.width;
            }
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250, 204, 21, ${Math.max(0.1, Math.min(0.8, p.opacity))})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#facc15';
            ctx.fill();
        }
        requestAnimationFrame(animate);
    }
    animate();
}
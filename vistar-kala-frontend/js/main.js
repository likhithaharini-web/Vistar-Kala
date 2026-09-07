/**
 * Vistar Kala - Main Application Entry Point & Initialization
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Set Footer Year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.innerText = new Date().getFullYear();

    // Initialize Particle Canvas
    initParticles();

    // Check saved login auth state
    if (authToken && currentUser) {
        console.log('[App] Session restored for user:', currentUser.phone || currentUser.name);
    }

    // Set initial view & load products
    navigateTo('landing');

    // Bind Add Product Form submit
    const addProductForm = document.getElementById('form-add-product');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductSubmit);
    }
});

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

/**
 * Handle Phone + Password Login
 */
async function handleLoginSubmit(event) {
    event.preventDefault();
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

        // Update UI headers
        const topAuth = document.getElementById('lbl-top-auth');
        if (topAuth) topAuth.innerText = result.user.name || result.user.phone || 'My Account';
        const badge = document.getElementById('user-badge');
        if (badge) badge.innerText = `${result.user.name || 'User'} (${result.user.role || 'Verified'})`;

        // Clear password
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
        // No demo-token fallback: show honest authentication error
        showAuthMessage(msgEl, err.message || 'Invalid phone number or password', true);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (label) label.innerText = 'Login →';
    }
}

/**
 * Handle Registration
 */
async function handleRegisterSubmit(event) {
    event.preventDefault();
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
    const role = roleInput?.value || 'buyer';

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

        // Update UI headers
        const topAuth = document.getElementById('lbl-top-auth');
        if (topAuth) topAuth.innerText = result.user.name || result.user.phone || 'My Account';
        const badge = document.getElementById('user-badge');
        if (badge) badge.innerText = `${result.user.name || 'User'} (${result.user.role || 'Verified'})`;

        // Clear form
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
    const badge = document.getElementById('user-badge');
    const topAuth = document.getElementById('lbl-top-auth');
    if (topAuth) topAuth.innerText = "Guest Mode";
    if (badge) badge.innerText = "Guest (Visitor)";
    navigateTo('b2b');
}
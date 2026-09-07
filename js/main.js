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
 * Handle Auth Login / OTP Form
 */
async function handleLoginOtp() {
    const inputPhone = document.getElementById('login-phone')?.value.trim();
    const inputOtp = document.getElementById('login-otp')?.value.trim();
    const btnLogin = document.getElementById('btn-login-action');

    if (!inputPhone) {
        alert('Please enter a valid mobile number or email address.');
        return;
    }

    if (!window.otpPending) {
        // Step 1: Request OTP
        if (btnLogin) {
            btnLogin.disabled = true;
            btnLogin.innerText = 'Sending OTP...';
        }

        try {
            await requestOtpAPI(inputPhone, currentRole);
            window.otpPending = true;
            const otpContainer = document.getElementById('otp-input-container');
            if (otpContainer) otpContainer.classList.remove('hidden');
            if (btnLogin) btnLogin.innerText = 'Verify OTP & Log In →';
            alert(`OTP sent to ${inputPhone}! (Demo default OTP: 123456)`);
        } catch (err) {
            alert(`Failed to request OTP: ${err.message}. Using offline mode.`);
            setAuthState('demo-token-123', { phone: inputPhone, role: currentRole });
            navigateTo('artisan');
        } finally {
            if (btnLogin) btnLogin.disabled = false;
        }
    } else {
        // Step 2: Verify OTP
        if (!inputOtp) {
            alert('Please enter the 6-digit OTP code.');
            return;
        }

        if (btnLogin) {
            btnLogin.disabled = true;
            btnLogin.innerText = 'Verifying...';
        }

        try {
            await verifyOtpAPI(inputPhone, currentRole, inputOtp);
            alert('Successfully authenticated!');
            window.otpPending = false;
            navigateTo(currentRole === 'artisan' ? 'artisan' : 'b2b');
        } catch (err) {
            alert(`Verification failed: ${err.message}`);
        } finally {
            if (btnLogin) {
                btnLogin.disabled = false;
                btnLogin.innerText = 'Verify OTP & Log In →';
            }
        }
    }
}
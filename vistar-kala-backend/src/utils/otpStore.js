// In-memory OTP store. In production this would be replaced with a real
// SMS provider + a shared cache (Redis) instead of process memory.
const store = new Map(); // phone -> { code, expiresAt }

const EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const MOCK_OTP = process.env.MOCK_OTP || '123456';

function generateOtp(phone) {
  // Prototype: always issue the configured mock OTP so it's easy to test,
  // but a real random code is also supported/logged for demo purposes.
  const code = MOCK_OTP;
  const expiresAt = Date.now() + EXPIRY_MINUTES * 60 * 1000;
  store.set(phone, { code, expiresAt });
  // eslint-disable-next-line no-console
  console.log(`[MOCK SMS] OTP for ${phone}: ${code} (expires in ${EXPIRY_MINUTES}m)`);
  return code;
}

function verifyOtp(phone, code) {
  const entry = store.get(phone);
  if (!entry) return { valid: false, reason: 'No OTP requested for this number' };
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return { valid: false, reason: 'OTP expired' };
  }
  if (entry.code !== code) return { valid: false, reason: 'Incorrect OTP' };
  store.delete(phone);
  return { valid: true };
}

module.exports = { generateOtp, verifyOtp };

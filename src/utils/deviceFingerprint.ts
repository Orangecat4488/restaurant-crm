/**
 * Single, browser-wide source of truth for the device fingerprint used
 * by both the auth and license stores. The fingerprint is used as an
 * audit-only field by the backend; it is NOT part of any lock key.
 */
let cachedFingerprint: string | null = null;

export function getDeviceFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;
  if (typeof window === 'undefined') return 'server';
  const stored = window.localStorage.getItem('crm_device_fingerprint');
  if (stored) {
    cachedFingerprint = stored;
    return stored;
  }
  const seed = [
    navigator.userAgent || '',
    navigator.language || '',
    `${screen?.width || 0}x${screen?.height || 0}`,
    new Date().getTimezoneOffset()
  ].join('|');
  // btoa is available in browsers; fall back to a hash-like value in
  // environments that don't support it.
  const fp =
    typeof btoa === 'function'
      ? btoa(seed).replace(/[+/=]/g, '').slice(0, 32)
      : seed.length.toString(36) + Date.now().toString(36);
  cachedFingerprint = fp || `dev-${Date.now()}`;
  window.localStorage.setItem('crm_device_fingerprint', cachedFingerprint);
  return cachedFingerprint;
}

export function clearDeviceFingerprint() {
  cachedFingerprint = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('crm_device_fingerprint');
  }
}
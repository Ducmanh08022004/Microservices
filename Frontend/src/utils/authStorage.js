export const AUTH_CHANGED_EVENT = 'auth-changed';

function decodeJwtPayload(token) {
    if (!token) return null;
    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart) return null;

        const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function getCurrentUserScope() {
    const token = localStorage.getItem('accessToken');
    const payload = decodeJwtPayload(token);

    const rawUserKey =
        payload?.userId ||
        payload?.id ||
        payload?.sub ||
        payload?.username ||
        payload?.email ||
        'guest';

    return String(rawUserKey).trim().toLowerCase().replace(/\s+/g, '_');
}

export function getScopedStorageKey(baseKey) {
    return `${baseKey}:${getCurrentUserScope()}`;
}

export function dispatchAuthChanged() {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

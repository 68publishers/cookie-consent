export function uuidV4() {
    if (window.crypto && 'function' === typeof window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    // randomUUID is missing on http:// pages (insecure context)
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * SHA-256 of a string as a hex string (WebCrypto). Rejects on http:// pages (no secure context): HTTPS is required since 2.0.
 * @returns {Promise<string>}
 */
export async function sha256Hex(value) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('SHA-256 needs WebCrypto, which is available on HTTPS pages only (secure context).');
    }

    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

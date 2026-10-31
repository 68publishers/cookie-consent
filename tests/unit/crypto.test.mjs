// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import sha256 from 'crypto-js/sha256.js';

describe('WebCrypto replacements of crypto-js and uuid', () => {
    let sha256Hex;
    let uuidV4;

    beforeAll(async () => {
        globalThis.window = globalThis;
        ({ sha256Hex, uuidV4 } = await import('../../src/Utils/Crypto.mjs'));
    });

    it('computes the same checksum as crypto-js used by 1.x (the CMP keeps matching consent settings)', async () => {
        for (const value of ['', 'abc', JSON.stringify({ version: '1.6.0', config: { a: 'ěščřžýáíé' }, storages: {} }), 'x'.repeat(10000)]) {
            expect(await sha256Hex(value)).toBe(sha256(value).toString());
        }
    });

    it('generates RFC 4122 v4 UUIDs, also without crypto.randomUUID', () => {
        expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

        const randomUUID = globalThis.crypto.randomUUID;
        Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
        try {
            expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        } finally {
            Object.defineProperty(globalThis.crypto, 'randomUUID', { value: randomUUID, configurable: true });
        }
    });
});

// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';

describe('WebCrypto replacements of crypto-js and uuid', () => {
    let sha256Hex;
    let uuidV4;

    beforeAll(async () => {
        globalThis.window = globalThis;
        ({ sha256Hex, uuidV4 } = await import('../../src/Utils/Crypto.mjs'));
    });

    it('computes the same checksum as crypto-js used by 1.x (the CMP keeps matching consent settings)', async () => {
        // checksums computed by crypto-js 4.2 (1.x)
        for (const [value, checksum] of [
            ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
            ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
            [JSON.stringify({ version: '1.6.0', config: { a: 'ěščřžýáíé' }, storages: {} }), '71fbe5d4f20dde4c762364e2d766d5176e5fda3523857408000f48c732f2a940'],
            ['x'.repeat(10000), 'e4ee97ec252749d2096447e849628d0d7734f51700416eefbb33574bf0b3ee75'],
        ]) {
            expect(await sha256Hex(value)).toBe(checksum);
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

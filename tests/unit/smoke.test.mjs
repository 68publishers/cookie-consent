import { describe, expect, it } from 'vitest';
import { Config } from '../../src/Config/Config.mjs';

describe('smoke', () => {
    it('creates the default config', () => {
        const config = new Config('https://example.com/pkg');

        expect(config.pluginOptions.cookie_name).toBe('cc-settings');
        expect(config.uiOptions.defaultStylesheets).toEqual(['https://example.com/pkg/cookie-consent.css']);
    });
});

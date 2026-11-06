import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Catalogue } from '../../src/Translation/Catalogue.mjs';
import path from 'node:path';
import { createConfig, root } from './helpers.mjs';

const dir = path.join(root, 'src/resources/translations');
const locales = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const ALL_VISIBLE = ['functionality_storage', 'security_storage', 'personalization_storage', 'ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage']
    .map(name => ({ name, display_in_widget: true }));

async function exportLocale(locale, wrapperConfig = {}, { revisionEnabled = false, placeholders = { user_identity: 'u1' } } = {}) {
    const catalogue = new Catalogue(locale);
    catalogue.merge(JSON.parse(fs.readFileSync(path.join(dir, `${locale}.json`), 'utf8')));
    const { config, storagePool } = createConfig({ storage_pool: ALL_VISIBLE, ...wrapperConfig });

    return catalogue.exportTranslations(storagePool, config, placeholders, null, revisionEnabled);
}

describe('translations in the v3 format', () => {
    it('ships 22 locales', () => {
        expect(locales).toHaveLength(22);
    });

    for (const locale of locales) {
        it(`${locale}: required texts are filled and placeholders replaced`, async () => {
            const t = await exportLocale(locale, { consent_modal_options: { show_third_button: true } });
            const required = [
                t.consentModal.title, t.consentModal.description, t.consentModal.acceptAllBtn, t.consentModal.acceptNecessaryBtn, t.consentModal.showPreferencesBtn,
                t.preferencesModal.title, t.preferencesModal.serviceCounterLabel, t.preferencesModal.acceptAllBtn, t.preferencesModal.acceptNecessaryBtn, t.preferencesModal.savePreferencesBtn, t.preferencesModal.closeIconLabel,
                ...t.preferencesModal.sections.map(s => s.title),
            ];

            required.forEach(text => expect(typeof text === 'string' && text.trim().length > 0, `${locale}: ${JSON.stringify(text)}`).toBe(true));
            expect(JSON.stringify(t)).not.toMatch(/\[\[[a-z_]+\]\]/);
            // optional: a close icon in the consent modal appears only when a client fills the label
            expect(t.consentModal.closeIconLabel).toBeUndefined();
            expect(t.preferencesModal.sections.filter(s => s.linkedCategory).map(s => s.linkedCategory)).toEqual(ALL_VISIBLE.map(s => s.name));
        });
    }

    it('maps the button roles to the buttons of v3', async () => {
        const settings = await exportLocale('en', { consent_modal_options: { secondary_button_role: 'settings' } });
        expect(settings.consentModal.showPreferencesBtn).toBeTruthy();
        expect(settings.consentModal.acceptNecessaryBtn).toBeUndefined();

        const necessary = await exportLocale('en', { consent_modal_options: { secondary_button_role: 'accept_necessary' } });
        expect(necessary.consentModal.acceptNecessaryBtn).toBeTruthy();
        expect(necessary.consentModal.showPreferencesBtn).toBeUndefined();
    });

    it('keeps {{revisionMessage}} for the plugin only when the revision is enabled', async () => {
        const custom = { translations: {} };
        const catalogue = new Catalogue('en');
        catalogue.merge({ consent_modal_description: 'Text [[revision_message]]', consent_modal_revision_message: 'Changed!' });
        const { config, storagePool } = createConfig(custom);

        expect((await catalogue.exportTranslations(storagePool, config, {}, null, true)).consentModal).toMatchObject({ description: 'Text {{revisionMessage}}', revisionMessage: 'Changed!' });
        expect((await catalogue.exportTranslations(storagePool, config, {}, null, false)).consentModal.description).toBe('Text ');
    });

    it('adds the cookie table of a storage', async () => {
        const catalogue = new Catalogue('en');
        catalogue.merge({ analytics_storage_title: 'Analytics' });
        const { config, storagePool } = createConfig({ storage_pool: [{ name: 'analytics_storage', display_in_widget: true }] });
        const table = { headers: { name: 'Name' }, rows: (storage) => ('analytics_storage' === storage ? [{ name: '_ga' }] : []) };
        const t = await catalogue.exportTranslations(storagePool, config, {}, table, false);

        expect(t.preferencesModal.sections[0].cookieTable).toEqual({ headers: { name: 'Name' }, body: [{ name: '_ga' }] });
    });
});

describe('client overrides', () => {
    it('an empty text set by the client survives the lazily loaded locale file (1.x behavior)', async () => {
        const catalogue = new Catalogue('cs');
        catalogue.merge({ settings_modal_after_consent_title: '', settings_modal_after_consent_description: 'ID: [[user_identity]]' });
        catalogue.merge(JSON.parse(fs.readFileSync(path.join(dir, 'cs.json'), 'utf8')), false);
        const { config, storagePool } = createConfig({ storage_pool: ALL_VISIBLE });
        const sections = (await catalogue.exportTranslations(storagePool, config, { user_identity: "u1" }, null, false)).preferencesModal.sections;

        expect(sections.at(-1)).toEqual({ title: '', description: 'ID: u1' });
        expect(catalogue.translate('consent_modal_title')).not.toBe('');
    });
});

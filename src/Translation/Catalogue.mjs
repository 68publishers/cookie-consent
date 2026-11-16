export class Catalogue {
    #promises = {};
    // keys set by the client (empty ones too): the locale file does not overwrite them, the same as in 1.x
    #explicit = new Set();
    _source = null;
    _sourceLoaded = false;

    constructor(locale) {
        this._locale = locale;

        // modal trigger
        this.modal_trigger_title = '';

        // consent modal
        this.consent_modal_title = '';
        this.consent_modal_description = '';
        this.consent_modal_revision_message = ''; // optional, the translation is passed into the "consent_modal_description" under placeholder [[revision_message]]
        this.consent_modal_primary_btn = '';
        this.consent_modal_secondary_btn_settings = '';
        this.consent_modal_secondary_btn_accept_necessary = '';

        // setting modal
        this.settings_modal_title = '';
        this.settings_modal_save_settings_btn = '';
        this.settings_modal_accept_all_btn = '';
        this.settings_modal_reject_all_btn = '';
        this.settings_modal_close_btn_label = '';
        this.settings_modal_service_counter_label = '';

        // optional, a close icon in the consent modal (box layout only)
        this.consent_modal_close_btn_label = '';

        // before consents block
        this.settings_modal_before_consent_title = '';
        this.settings_modal_before_consent_description = '';

        // after consents block
        this.settings_modal_after_consent_title = '';
        this.settings_modal_after_consent_description = '';

        // consents - storage descriptions
        this.functionality_storage_title = '';
        this.functionality_storage_description = '';

        this.personalization_storage_title = '';
        this.personalization_storage_description = '';

        this.security_storage_title = '';
        this.security_storage_description = '';

        this.ad_storage_title = '';
        this.ad_storage_description = '';

        this.ad_user_data_title = '';
        this.ad_user_data_description = '';

        this.ad_personalization_title = '';
        this.ad_personalization_description = '';

        this.analytics_storage_title = '';
        this.analytics_storage_description = '';

        this.cookie_table_col_name = '';
        this.cookie_table_col_purpose = '';
        this.cookie_table_col_processing_time = '';
        this.cookie_table_col_provider = '';
        this.cookie_table_col_type = '';
        this.cookie_table_col_link = '';
        this.cookie_table_col_link_find_out_more = '';
        this.cookie_table_col_category = '';

        this.processing_time_session = '';
        this.processing_time_persistent = '';

        this.cookie_type_1st_party = '';
        this.cookie_type_3rd_party = '';

        this.find_out_more = '';
    }

    get locale() {
        return this._locale;
    }

    loadFromUrl(url, override = false) {
        if (url in this.#promises) {
            return true;
        }

        let scriptUrl = url.endsWith('.js') ? url : (url + '.js');
        let script = document.head.querySelector(`script[src='${scriptUrl}']`);
        let promise;

        if (script) {
            if (window.cookieConsentWrapperTranslations && scriptUrl in window.cookieConsentWrapperTranslations) {
                this.merge(window.cookieConsentWrapperTranslations[scriptUrl], override);

                return true;
            }

            url = scriptUrl;
            promise = new Promise((resolve, reject) => {
                const loadListener = () => {
                    script.removeEventListener('load', loadListener);
                    script.removeEventListener('error', errorListener);
                    resolve(window.cookieConsentWrapperTranslations[scriptUrl]);
                };
                const errorListener = () => {
                    script.removeEventListener('load', loadListener);
                    script.removeEventListener('error', errorListener);
                    reject(new Error(`Unable to load script: ${scriptUrl}`));
                };

                script.addEventListener('load', loadListener);
                script.addEventListener('error', errorListener);
            });
        } else {
            promise = fetch(url)
                .then(res => res.json());
        }

        return this.#promises[url] = promise
            .then(translations => {
                this.merge(translations, override);
                delete this.#promises[url];

                return translations;
            })
            .catch(err => {
                console.warn(`CookieConsentWrapper: Unable to load translations from ${url}`, err);
                delete this.#promises[url];
            })
    }

    translate(key, placeholders = {}) {
        if (!(key in this)) {
            return key;
        }

        if ('consent_modal_revision_message' !== key && !('revision_message' in placeholders)) {
            placeholders = { ...placeholders, revision_message: this.consent_modal_revision_message };
        }

        let translation = this[key];

        for (let placeholderName in placeholders) {
            translation = translation.replaceAll('[[' + placeholderName + ']]', placeholders[placeholderName]);
        }

        return translation;
    }

    merge(translations, override = true) {
        let property;

        for (property in translations) {
            if (!(property in this) || (!override && (this.#explicit.has(property) || '' !== this[property]))) {
                continue;
            }

            this[property] = translations[property];
            override && this.#explicit.add(property);
        }
    }

    /**
     * Registers the translation file of the locale without loading it (the plugin loads only the current locale).
     */
    setSource(url) {
        this._source = url;
    }

    get hasSource() {
        return !!this._source;
    }

    /**
     * Loads the registered source (once) and waits for all pending loads.
     */
    async load() {
        if (this._source && !this._sourceLoaded) {
            this._sourceLoaded = true;
            await this.loadFromUrl(this._source, false);
        }

        const promises = Object.values(this.#promises);

        if (promises.length) {
            await Promise.all(promises);
        }
    }

    /**
     * Exports the catalogue as a translation of vanilla-cookieconsent 3.x.
     *
     * @param {import('../Storage/StoragePool.mjs').StoragePool} storagePool
     * @param {import('../Config/Config.mjs').Config} config
     * @param {object} placeholders
     * @param {{headers: object, rows: function(string): object[]}|null} cookieTable
     * @param {boolean} revisionEnabled
     */
    async exportTranslations(storagePool, config, placeholders = {}, cookieTable = null, revisionEnabled = false) {
        await this.load();

        const t = (key) => this.translate(key, { ...placeholders });
        const sections = [];

        if ('' !== this.settings_modal_before_consent_title || '' !== this.settings_modal_before_consent_description) {
            sections.push({
                title: t('settings_modal_before_consent_title'),
                description: t('settings_modal_before_consent_description'),
            });
        }

        for (const storage of storagePool.all()) {
            if (!storage.displayInWidget || !((storage.name + '_title') in this)) {
                continue;
            }

            const section = {
                title: t(storage.name + '_title'),
                description: t(storage.name + '_description'),
                linkedCategory: storage.name,
            };
            const rows = cookieTable ? cookieTable.rows(storage.name) : [];

            if (cookieTable && 0 < rows.length) {
                section.cookieTable = { headers: cookieTable.headers, body: rows };
            }

            sections.push(section);
        }

        if ('' !== this.settings_modal_after_consent_title || '' !== this.settings_modal_after_consent_description) {
            sections.push({
                title: t('settings_modal_after_consent_title'),
                description: t('settings_modal_after_consent_description'),
            });
        }

        const cm = config.consentModalOptions;
        const secondaryIsNecessary = 'accept_necessary' === cm.secondary_button_role;
        const consentModal = {
            title: t('consent_modal_title'),
            // the plugin shows the revision message only when the revision changed ({{revisionMessage}} placeholder)
            description: this.translate('consent_modal_description', { ...placeholders, revision_message: revisionEnabled ? '{{revisionMessage}}' : '' }),
            revisionMessage: t('consent_modal_revision_message'),
            acceptAllBtn: t('consent_modal_primary_btn'),
        };

        if (secondaryIsNecessary || cm.show_third_button) {
            consentModal.acceptNecessaryBtn = t('consent_modal_secondary_btn_accept_necessary');
        }

        if (!secondaryIsNecessary || cm.show_third_button) {
            consentModal.showPreferencesBtn = t('consent_modal_secondary_btn_settings');
        }

        if ('' !== this.consent_modal_close_btn_label) {
            consentModal.closeIconLabel = t('consent_modal_close_btn_label');
        }

        return {
            consentModal,
            preferencesModal: {
                title: t('settings_modal_title'),
                acceptAllBtn: t('settings_modal_accept_all_btn'),
                acceptNecessaryBtn: t('settings_modal_reject_all_btn'),
                savePreferencesBtn: t('settings_modal_save_settings_btn'),
                closeIconLabel: t('settings_modal_close_btn_label'),
                serviceCounterLabel: t('settings_modal_service_counter_label'),
                sections,
            },
        };
    }
}

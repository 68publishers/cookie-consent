export class Catalogue {
    #promises = {};

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

        if ('consent_modal_revision_message' !== key) {
            placeholders['revision_message'] = this.consent_modal_revision_message;
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
            if (property in this && (override || '' === this[property])) {
                this[property] = translations[property];
            }
        }
    }

    async exportTranslations(storagePool, config, placeholders = {}) {
        const promises = Object.values(this.#promises);

        if (promises.length) {
            await Promise.all(promises);
        }

        const blocks = [];

        if ('' !== this.settings_modal_before_consent_title || '' !== this.settings_modal_before_consent_description) {
            blocks.push({
                title: this.translate('settings_modal_before_consent_title', placeholders),
                description: this.translate('settings_modal_before_consent_description', placeholders),
            });
        }

        const storageArr = storagePool.all();
        let storage;
        let storageKey;

        for (storageKey in storageArr) {
            storage = storageArr[storageKey];

            if (!storage.displayInWidget || !((storage.name + '_title') in this)) {
                continue;
            }

            blocks.push({
                title: this.translate(storage.name + '_title', placeholders),
                description: this.translate(storage.name + '_description', placeholders),
                toggle: {
                    value: storage.name,
                    enabled: storage.enabledByDefault,
                    readonly: storage.readonly,
                },
            });
        }

        if ('' !== this.settings_modal_after_consent_title || '' !== this.settings_modal_after_consent_description) {
            blocks.push({
                title: this.translate('settings_modal_after_consent_title', placeholders),
                description: this.translate('settings_modal_after_consent_description', placeholders),
            });
        }

        return {
            consent_modal: {
                title: this.translate('consent_modal_title', placeholders),
                description: this.translate('consent_modal_description', placeholders),
                revision_message: this.translate('consent_modal_revision_message', placeholders),
                primary_btn: {
                    text: this.translate('consent_modal_primary_btn', placeholders),
                    role: config.consentModalOptions.primary_button_role,
                },
                secondary_btn: {
                    text: this.translate('accept_necessary' === config.consentModalOptions.secondary_button_role ? 'consent_modal_secondary_btn_accept_necessary' : 'consent_modal_secondary_btn_settings', placeholders),
                    role: config.consentModalOptions.secondary_button_role,
                },
            },
            settings_modal: {
                title: this.translate('settings_modal_title', placeholders),
                save_settings_btn: this.translate('settings_modal_save_settings_btn', placeholders),
                accept_all_btn: this.translate('settings_modal_accept_all_btn', placeholders),
                reject_all_btn: this.translate('settings_modal_reject_all_btn', placeholders),
                close_btn_label: this.translate('settings_modal_close_btn_label', placeholders),
                blocks: blocks,
            },
        }
    }
}

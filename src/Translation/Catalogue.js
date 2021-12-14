'use strict';

class Catalogue {
    constructor(locale) {
        this._locale = locale;

        // modal trigger
        this.modal_trigger_title = '';

        // consent modal
        this.consent_modal_title = '';
        this.consent_modal_description = '';
        this.consent_modal_revision_message = ''; // optional, the translation is passed into the "consent_modal_description" under placeholder {{revision_message}}
        this.consent_modal_primary_btn = '';
        this.consent_modal_secondary_btn = '';

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

        this.analytics_storage_title = '';
        this.analytics_storage_description = '';
    }

    get locale() {
        return this._locale;
    }

    translate(key) {
        return this.hasOwnProperty(key) ? this[key] : key;
    }

    merge(translations) {
        let property;

        for (property in translations) {
            if (translations.hasOwnProperty(property) && this.hasOwnProperty(property)) {
                this[property] = translations[property];
            }
        }
    }

    build(storagePool) {
        const blocks = [];

        if ('' !== this.settings_modal_before_consent_title || '' !== this.settings_modal_before_consent_description) {
            blocks.push({
                title: this.settings_modal_before_consent_title,
                description: this.settings_modal_before_consent_description
            });
        }

        const storageArr = storagePool.all();
        let storage;
        let storageKey;

        for (storageKey in storageArr) {
            if (!storageArr.hasOwnProperty(storageKey)) {
                continue;
            }

            storage = storageArr[storageKey];

            if (!storage.displayInWidget || !this.hasOwnProperty(storage.name + '_title')) {
                continue;
            }

            blocks.push({
                title: this[storage.name + '_title'],
                description: this[storage.name + '_description'],
                toggle: {
                    value: storage.name,
                    enabled: storage.enabledByDefault,
                    readonly: storage.readonly
                }
            });
        }

        if ('' !== this.settings_modal_after_consent_title || '' !== this.settings_modal_after_consent_description) {
            blocks.push({
                title: this.settings_modal_after_consent_title,
                description: this.settings_modal_after_consent_description
            });
        }

        return {
            consent_modal: {
                title: this.consent_modal_title,
                description: this.consent_modal_description.replace('[[revision_message]]', '{{revision_message}}'),
                revision_message: this.consent_modal_revision_message,
                primary_btn: {
                    text: this.consent_modal_primary_btn,
                    role: 'accept_all'
                },
                secondary_btn: {
                    text: this.consent_modal_secondary_btn,
                    role: 'settings'
                }
            },
            settings_modal: {
                title: this.settings_modal_title,
                save_settings_btn: this.settings_modal_save_settings_btn,
                accept_all_btn: this.settings_modal_accept_all_btn,
                reject_all_btn: this.settings_modal_reject_all_btn,
                close_btn_label: this.settings_modal_close_btn_label,
                blocks: blocks
            }
        }
    }
}

module.exports = Catalogue;

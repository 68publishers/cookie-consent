'use strict';

const CookieConsentWrapper = require('./CookieConsentWrapper');

class CookieConsentWrapperFactory {
    create() {
        if (window === undefined) {
            throw new Error('the window is not accessible.');
        }

        const cookieConsentWrapper = new CookieConsentWrapper(this._createGtagFunction());

        this._setupPluginOptions(cookieConsentWrapper);
        this._setupConsentModalOptions(cookieConsentWrapper);
        this._setupSettingsModalOptions(cookieConsentWrapper);
        this._setupUiOptions(cookieConsentWrapper);
        this._setupStoragePool(cookieConsentWrapper);
        this._setupLocales(cookieConsentWrapper);
        this._setupTranslations(cookieConsentWrapper);

        cookieConsentWrapper.init(window, document);

        return cookieConsentWrapper;
    }

    _createGtagFunction() {
        let gtag = window.gtag;

        if (!gtag) {
            window.dataLayer = window.dataLayer || [];

            gtag = function gtag() {
                dataLayer.push(arguments);
            }
        }

        return gtag;
    }

    _setupPluginOptions(wrapper) {
        if (window.cc_plugin_options && 'object' === typeof window.cc_plugin_options) {
            wrapper.setPluginOptions(window.cc_plugin_options);
        }
    }

    _setupConsentModalOptions(wrapper) {
        if (window.cc_consent_modal_options && 'object' === typeof window.cc_consent_modal_options) {
            wrapper.setConsentModalOptions(window.cc_consent_modal_options);
        }
    }

    _setupSettingsModalOptions(wrapper) {
        if (window.cc_settings_modal_options && 'object' === typeof window.cc_settings_modal_options) {
            wrapper.setSettingsModalOptions(window.cc_settings_modal_options);
        }
    }

    _setupUiOptions(wrapper) {
        if (window.cc_ui_options && 'object' === typeof window.cc_ui_options) {
            wrapper.setUiOptions(window.cc_ui_options);
        }
    }

    _setupStoragePool(wrapper) {
        if (window.cc_storage_pool && Array.isArray(window.cc_storage_pool)) {
            const storagePool = window.cc_storage_pool;

            for (let i in storagePool) {
                if (!storagePool.hasOwnProperty(i)) {
                    continue;
                }

                wrapper.addStorage(storagePool[i] || {});
            }
        }
    }

    _setupLocales(wrapper) {
        if (window.cc_locales && Array.isArray(window.cc_locales)) {
            const locales = window.cc_locales;
            let localeKey;

            for (localeKey in locales) {
                if (!locales.hasOwnProperty(localeKey)) {
                    continue;
                }

                wrapper.loadTranslations(locales[localeKey]);
            }
        }
    }

    _setupTranslations(wrapper) {
        if (window.cc_translations && 'object' === typeof window.cc_translations) {
            const translations = window.cc_translations;
            let locale;

            for (locale in translations) {
                if (!translations.hasOwnProperty(locale)) {
                    continue;
                }

                wrapper.addTranslations(locale, translations[locale] || {});
            }
        }
    }
}

module.exports = CookieConsentWrapperFactory;

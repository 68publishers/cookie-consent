'use strict';

const CookieConsentWrapper = require('./CookieConsentWrapper');

class CookieConsentWrapperFactory {
    create() {
        if (window === undefined) {
            throw new Error('the window is not accessible.');
        }

        const cookieConsentWrapper = new CookieConsentWrapper(this._createGtagFunction());
        const wrapperConfig = window.cc_wrapper_config || {};

        this._setupPluginOptions(cookieConsentWrapper, wrapperConfig);
        this._setupConsentModalOptions(cookieConsentWrapper, wrapperConfig);
        this._setupSettingsModalOptions(cookieConsentWrapper, wrapperConfig);
        this._setupUiOptions(cookieConsentWrapper, wrapperConfig);
        this._setupStoragePool(cookieConsentWrapper, wrapperConfig);
        this._setupEventTriggers(cookieConsentWrapper, wrapperConfig);
        this._setupLocales(cookieConsentWrapper, wrapperConfig);
        this._setupTranslations(cookieConsentWrapper, wrapperConfig);

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

    _setupPluginOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('plugin_options') && 'object' === typeof wrapperConfig.plugin_options) {
            wrapper.setPluginOptions(wrapperConfig.plugin_options);
        }
    }

    _setupConsentModalOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('consent_modal_options') && 'object' === typeof wrapperConfig.consent_modal_options) {
            wrapper.setConsentModalOptions(wrapperConfig.consent_modal_options);
        }
    }

    _setupSettingsModalOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('settings_modal_options') && 'object' === typeof wrapperConfig.settings_modal_options) {
            wrapper.setSettingsModalOptions(wrapperConfig.settings_modal_options);
        }
    }

    _setupUiOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('ui_options') && 'object' === typeof wrapperConfig.ui_options) {
            wrapper.setUiOptions(wrapperConfig.ui_options);
        }
    }

    _setupStoragePool(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('storage_pool') && Array.isArray(wrapperConfig.storage_pool)) {
            const storagePool = wrapperConfig.storage_pool;

            for (let i in storagePool) {
                if (!storagePool.hasOwnProperty(i)) {
                    continue;
                }

                wrapper.addStorage(storagePool[i] || {});
            }
        }
    }

    _setupEventTriggers(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('event_triggers') && Array.isArray(wrapperConfig.event_triggers)) {
            const eventTriggers = wrapperConfig.event_triggers;

            for (let i in eventTriggers) {
                if (!eventTriggers.hasOwnProperty(i)) {
                    continue;
                }

                const eventTrigger = eventTriggers[i];

                wrapper.addEventTrigger(eventTrigger.name, eventTrigger.storage_names, eventTrigger.type);
            }
        }
    }

    _setupLocales(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('locales') && Array.isArray(wrapperConfig.locales)) {
            const locales = wrapperConfig.locales;
            let localeKey;

            for (localeKey in locales) {
                if (!locales.hasOwnProperty(localeKey)) {
                    continue;
                }

                wrapper.loadTranslations(locales[localeKey]);
            }
        }
    }

    _setupTranslations(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('translations') && 'object' === typeof wrapperConfig.translations) {
            const translations = wrapperConfig.translations;
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

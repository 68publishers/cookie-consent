'use strict';

const CookieConsentWrapper = require('./CookieConsentWrapper');

class CookieConsentWrapperFactory {
    create() {
        if (window === undefined) {
            throw new Error('the window is not accessible.');
        }

        const cookieConsentWrapper = new CookieConsentWrapper(this.#createGtagFunction());
        const wrapperConfig = window.cc_wrapper_config || {};

        this.#setupUser(cookieConsentWrapper, wrapperConfig);
        this.#setupPluginOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupAutoClearOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupConsentModalOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupSettingsModalOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupUiOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupStoragePool(cookieConsentWrapper, wrapperConfig);
        this.#setupEventTriggers(cookieConsentWrapper, wrapperConfig);
        this.#setupLocales(cookieConsentWrapper, wrapperConfig);
        this.#setupTranslations(cookieConsentWrapper, wrapperConfig);
        this.#setupCmpApiOptions(cookieConsentWrapper, wrapperConfig);

        if ('cookieConsentWrapperEvents' in window) {
            for (let i = 0; i < window.cookieConsentWrapperEvents.length; i++) {
                const eventArgs = window.cookieConsentWrapperEvents[i];

                if (eventArgs[0] && eventArgs[1]) {
                    cookieConsentWrapper.on(eventArgs[0], eventArgs[1], eventArgs[2] || null);
                }
            }

            window.cookieConsentWrapperEvents = {
                push: eventArgs => {
                    if (eventArgs[0] && eventArgs[1]) {
                        cookieConsentWrapper.on(eventArgs[0], eventArgs[1], eventArgs[2] || null);
                    }
                },
            }
        }

        cookieConsentWrapper.init(window, document);

        return cookieConsentWrapper;
    }

    #createGtagFunction() {
        let gtag = window.gtag;

        if (!gtag) {
            window.dataLayer = window.dataLayer || [];

            gtag = function gtag() {
                dataLayer.push(arguments);
            }
        }

        return gtag;
    }

    #setupUser(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('user_options') && 'object' === typeof wrapperConfig.user_options) {
            if (wrapperConfig.user_options.hasOwnProperty('identity') && wrapperConfig.user_options.identity) {
                wrapper.setStaticUserIdentity(wrapperConfig.user_options.identity);
            }

            if (wrapperConfig.user_options.hasOwnProperty('attributes') && 'object' === typeof wrapperConfig.user_options.attributes) {
                wrapper.user.attributes = wrapperConfig.user_options.attributes;
            }
        }
    }

    #setupPluginOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('plugin_options') && 'object' === typeof wrapperConfig.plugin_options) {
            wrapper.setPluginOptions(wrapperConfig.plugin_options);
        }
    }

    #setupAutoClearOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('auto_clear_options') && 'object' === typeof wrapperConfig.auto_clear_options) {
            wrapper.setAutoClearOptions(wrapperConfig.auto_clear_options);
        }
    }

    #setupConsentModalOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('consent_modal_options') && 'object' === typeof wrapperConfig.consent_modal_options) {
            wrapper.setConsentModalOptions(wrapperConfig.consent_modal_options);
        }
    }

    #setupSettingsModalOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('settings_modal_options') && 'object' === typeof wrapperConfig.settings_modal_options) {
            wrapper.setSettingsModalOptions(wrapperConfig.settings_modal_options);
        }
    }

    #setupUiOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('ui_options') && 'object' === typeof wrapperConfig.ui_options) {
            wrapper.setUiOptions(wrapperConfig.ui_options);
        }
    }

    #setupStoragePool(wrapper, wrapperConfig) {
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

    #setupEventTriggers(wrapper, wrapperConfig) {
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

    #setupLocales(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('locales') && Array.isArray(wrapperConfig.locales)) {
            const locales = wrapperConfig.locales;
            let localeKey;

            for (localeKey in locales) {
                if (!locales.hasOwnProperty(localeKey)) {
                    continue;
                }

                void wrapper.loadTranslations(locales[localeKey]);
            }
        }
    }

    #setupTranslations(wrapper, wrapperConfig) {
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

    #setupCmpApiOptions(wrapper, wrapperConfig) {
        if (wrapperConfig.hasOwnProperty('cmp_api_options') && 'object' === typeof wrapperConfig.cmp_api_options) {
            wrapper.setCmpApiOptions(wrapperConfig.cmp_api_options);
        }
    }
}

module.exports = CookieConsentWrapperFactory;

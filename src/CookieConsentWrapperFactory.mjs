import { CookieConsentWrapper } from './CookieConsentWrapper.mjs';

export class CookieConsentWrapperFactory {
    create() {
        if (window === undefined) {
            throw new Error('the window is not accessible.');
        }

        const cookieConsentWrapper = new CookieConsentWrapper(this.#createGtagFunction());
        const wrapperConfig = window.cc_wrapper_config || {};

        this.#setupLocales(cookieConsentWrapper, wrapperConfig);
        this.#setupUser(cookieConsentWrapper, wrapperConfig);
        this.#setupPluginOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupAutoClearOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupConsentModalOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupSettingsModalOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupUiOptions(cookieConsentWrapper, wrapperConfig);
        this.#setupStoragePool(cookieConsentWrapper, wrapperConfig);
        this.#setupEventTriggers(cookieConsentWrapper, wrapperConfig);
        this.#setupTranslations(cookieConsentWrapper, wrapperConfig);
        this.#setupCmpApiOptions(cookieConsentWrapper, wrapperConfig);

        if ('cookieConsentWrapperEvents' in window) {
            for (let i = 0; i < window.cookieConsentWrapperEvents.length; i++) {
                const eventArgs = window.cookieConsentWrapperEvents[i];

                if (eventArgs[0] && eventArgs[1]) {
                    cookieConsentWrapper.on(eventArgs[0], eventArgs[1], eventArgs[2] || null);
                }
            }
        }

        window.cookieConsentWrapperEvents = {
            push: eventArgs => {
                if (eventArgs[0] && eventArgs[1]) {
                    cookieConsentWrapper.on(eventArgs[0], eventArgs[1], eventArgs[2] || null);
                }
            },
        }

        cookieConsentWrapper.init(window, document);

        return cookieConsentWrapper;
    }

    #createGtagFunction() {
        let gtag = window.gtag;

        if (!gtag) {
            window.dataLayer = window.dataLayer || [];

            gtag = function gtag() {
                window.dataLayer.push(arguments);
            }
        }

        return gtag;
    }

    #setupUser(wrapper, wrapperConfig) {
        if ('user_options' in wrapperConfig && 'object' === typeof wrapperConfig.user_options) {
            if ('identity' in wrapperConfig.user_options && wrapperConfig.user_options.identity) {
                wrapper.setStaticUserIdentity(wrapperConfig.user_options.identity);
            }

            if ('attributes' in wrapperConfig.user_options && 'object' === typeof wrapperConfig.user_options.attributes) {
                wrapper.user.attributes = wrapperConfig.user_options.attributes;
            }
        }
    }

    #setupPluginOptions(wrapper, wrapperConfig) {
        if ('plugin_options' in wrapperConfig && 'object' === typeof wrapperConfig.plugin_options) {
            wrapper.setPluginOptions(wrapperConfig.plugin_options);
        }
    }

    #setupAutoClearOptions(wrapper, wrapperConfig) {
        if ('auto_clear_options' in wrapperConfig && 'object' === typeof wrapperConfig.auto_clear_options) {
            wrapper.setAutoClearOptions(wrapperConfig.auto_clear_options);
        }
    }

    #setupConsentModalOptions(wrapper, wrapperConfig) {
        if ('consent_modal_options' in wrapperConfig && 'object' === typeof wrapperConfig.consent_modal_options) {
            wrapper.setConsentModalOptions(wrapperConfig.consent_modal_options);
        }
    }

    #setupSettingsModalOptions(wrapper, wrapperConfig) {
        if ('settings_modal_options' in wrapperConfig && 'object' === typeof wrapperConfig.settings_modal_options) {
            wrapper.setSettingsModalOptions(wrapperConfig.settings_modal_options);
        }
    }

    #setupUiOptions(wrapper, wrapperConfig) {
        if ('ui_options' in wrapperConfig && 'object' === typeof wrapperConfig.ui_options) {
            wrapper.setUiOptions(wrapperConfig.ui_options);
        }
    }

    #setupStoragePool(wrapper, wrapperConfig) {
        if ('storage_pool' in wrapperConfig && Array.isArray(wrapperConfig.storage_pool)) {
            const storagePool = wrapperConfig.storage_pool;

            for (let i in storagePool) {
                wrapper.addStorage(storagePool[i] || {});
            }
        }
    }

    #setupEventTriggers(wrapper, wrapperConfig) {
        if ('event_triggers' in wrapperConfig && Array.isArray(wrapperConfig.event_triggers)) {
            const eventTriggers = wrapperConfig.event_triggers;

            for (let i in eventTriggers) {
                const eventTrigger = eventTriggers[i];

                wrapper.addEventTrigger(eventTrigger.name, eventTrigger.storage_names, eventTrigger.type);
            }
        }
    }

    #setupLocales(wrapper, wrapperConfig) {
        if ('locales' in wrapperConfig && Array.isArray(wrapperConfig.locales)) {
            const locales = wrapperConfig.locales;
            let localeKey;

            for (localeKey in locales) {
                void wrapper.loadTranslations(locales[localeKey]);
            }
        }
    }

    #setupTranslations(wrapper, wrapperConfig) {
        if ('translations' in wrapperConfig && 'object' === typeof wrapperConfig.translations) {
            const translations = wrapperConfig.translations;
            let locale;

            for (locale in translations) {
                wrapper.addTranslations(locale, translations[locale] || {});
            }
        }
    }

    #setupCmpApiOptions(wrapper, wrapperConfig) {
        if ('cmp_api_options' in wrapperConfig && 'object' === typeof wrapperConfig.cmp_api_options) {
            wrapper.setCmpApiOptions(wrapperConfig.cmp_api_options);
        }
    }
}

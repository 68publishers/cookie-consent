'use strict';

require('vanilla-cookieconsent');

const Config = require('./Config/Config');
const Storage = require('./Storage/Storage');
const StoragePool = require('./Storage/StoragePool');
const ConsentManager = require('./ConsentManager');
const Dictionary = require('./Translation/Dictionary');
const StylesheetLoader = require('./Ui/StylesheetLoader');
const ModalTriggerFactory = require('./Ui/ModalTriggerFactory');

class CookieConsentWrapper {
    constructor(gtag) {
        this._initialized = false;
        this._gtag = gtag;
        this._config = new Config();
        this._storagePool = new StoragePool();
        this._dictionary = new Dictionary();

        this._cookieConsent = null;
    }

    setPluginOptions(options) {
        this._config.pluginOptions.merge(options || {});
    }

    setConsentModalOptions(options) {
        this._config.consentModalOptions.merge(options || {});
    }

    setSettingsModalOptions(options) {
        this._config.settingsModalOptions.merge(options || {});
    }

    setUiOptions(options) {
        this._config.uiOptions.merge(options || {});
    }

    addStorage(config) {
        this._storagePool.add(new Storage(config || {}));
    }

    addTranslations(locale, translations) {
        this._dictionary.addTranslations(locale, translations || {});
    }

    loadTranslations(locale) {
        let translations;

        try {
            translations = require(`./resources/translations/${locale}`);
        } catch (e) {
            translations = {};
        }

        this.addTranslations(locale, translations);
    }

    unwrap() {
        if (null === this._cookieConsent) {
            throw new Error('Cookie consent is not created, please call method CookieConsentWrapper.init().');
        }

        return this._cookieConsent;
    }

    init(window, document) {
        if (this._initialized) {
            return;
        }

        const self = this;

        if (document) {
            // load stylesheets and modal trigger
            const documentLoadedCallback = function () {
                StylesheetLoader.loadFromConfig(document, self._config.uiOptions);

                if (document && 'string' === typeof self._config.uiOptions.modal_trigger_selector) {
                    const modalTriggerFactory = new ModalTriggerFactory(document, self._dictionary);

                    modalTriggerFactory.create(self._config.uiOptions.modal_trigger_selector, document.documentElement.lang);
                }
            };

            if ('loading' !== document.readyState) {
                documentLoadedCallback();
            } else {
                document.addEventListener('DOMContentLoaded', documentLoadedCallback);
            }
        }

        window.addEventListener('load', function () {
            // init cookie consent
            self._cookieConsent = initCookieConsent();
            const consentManager = new ConsentManager(self._cookieConsent, self._storagePool, self._gtag);

            // build cookie consent config
            const config = self._config.buildCookieConsentConfig();
            config.onAccept = () => consentManager.onAccept();
            config.onChange = () => consentManager.onChange();
            config.languages = self._dictionary.build(self._storagePool);

            // run cookie consent
            self._cookieConsent.run(config);
        });

        this._initialized = true;
    }
}

module.exports = CookieConsentWrapper;

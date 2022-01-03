'use strict';

require('vanilla-cookieconsent');

const Config = require('./Config/Config');
const Storage = require('./Storage/Storage');
const StoragePool = require('./Storage/StoragePool');
const ConsentManager = require('./ConsentManager');
const Dictionary = require('./Translation/Dictionary');
const StylesheetLoader = require('./Ui/StylesheetLoader');
const ModalTriggerFactory = require('./Ui/ModalTriggerFactory');
const EventBus = require('./EventBus/EventBus');
const Events = require('./EventBus/Events');
const EventTrigger = require('./Storage/EventTrigger');

class CookieConsentWrapper {
    constructor(gtag) {
        this._initialized = false;
        this._gtag = gtag;
        this._config = new Config();
        this._storagePool = new StoragePool();
        this._dictionary = new Dictionary();
        this._eventBus = new EventBus();
        this._eventTriggers = {};

        this._cookieConsent = null;
    }

    setPluginOptions(options) {
        this._config.pluginOptions.merge(options || {});
    }

    setAutoClearOptions(options) {
        this._config.autoClearOptions.merge(options || {});
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

    addEventTrigger(name, storageNames, type = EventTrigger.TYPE_OR) {
        this._eventTriggers[name] = new EventTrigger(name, storageNames, type);
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

    allowedCategory(name) {
        return this.unwrap().allowedCategory(name);
    }

    on(event, callback, scope = null) {
        if (Events.ON_INIT === event && this._initialized && null !== this._cookieConsent) {
            callback.call(scope, this);

            return function () {};
        }

        return this._eventBus.subscribe(event, callback, scope);
    }

    init(window, document) {
        if (this._initialized) {
            return;
        }

        const self = this;
        window.CookieConsentWrapper = self;

        if (document) {
            // load stylesheets
            const documentLoadedCallback = function () {
                StylesheetLoader.loadFromConfig(document, self._config.uiOptions);
            };

            if ('loading' !== document.readyState) {
                documentLoadedCallback();
            } else {
                document.addEventListener('DOMContentLoaded', documentLoadedCallback);
            }
        }

        const windowLoadedCallback = function () {
            // init cookie consent
            self._cookieConsent = initCookieConsent();
            const consentManager = new ConsentManager(self._cookieConsent, self._config, self._storagePool, Object.values(self._eventTriggers), self._gtag);

            // build cookie consent config
            const config = self._config.exportCookieConsentConfig();
            config.onFirstAction = (userPreferences) => consentManager.onFirstAction(userPreferences);
            config.onAccept = () => consentManager.onAccept();
            config.onChange = (cookie, changedCategories) => consentManager.onChange(cookie, changedCategories);
            config.languages = self._dictionary.exportTranslations(self._storagePool, self._config);

            let modalTriggerElements;

            // load modal trigger, must be created before cookieconsent.run()
            if (document && 'string' === typeof self._config.settingsModalOptions.modal_trigger_selector) {
                const modalTriggerFactory = new ModalTriggerFactory(document, self._dictionary);

                modalTriggerElements = modalTriggerFactory.create(self._config.settingsModalOptions.modal_trigger_selector, self._config.pluginOptions.current_lang || document.documentElement.lang);
            }

            // run cookie consent
            self._cookieConsent.run(config);

            // re-translate modal trigger
            if (modalTriggerElements && modalTriggerElements.textElement) {
                modalTriggerElements.textElement.innerHTML = self._dictionary.translate(self._cookieConsent.getConfig('current_lang'), 'modal_trigger_title');
            }

            self._eventBus.dispatch(Events.ON_INIT, self);
        };

        if ('complete' === document.readyState) {
            windowLoadedCallback();
        } else {
            window.addEventListener('load', windowLoadedCallback);
        }

        this._initialized = true;
    }
}

module.exports = CookieConsentWrapper;

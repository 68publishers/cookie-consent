'use strict';

require('vanilla-cookieconsent');

const version = require('../package.json').version;
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
const User = require('./User/User');
const Sha256 = require('crypto-js/sha256');
const CmpApiIntegration = require('./Integration/CmpApiIntegration');
const ThirdButtonAppender = require('./Ui/ThirdButtonAppender');
const CookieTables = require('./CookieTable/CookieTables');

class CookieConsentWrapper {
    constructor(gtag) {
        this._initializationTriggered = false;
        this._initialized = false;
        this._gtag = gtag;
        this._config = new Config();
        this._storagePool = new StoragePool();
        this._dictionary = new Dictionary();
        this._eventBus = new EventBus();
        this._cookieTables = new CookieTables();
        this._eventTriggers = {};
        this._user = User.createDefault();

        this._cookieConsent = null;
    }

    get version() {
        return version;
    }

    get user() {
        return this._user;
    }

    get configurationExport() {
        let configuration = {
            version: this.version,
            config: this._config,
            storages: {},
            dictionary: this._dictionary._catalogues,
        };
        const storages = this._storagePool.all();

        for (let name in storages) {
            configuration.storages[name] = storages[name].config;
        }

        const configurationString = JSON.stringify(configuration);
        configuration = JSON.parse(configurationString);

        return {
            configuration: configuration,
            checksum: Sha256(configurationString).toString(),
        };
    }

    get cookieTables() {
        return this._cookieTables;
    }

    get consentCookieData() {
        const cookieName = this._config.pluginOptions.cookie_name;
        let cookieValue = document.cookie.match("(^|;)\\s*" + cookieName + "\\s*=\\s*([^;]+)");
        cookieValue = cookieValue ? cookieValue.pop() : null;

        if (null === cookieValue) {
            return null;
        }

        try{
            cookieValue = JSON.parse(cookieValue)
        } catch (e) {
            try {
                cookieValue = JSON.parse(decodeURIComponent(cookieValue))
            } catch (e) {
                cookieValue = null;
            }
        }

        return cookieValue;
    }

    setStaticUserIdentity(id) {
        this._user = this.user.withStaticIdentity(id);
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

    setCmpApiOptions(options) {
        this._config.cmpApiOptions.merge(options || {});
    }

    addStorage(config) {
        this._storagePool.add(new Storage(config || {}));
    }

    addEventTrigger(name, storageNames, type = EventTrigger.TYPE_OR) {
        this._eventTriggers[name] = new EventTrigger(name, storageNames, type);
    }

    translate(locale, key) {
        return this._dictionary.translate(locale, key);
    }

    addTranslations(locale, translations) {
        this._dictionary.addTranslations(locale, translations || {});
    }

    loadTranslations(locale) {
        const localeIso639 = 2 < locale.length ? locale[0] + locale[1] : locale;
        let translations;

        try {
            translations = require(`./resources/translations/${localeIso639}`);
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

    changeLocale(locale, force) {
        const plugin = this.unwrap();

        this._eventBus.dispatch(Events.ON_LOCALE_CHANGE, locale);

        plugin.updateLanguage(locale, force);
    }

    on(event, callback, scope = null) {
        if (Events.ON_INIT === event && this._initialized && null !== this._cookieConsent) {
            callback.call(scope);

            return function () {};
        }

        return this._eventBus.subscribe(event, callback, scope);
    }

    init(window, document) {
        if (this._initializationTriggered) {
            return;
        }

        const self = this;
        window.CookieConsentWrapper = self;

        if (!document) {
            return;
        }

        this._initializationTriggered = true;

        const documentLoadedCallback = function () {
            // load stylesheets
            StylesheetLoader.loadFromConfig(document, self._config.uiOptions);

            // init cookie consent
            self._cookieConsent = initCookieConsent();

            const consentManager = new ConsentManager(self._cookieConsent, self._eventBus, self._config, self._storagePool, Object.values(self._eventTriggers), self._gtag);

            // build cookie consent config
            const config = self._config.exportCookieConsentConfig();
            config.onFirstAction = (userPreferences) => consentManager.onFirstAction(userPreferences);
            config.onAccept = () => consentManager.onAccept();
            config.onChange = (cookie, changedCategories) => consentManager.onChange(cookie, changedCategories);

            config.languages = self._dictionary
                .addPlaceholder('user_identity', self.user.identity.toString())
                .exportTranslations(self._storagePool, self._config);

            self._cookieTables.appendCookieTables(config.languages);

            let modalTriggerElements;

            // load modal trigger, must be created before cookieconsent.run()
            if (document && 'string' === typeof self._config.settingsModalOptions.modal_trigger_selector) {
                const modalTriggerFactory = new ModalTriggerFactory(document, self._dictionary);

                modalTriggerElements = modalTriggerFactory.create(self._config.settingsModalOptions.modal_trigger_selector, self._config.pluginOptions.current_lang || document.documentElement.lang);
            }

            CmpApiIntegration(self, self._config.cmpApiOptions);

            if (self._config.consentModalOptions.show_third_button) {
                self.on(Events.ON_INIT, function () {
                    const appender = new ThirdButtonAppender();

                    appender.append(self, document);
                });
            }

            // run cookie consent
            self._cookieConsent.run(config);

            // re-translate modal trigger
            if (modalTriggerElements && modalTriggerElements.textElement) {
                modalTriggerElements.textElement.innerHTML = self.translate(self._cookieConsent.getConfig('current_lang'), 'modal_trigger_title');
            }

            self._initialized = true;
            self._eventBus.dispatch(Events.ON_INIT);
        };

        if ('loading' !== document.readyState) {
            documentLoadedCallback();
        } else {
            document.addEventListener('DOMContentLoaded', documentLoadedCallback);
        }
    }
}

module.exports = CookieConsentWrapper;

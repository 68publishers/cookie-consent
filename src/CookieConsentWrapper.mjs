import 'vanilla-cookieconsent';
import pkg from '../package.json';
import { Config } from './Config/Config.mjs';
import { Storage } from './Storage/Storage.mjs';
import { StoragePool } from './Storage/StoragePool.mjs';
import { ConsentManager } from './ConsentManager.mjs';
import { Dictionary } from './Translation/Dictionary.mjs';
import { StylesheetLoader } from './Ui/StylesheetLoader.mjs';
import { ModalTriggerFactory } from './Ui/ModalTriggerFactory.mjs';
import { EventBus } from './EventBus/EventBus.mjs';
import { Events } from './EventBus/Events.mjs';
import { EventTrigger } from './Storage/EventTrigger.mjs';
import { User } from './User/User.mjs';
import { ThirdButtonAppender } from './Ui/ThirdButtonAppender.mjs';
import { CookieTables } from './CookieTable/CookieTables.mjs';

import { integrateCmpApi } from './Integration/CmpApiIntegration.mjs';
import sha256 from 'crypto-js/sha256.js';

const version = pkg.version;

export class CookieConsentWrapper {
    constructor(gtag) {
        this._initializationTriggered = false;
        this._initialized = false;
        this._gtag = gtag;
        this._cookieConsent = null;
        this._scriptBasePath = '';

        if (document.currentScript && document.currentScript.src) {
            const url = new URL(document.currentScript.src, window.location.origin);
            const pathname = url.pathname.substring(0, url.pathname.lastIndexOf('/'));

            this._scriptBasePath = url.origin + pathname;
        }

        this._config = new Config(this._scriptBasePath);
        this._storagePool = new StoragePool();
        this._dictionary = new Dictionary();
        this._eventBus = new EventBus();
        this._cookieTables = new CookieTables();
        this._eventTriggers = {};
        this._user = User.createDefault();
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

        for (let index in storages) {
            const storage = storages[index];
            configuration.storages[storage.name] = storage.config;
        }

        const configurationString = JSON.stringify(configuration);
        configuration = JSON.parse(configurationString);

        return {
            configuration: configuration,
            checksum: sha256(configurationString).toString(),
        };
    }

    get cookieTables() {
        return this._cookieTables;
    }

    get consentCookieValue() {
        if (!this._cookieConsent.validConsent()) {
            return null;
        }

        const cookieName = this._config.pluginOptions.cookie_name;
        let cookieValue = document.cookie.match("(^|;)\\s*" + cookieName + "\\s*=\\s*([^;]+)");

        return cookieValue ? cookieValue.pop() : null;
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
        } catch (e) { // eslint-disable-line no-unused-vars
            try {
                cookieValue = JSON.parse(decodeURIComponent(cookieValue))
            } catch (e) { // eslint-disable-line no-unused-vars
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

    loadTranslations(localeOrUrl, override = false) {
        let url;
        let locale;

        if (localeOrUrl.startsWith('https://') || localeOrUrl.startsWith('http://')) {
            locale = localeOrUrl.split('/').pop().split('.').shift();
            locale = 2 < locale.length ? locale[0] + locale[1] : locale;
            url = localeOrUrl;
        } else {
            locale = localeOrUrl;
            locale = 2 < locale.length ? locale[0] + locale[1] : locale;
            url = `${this._scriptBasePath}/translations/${locale}.json`;
        }

        return this._dictionary.loadTranslations(locale, url, override);
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

        const doInitCookieConsent = async function () {
            // load stylesheets
            StylesheetLoader.loadFromConfig(document, self._config.uiOptions);

            // init cookie consent
            self._cookieConsent = window.initCookieConsent();

            const consentManager = new ConsentManager(self._cookieConsent, self._eventBus, self._config, self._storagePool, Object.values(self._eventTriggers), self._gtag);

            // build cookie consent config
            const config = self._config.exportCookieConsentConfig();
            config.onFirstAction = (userPreferences) => consentManager.onFirstAction(userPreferences);
            config.onAccept = () => consentManager.onAccept();
            config.onChange = (cookie, changedCategories) => consentManager.onChange(cookie, changedCategories);

            config.languages = await self._dictionary
                .addPlaceholder('user_identity', self.user.identity.toString())
                .exportTranslations(self._storagePool, self._config);

            self._cookieTables.appendCookieTables(config.languages);

            integrateCmpApi(self, self._config.cmpApiOptions);

            if (self._config.consentModalOptions.show_third_button) {
                self.on(Events.ON_INIT, function () {
                    const appender = new ThirdButtonAppender();

                    appender.append(self, document);
                });
            }

            // run cookie consent
            self._cookieConsent.run(config);

            self._initialized = true;
            self._eventBus.dispatch(Events.ON_INIT);
        };

        const doInitSettingsModalTrigger = () => {
            if (!document || 'string' !== typeof self._config.settingsModalOptions.modal_trigger_selector) {
                return;
            }

            const modalTriggerFactory = new ModalTriggerFactory(document, self._dictionary);
            const modalTriggerElements = modalTriggerFactory.create(
                self._config.settingsModalOptions.modal_trigger_selector,
                self._config.pluginOptions.current_lang || document.documentElement.lang.split('-')[0],
            );

            // re-translate modal trigger
            if (modalTriggerElements && modalTriggerElements.textElement) {
                modalTriggerElements.textElement.innerHTML = self.translate(self._cookieConsent.getConfig('current_lang'), 'modal_trigger_title');
            }
        };

        let initPromise = null;

        if (!this._config.pluginOptions.init_after_dom_content_loaded) {
            initPromise = doInitCookieConsent();
        }

        if ('loading' !== document.readyState) {
            null === initPromise && (initPromise = doInitCookieConsent());
            initPromise.then(doInitSettingsModalTrigger);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                null === initPromise && (initPromise = doInitCookieConsent());
                initPromise.then(doInitSettingsModalTrigger);
            });
        }
    }
}

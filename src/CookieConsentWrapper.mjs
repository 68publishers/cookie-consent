import 'vanilla-cookieconsent/src/cookieconsent.js';
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

import { checkVisibility } from './Ui/Utils.mjs';

const version = pkg.version;

export class CookieConsentWrapper {
    constructor(gtag) {
        this._initializationTriggered = false;
        this._initialized = false;
        this._gtag = gtag;

        /**
         * @type {(CookieConsent & {
         *     __updateModalFocusableData: () => void,
         *     __getFocusableEdges: () => HTMLElement[]|undefined,
         *     __generateFocusSpan: (number) => HTMLElement,
         *     __isConsentModalExists: () => boolean,
         *     __getFocusedModal: () => HTMLElement,
         * })|null}
         */
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
        this.utils = {
            checkVisibility,
        };
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

        // load stylesheets
        StylesheetLoader.loadFromConfig(document, self._config.uiOptions);

        const doInitCookieConsent = async function () {
            // init cookie consent
            // noinspection JSValidateTypes
            self._cookieConsent = window.initCookieConsent();

            const runOriginal = self._cookieConsent.run;
            const updateLanguageOriginal = self._cookieConsent.updateLanguage;
            const acceptOriginal = self._cookieConsent.accept;
            const hideSettingsOriginal = self._cookieConsent.hideSettings;

            const processVisibleReadonlyDisabledStorages = () => {
                const container = document.getElementById('s-bl');

                if (!container) {
                    return;
                }

                const storages = self._storagePool.findVisibleReadonlyDisabled();

                for (let i in storages) {
                    const storage = storages[i];
                    const input = container.querySelector(`input[value="${storage.name}"].c-tgl`);
                    const span = container.querySelector(`input[value="${storage.name}"].c-tgl ~ .c-tg`);

                    if (!input || !span) {
                        continue;
                    }

                    input.disabled = true;
                    input.checked = false;
                    !span.classList.contains('c-ro') && (span.classList.add('c-ro'));
                }
            };

            self._cookieConsent.run = (function (config) {
                runOriginal(config);

                if (self._config.consentModalOptions.show_third_button) {
                    const appender = new ThirdButtonAppender();
                    appender.append(self, document);
                }

                requestAnimationFrame(() => {
                    self.#reorderSettingsModalButtons();
                });

                if (self._config.pluginOptions.autorun && self._cookieConsent.__isConsentModalExists()) {
                    const delay = self._config.pluginOptions.delay;

                    setTimeout(function() {
                        self._cookieConsent.show(0);
                    }, delay > 0 ? delay : 0);
                }

                processVisibleReadonlyDisabledStorages();
            }).bind(self._cookieConsent);

            self._cookieConsent.updateLanguage = (function (lang, force) {
                const focusedElement = document.activeElement;

                if (updateLanguageOriginal(lang, force)) {
                    self._cookieConsent.__updateModalFocusableData();
                    const focusedModal = self._cookieConsent.__getFocusedModal();

                    if (focusedModal && !focusedModal.contains(focusedElement)) {
                        self._cookieConsent.__getFocusableEdges()[0]?.focus();
                    }
                }
                processVisibleReadonlyDisabledStorages();
            }).bind(self._cookieConsent);

            self._cookieConsent.accept = (function (_categories, _exclusions) {
                const storages = self._storagePool.findVisibleReadonlyDisabled().map(storage => storage.name);

                if (0 < storages.length) {
                    _exclusions = Array.isArray(_exclusions) ? _exclusions : [];

                    for (let i in storages) {
                        -1 === _exclusions.indexOf(storages[i]) && (_exclusions.push(storages[i]));
                    }
                }

                acceptOriginal(_categories, _exclusions);
            }).bind(self._cookieConsent);

            self._cookieConsent.hideSettings = (function () {
                hideSettingsOriginal();

                // close opened storage descriptions
                setTimeout(() => {
                    Array.from(document.querySelectorAll('#s-bl .b-tl.exp[aria-expanded="true"]')).forEach(blockTitleBtn => {
                        const blockSection = blockTitleBtn.closest('.c-bl.act');
                        const accordionId = blockTitleBtn.getAttribute('aria-controls');
                        const accordion = accordionId ? document.getElementById(accordionId) : null;

                        blockTitleBtn.setAttribute('aria-expanded', 'false');
                        blockSection && blockSection.classList.remove('act');
                        accordion && accordion.setAttribute('aria-hidden', 'true');
                    });
                }, 250);
            }).bind(self._cookieConsent);

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
                self._config.pluginOptions.current_lang || document.documentElement.lang,
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

    #reorderSettingsModalButtons() {
        const container = document.getElementById('s-bns');

        if (!container) {
            return;
        }

        const buttons = Array.from(container.querySelectorAll('button'));

        if (0 === buttons.length) {
            return;
        }

        const withOrder = buttons.map(button => {
            const orderStr = getComputedStyle(button).order;
            const order = parseInt(orderStr, 10);

            return {
                button,
                originalOrder: isNaN(order) ? 0 : order,
            };
        });

        const hasCustomOrder = withOrder.some(item => 0 !== item.originalOrder);

        if (!hasCustomOrder) {
            return;
        }

        withOrder.sort((a, b) => a.originalOrder - b.originalOrder);

        withOrder.forEach(({ button }) => {
            container.appendChild(button);
            button.style.order = '';
        });
    }
}

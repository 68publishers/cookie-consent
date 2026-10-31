import * as CookieConsent from 'vanilla-cookieconsent';
import { Config } from './Config/Config.mjs';
import { buildPluginConfig, PREFERENCES_MODE_SERVICES } from './Config/V3ConfigBuilder.mjs';
import { Storage } from './Storage/Storage.mjs';
import { StoragePool } from './Storage/StoragePool.mjs';
import { CookieMigrator } from './Storage/CookieMigrator.mjs';
import { ConsentManager } from './ConsentManager.mjs';
import { Dictionary } from './Translation/Dictionary.mjs';
import { StylesheetLoader } from './Ui/StylesheetLoader.mjs';
import { ModalTriggerFactory } from './Ui/ModalTriggerFactory.mjs';
import { rewriteScriptAttributes } from './Ui/ScriptAttributeRewriter.mjs';
import { applyLegacyConsentModalIds, applyLegacyPreferencesModalIds } from './Ui/LegacyCompat.mjs';
import { createPluginProxy } from './Ui/PluginProxy.mjs';
import { placeSecondaryBeforeThird, reorderByCssOrder } from './Ui/ButtonOrder.mjs';
import { EventBus } from './EventBus/EventBus.mjs';
import { Events } from './EventBus/Events.mjs';
import { EventTrigger } from './Storage/EventTrigger.mjs';
import { User } from './User/User.mjs';
import { CookieTables } from './CookieTable/CookieTables.mjs';
import { integrateCmpApi } from './Integration/CmpApiIntegration.mjs';
import { readRawCookies, parseCookieValue } from './Utils/Cookies.mjs';
import { removeDuplicatedCookies } from './Utils/DuplicatedCookies.mjs';
import { sha256Hex } from './Utils/Crypto.mjs';

import { checkVisibility } from './Ui/Utils.mjs';

/* global __CC_VERSION__ */
const version = 'undefined' !== typeof __CC_VERSION__ ? __CC_VERSION__ : 'dev';
const BOT_PATTERN = /bot|crawl|spider|slurp|teoma/i;

// the first visible and enabled button or link of a modal
const focusFirst = (modal) => [...modal.querySelectorAll('a[href], button, input')].find(el => !el.disabled && el.offsetParent)?.focus();

export class CookieConsentWrapper {
    constructor(gtag) {
        this._initializationTriggered = false;
        this._initialized = false;
        this._gtag = gtag;

        /** @type {object|null} vanilla-cookieconsent 3.x with cookie writes kept readable by 1.x */
        this._plugin = null;
        /** @type {object|null} the object returned by unwrap() */
        this._pluginProxy = null;
        this._consentManager = null;
        this._currentLocale = null;
        this._settingsModalClosable = true;

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

    get currentLocale() {
        return this._currentLocale || this._config.pluginOptions.current_lang;
    }

    /**
     * The configuration sent to the CMP and its SHA-256 checksum.
     * @returns {Promise<{configuration: object, checksum: string}>} a Promise since 2.0 (WebCrypto is asynchronous)
     */
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

        return sha256Hex(configurationString).then(checksum => ({
            configuration: configuration,
            checksum: checksum,
        }));
    }

    get cookieTables() {
        return this._cookieTables;
    }

    get servicesMode() {
        return PREFERENCES_MODE_SERVICES === this._config.settingsModalOptions.preferences_mode;
    }

    /**
     * Accepted services (providers) by storage: sorted, unique, storages without an accepted service are left out.
     * @returns {Object<string, string[]>}
     */
    get acceptedServices() {
        if (!this._plugin) {
            return {};
        }

        const accepted = this._plugin.getUserPreferences().acceptedServices || {};
        const normalized = {};

        for (const category of Object.keys(accepted).sort()) {
            const services = [...new Set(accepted[category] || [])].sort();

            if (0 < services.length) {
                normalized[category] = services;
            }
        }

        return normalized;
    }

    /**
     * Loads the translations of the locale (they are loaded lazily).
     */
    loadLocale(locale) {
        return this._dictionary.load(locale);
    }

    get consentCookieValue() {
        if (!this._plugin || !this._plugin.validConsent()) {
            return null;
        }

        return readRawCookies(this._config.pluginOptions.cookie_name)[0] ?? null;
    }

    get consentCookieData() {
        return parseCookieValue(readRawCookies(this._config.pluginOptions.cookie_name)[0] ?? null);
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

    setDataLayerOptions(options) {
        this._config.dataLayerOptions.merge(options || {});
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

    #resolveTranslationsUrl(localeOrUrl) {
        let url;
        let locale;

        if (localeOrUrl.startsWith('https://') || localeOrUrl.startsWith('http://')) {
            locale = localeOrUrl.split('/').pop().split('.').shift();
            url = localeOrUrl;
        } else {
            locale = localeOrUrl;
            url = null;
        }

        locale = 2 < locale.length ? locale[0] + locale[1] : locale;

        return { locale, url: url || `${this._scriptBasePath}/translations/${locale}.json` };
    }

    loadTranslations(localeOrUrl, override = false) {
        const { locale, url } = this.#resolveTranslationsUrl(localeOrUrl);

        return this._dictionary.loadTranslations(locale, url, override);
    }

    /**
     * Registers the translation file of the locale; it is loaded only when the locale is used.
     */
    registerTranslations(localeOrUrl) {
        const { locale, url } = this.#resolveTranslationsUrl(localeOrUrl);

        this._dictionary.registerSource(locale, url);
    }

    unwrap() {
        if (null === this._pluginProxy) {
            throw new Error('Cookie consent is not created, please call method CookieConsentWrapper.init().');
        }

        return this._pluginProxy;
    }

    allowedCategory(name) {
        return this.unwrap().acceptedCategory(name);
    }

    changeLocale(locale, force) {
        this.unwrap();
        this._eventBus.dispatch(Events.ON_LOCALE_CHANGE, locale);

        return this.#setLanguage(locale, force);
    }

    /**
     * Re-renders the modals with the current translations (e.g. after cookie tables were loaded from the CMP).
     */
    refreshTranslations(locale) {
        if (!this._plugin || (locale && locale !== this.currentLocale)) {
            return Promise.resolve(false);
        }

        return this.#setLanguage(this.currentLocale, true);
    }

    // setLanguage(…, true) re-renders the modals: the focused element disappears, the focus goes back into the modal
    #setLanguage(locale, force) {
        const focusedModal = document.activeElement instanceof Element ? document.activeElement.closest('#cc-main .cm, #cc-main .pm') : null;
        const modalSelector = focusedModal ? (focusedModal.classList.contains('pm') ? '#cc-main .pm' : '#cc-main .cm') : null;

        return this._plugin.setLanguage(locale, force).then((changed) => {
            this.#rearrangeModals();

            const modal = modalSelector && document.querySelector(modalSelector);
            modal && !modal.contains(document.activeElement) && focusFirst(modal);

            return changed;
        });
    }

    /**
     * false keeps the settings modal open: no close icon, Escape and a click outside do nothing
     * and the modal re-opens after a button saves the consent (e.g. consent settings inside a mobile app).
     */
    setSettingsModalClosable(closable) {
        this._settingsModalClosable = !!closable;
        document.documentElement.classList.toggle('cc--settings-unclosable', !this._settingsModalClosable);
    }

    on(event, callback, scope = null) {
        if (Events.ON_INIT === event && this._initialized && null !== this._plugin) {
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

        StylesheetLoader.loadFromConfig(document, self._config.uiOptions);

        const doInitCookieConsent = async function () {
            const pluginOptions = self._config.pluginOptions;
            const cookieOptions = {
                name: pluginOptions.cookie_name,
                domain: pluginOptions.resolveCookieDomain(),
                path: pluginOptions.cookie_path,
                sameSite: pluginOptions.cookie_same_site,
                expiresAfterDays: Number(pluginOptions.cookie_expiration),
            };
            const migrator = new CookieMigrator(cookieOptions);

            removeDuplicatedCookies(cookieOptions);
            migrator.migrateForward();

            if (pluginOptions.page_scripts) {
                rewriteScriptAttributes(document, pluginOptions.script_selector);
            }

            // every cookie write of the plugin is followed by adding the fields of 2.9 (rollback to 1.x)
            const keepLegacyFields = () => migrator.migrateBackward(CookieConsent.getCookie());
            self._plugin = Object.freeze({
                ...CookieConsent,
                setCookieData(props) {
                    const result = CookieConsent.setCookieData(props);
                    result && keepLegacyFields();
                    return result;
                },
                acceptCategory(categories, exclusions) {
                    CookieConsent.acceptCategory(categories, exclusions);
                    keepLegacyFields();
                },
                acceptService(services, category) {
                    CookieConsent.acceptService(services, category);
                    keepLegacyFields();
                },
            });
            self._pluginProxy = createPluginProxy(self._plugin, self);

            const consentManager = new ConsentManager(self._plugin, self._eventBus, self._config, self._storagePool, Object.values(self._eventTriggers), self._gtag, self._cookieTables, {
                servicesMode: self.servicesMode,
                acceptedServices: () => self.acceptedServices,
            });
            self._consentManager = consentManager;

            self._dictionary.addPlaceholder('user_identity', self.user.identity.toString());

            const cookiesApi = integrateCmpApi(self, self._config.cmpApiOptions);

            // services must be known before CookieConsent.run(): providers from the CMP are loaded first (at most 3 s)
            if (self.servicesMode && cookiesApi) {
                await Promise.race([
                    cookiesApi.prefetch(self.#guessLocale()),
                    new Promise(resolve => setTimeout(resolve, 3000)),
                ]);
            }

            const pluginConfig = buildPluginConfig({
                cmpServices: cookiesApi ? cookiesApi.services : {},
                config: self._config,
                storagePool: self._storagePool,
                locales: self._dictionary.locales,
                translation: (locale) => {
                    self._currentLocale = locale;

                    return self._dictionary.exportTranslation(
                        locale,
                        self._storagePool,
                        self._config,
                        self._cookieTables.exportFor(locale),
                        0 !== (Number(pluginOptions.revision) || 0),
                    );
                },
                callbacks: {
                    onFirstConsent: () => {
                        keepLegacyFields();
                        consentManager.onFirstConsent();
                    },
                    onConsent: () => {
                        keepLegacyFields();
                        consentManager.onConsent();
                    },
                    onChange: (params) => {
                        keepLegacyFields();
                        consentManager.onChange(params);
                    },
                    onModalReady: ({ modalName, modal }) => self.#onModalReady(modalName, modal),
                    onModalHide: ({ modalName }) => self.#onModalHide(modalName),
                    // v3 focuses the modal 200 ms after showing it; a hidden title (custom CSS) cannot take the focus
                    // 1.x (plugin 2.9) focuses the first button or link of an opened modal; v3 focuses the modal or its title
                    // 200 ms after showing it (a title hidden by custom CSS does not take the focus at all)
                    onModalShow: ({ modalName }) => setTimeout(() => {
                        const preferences = 'preferencesModal' === modalName;
                        const classes = document.documentElement.classList;
                        const modal = document.querySelector(preferences ? '#cc-main .pm' : '#cc-main .cm');
                        const active = document.activeElement;

                        // closed again within the timeout (e.g. Escape)
                        if (!classes.contains(preferences ? 'show--preferences' : 'show--consent')) {
                            return;
                        }

                        // 2.9: the consent modal shown under open settings (showSettings() at init, a mobile app webview)
                        // takes the focus from the settings, so the settings show no focus ring
                        if (!preferences && classes.contains('show--preferences')) {
                            modal.contains(active) || active.blur();
                        } else if (!modal.contains(active) || active === modal || active.matches('.pm__title')) {
                            focusFirst(modal);
                        }
                    }, 250),
                },
            });

            self.#listenToActions(document);

            await CookieConsent.run(pluginConfig);

            self._initialized = true;
            self._eventBus.dispatch(Events.ON_INIT);

            self.#showConsentModalIfNeeded();
        };

        const doInitSettingsModalTrigger = () => {
            if (!document || 'string' !== typeof self._config.settingsModalOptions.modal_trigger_selector || '' === self._config.settingsModalOptions.modal_trigger_selector) {
                return;
            }

            const modalTriggerFactory = new ModalTriggerFactory(document, self._dictionary);

            modalTriggerFactory.create(
                self._config.settingsModalOptions.modal_trigger_selector,
                self.currentLocale,
            );
        };

        let initPromise = null;
        const start = () => {
            null === initPromise && (initPromise = doInitCookieConsent());
            initPromise.then(doInitSettingsModalTrigger).catch(e => console.error('CookieConsentWrapper: initialization failed.', e));
        };

        if (!this._config.pluginOptions.init_after_dom_content_loaded && document.body) {
            initPromise = doInitCookieConsent();
        }

        if ('loading' !== document.readyState) {
            start();
        } else {
            document.addEventListener('DOMContentLoaded', start);
        }
    }

    get #readonlyDisabledStorages() {
        return this._storagePool.findVisibleReadonlyDisabled().map(storage => storage.name);
    }

    /**
     * The locale the plugin is going to choose (same rules as vanilla-cookieconsent: auto detection, then the default).
     */
    #guessLocale() {
        const locales = this._dictionary.locales;
        const options = this._config.pluginOptions;
        const available = (code) => {
            if (!code) {
                return null;
            }
            return locales.includes(code) ? code : (locales.includes(code.slice(0, 2)) ? code.slice(0, 2) : null);
        };

        if ('document' === options.auto_language) {
            const detected = available(document.documentElement.lang);
            if (detected) {
                return detected;
            }
        } else if ('browser' === options.auto_language) {
            for (const code of navigator.languages || [navigator.language]) {
                const detected = available(code);
                if (detected) {
                    return detected;
                }
            }
        }

        return locales.includes(options.current_lang) ? options.current_lang : (locales[0] || options.current_lang);
    }

    #isBot() {
        return this._config.pluginOptions.hide_from_bots
            && ((navigator.userAgent && BOT_PATTERN.test(navigator.userAgent)) || !!navigator.webdriver);
    }

    #isGpcOptOutActive() {
        return this._config.pluginOptions.respect_gpc && true === navigator.globalPrivacyControl;
    }

    #showConsentModalIfNeeded() {
        const options = this._config.pluginOptions;

        if (!options.autorun || this._plugin.validConsent() || this.#isBot() || this.#isGpcOptOutActive()) {
            return;
        }

        const delay = Number(options.delay) || 0;

        setTimeout(() => this._plugin.show(true), 0 < delay ? delay : 0);
    }

    #onModalReady(modalName, modal) {
        const legacy = this._config.pluginOptions.compat_legacy_ids;

        if ('consentModal' === modalName) {
            this.#arrangeConsentModal(modal);
            legacy && applyLegacyConsentModalIds(modal, this._config.consentModalOptions.secondary_button_role);

            return;
        }

        legacy && applyLegacyPreferencesModalIds(modal);
        // after the stylesheets are applied
        requestAnimationFrame(() => reorderByCssOrder(modal.querySelector('.pm__footer')));

        // "visible, readonly, disabled" storages: the toggle is shown but can never be enabled
        for (const name of this.#readonlyDisabledStorages) {
            const input = modal.querySelector(`input.section__toggle[value="${name}"]`);

            if (input) {
                input.checked = false;
                input.disabled = true;
                input.closest('.section__toggle-wrapper') && input.closest('.section__toggle-wrapper').classList.add('cc--readonly-disabled');
            }
        }
    }

    #arrangeConsentModal(modal) {
        placeSecondaryBeforeThird(modal, this._config.consentModalOptions.secondary_button_role);
        requestAnimationFrame(() => reorderByCssOrder(modal.querySelector('.cm__btns')));
    }

    /**
     * setLanguage() without "force" re-appends the buttons of an existing modal into their groups.
     */
    #rearrangeModals() {
        const consentModal = document.querySelector('#cc-main .cm');
        const preferencesModal = document.querySelector('#cc-main .pm');

        consentModal && this.#arrangeConsentModal(consentModal);
        preferencesModal && requestAnimationFrame(() => reorderByCssOrder(preferencesModal.querySelector('.pm__footer')));
    }

    #onModalHide(modalName) {
        if ('preferencesModal' !== modalName) {
            return;
        }

        if (!this._settingsModalClosable) {
            setTimeout(() => this._plugin.showPreferences(), 0);

            return;
        }

        // collapse the expanded sections, the next opening starts from a clean state
        setTimeout(() => {
            document.querySelectorAll('#cc-main .pm__section--expandable.is-expanded').forEach((section) => {
                section.classList.remove('is-expanded');
                const button = section.querySelector('[aria-expanded]');
                button && button.setAttribute('aria-expanded', 'false');
            });
        }, 250);
    }

    #listenToActions(document) {
        const self = this;
        // after the plugin effects (run after the next paint) and the consent:* events (setTimeout in ConsentManager)
        const dispatchSaved = () => requestAnimationFrame(() => setTimeout(() => setTimeout(() => {
            self._eventBus.dispatch(Events.ON_CONSENT_SAVED, self._consentManager.consent);
        }, 0), 0));

        // capture: runs before the handlers of the plugin
        document.addEventListener('click', (event) => {
            const button = event.target instanceof Element ? event.target.closest('#cc-main [data-role="all"]') : null;
            const disabled = self.#readonlyDisabledStorages;

            if (!button || 0 >= disabled.length) {
                return;
            }

            // "accept all" must not accept "visible, readonly, disabled" storages
            event.preventDefault();
            event.stopImmediatePropagation();

            const inPreferences = !!button.closest('.pm');

            self._plugin.acceptCategory('all', disabled);
            inPreferences && self._plugin.hidePreferences();
            self._plugin.hide();
            dispatchSaved();
        }, true);

        // bubble: the plugin has already saved the cookie
        document.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;

            if (target && target.closest('#cc-main [data-role="all"], #cc-main [data-role="necessary"], #cc-main [data-role="save"], #cc-main .cm__btn--close')) {
                dispatchSaved();
            }
        });

        // a settings modal that cannot be closed ignores Escape and clicks outside
        window.addEventListener('keydown', (event) => {
            if ('Escape' === event.key && !self._settingsModalClosable && document.documentElement.classList.contains('show--preferences')) {
                event.stopImmediatePropagation();
            }
        }, true);
        document.addEventListener('click', (event) => {
            if (!self._settingsModalClosable && event.target instanceof Element && event.target.closest('#cc-main .pm-overlay')) {
                event.stopImmediatePropagation();
            }
        }, true);
    }
}

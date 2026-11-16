import { AutoClearOptions } from './Config/AutoClearOptions.mjs';
import { Events } from './EventBus/Events.mjs';
import { eraseCookies } from './Utils/Cookies.mjs';

export class ConsentManager {
    /**
     * @param {object} plugin the module of vanilla-cookieconsent 3.x
     */
    constructor(plugin, eventBus, config, storagePool, eventTriggers, gtag, cookieTables, { servicesMode = false, acceptedServices = () => ({}) } = {}) {
        this._plugin = plugin;
        this._eventBus = eventBus;
        this._config = config;
        this._storagePool = storagePool;
        this._eventTriggers = eventTriggers;
        this._gtag = gtag;
        this._cookieTables = cookieTables;
        this._servicesMode = servicesMode;
        this._acceptedServices = acceptedServices;

        this.first_action_triggered = false;
    }

    onFirstConsent() {
        setTimeout(() => {
            const preferences = this._plugin.getUserPreferences();

            if ('all' !== preferences.acceptType && 0 < preferences.rejectedCategories.length) {
                this._autoClearCookies(preferences.rejectedCategories);
            }

            const consent = this._updateConsent(true);
            this.first_action_triggered = true;

            this._updateLastActionDate();
            this._eventBus.dispatch(Events.ON_CONSENT_FIRST_ACTION, consent);
            this._servicesMode && this._eventBus.dispatch(Events.ON_SERVICES_CHANGED, this._acceptedServices());
        }, 0);
    }

    onConsent() {
        setTimeout(() => {
            // a returning visitor: gtag "update" and the event triggers, but no consent event in the data layer,
            // its values are the same as the "default" pushed by the GTM template
            const consent = this.first_action_triggered ? this._getConsent() : this._updateConsent(false);
            this.first_action_triggered = false;

            this._showModalAgainIfAnyStorageIsExpired();
            this._eventBus.dispatch(Events.ON_CONSENT_ACCEPTED, consent);
        }, 0);
    }

    onChange({ changedCategories, changedServices = {} }) {
        setTimeout(() => {
            const consent = this._updateConsent(true);
            const denied = changedCategories.filter(category => category in consent && 'denied' === consent[category]);
            const servicesChanged = Object.values(changedServices).some(services => 0 < services.length);

            if (0 < denied.length) {
                this._autoClearCookies(denied);
            }

            if (this._servicesMode && servicesChanged) {
                this._autoClearServicesCookies();
            }

            this._updateLastActionDate();
            this._eventBus.dispatch(Events.ON_CONSENT_CHANGED, consent, changedCategories, changedServices);
            this._servicesMode && servicesChanged && this._eventBus.dispatch(Events.ON_SERVICES_CHANGED, this._acceptedServices());
        }, 0);
    }

    /**
     * "cookie_tables" auto clear for rejected services (providers) of accepted categories.
     */
    _autoClearServicesCookies() {
        const options = this._config.autoClearOptions;

        if (!options.enabled || AutoClearOptions.STRATEGY_COOKIE_TABLES !== options.strategy) {
            return;
        }

        const rejected = this._plugin.getUserPreferences().rejectedServices || {};
        const names = [];

        for (const category of Object.keys(rejected)) {
            for (const service of rejected[category]) {
                names.push(...this._cookieTables.cookieNamesOf(category, service));
            }
        }

        this._eraseCookies(names);
    }

    get consent() {
        return this._getConsent();
    }

    _getConsent() {
        const consent = {};

        for (const storage of this._storagePool.all()) {
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;

            consent[storage.name] = this._plugin.acceptedCategory(checkName) ? 'granted' : 'denied';
        }

        return consent;
    }

    _updateConsent(pushConsentEvent) {
        const consent = this._getConsent();
        const accepted = Object.keys(consent).filter(name => 'granted' === consent[name]);

        this._gtag('consent', 'update', consent);
        pushConsentEvent && this._pushConsentToDataLayer(consent);

        if (0 >= accepted.length) {
            return consent;
        }

        for (const key in this._eventTriggers) {
            if (this._eventTriggers[key].tryInvoke(this._gtag, accepted)) {
                delete this._eventTriggers[key];
            }
        }

        return consent;
    }

    _pushConsentToDataLayer(consent) {
        const options = this._config.dataLayerOptions;

        if (!options.push_consent) {
            return;
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: options.consent_event_name,
            consent_status: 'update',
            ...consent,
        });
    }

    /**
     * @param {string[]} rejectedCategories
     */
    _autoClearCookies(rejectedCategories) {
        const options = this._config.autoClearOptions;

        if (!options.enabled) {
            return;
        }

        const consentCookieName = this._config.pluginOptions.cookie_name;
        let cookiesForDeletion = [];

        if (AutoClearOptions.STRATEGY_COOKIE_TABLES === options.strategy) {
            // cookies listed in the cookie tables (CMP) of the rejected categories
            for (const category of rejectedCategories) {
                cookiesForDeletion.push(...this._cookieTables.cookieNamesOf(category));
            }
        } else {
            const cookieNames = options.cookie_names || [];

            for (const cookie of document.cookie.split(/;\s*/)) {
                const name = cookie.split('=')[0];

                if (!name || consentCookieName === name) {
                    continue;
                }

                if ((AutoClearOptions.STRATEGY_CLEAR_ALL_EXCEPT_DEFINED === options.strategy && -1 === cookieNames.indexOf(name))
                    || (AutoClearOptions.STRATEGY_CLEAR_DEFINED_ONLY === options.strategy && -1 !== cookieNames.indexOf(name))
                ) {
                    cookiesForDeletion.push(name);
                }
            }
        }

        this._eraseCookies(cookiesForDeletion);
    }

    _eraseCookies(names) {
        const consentCookieName = this._config.pluginOptions.cookie_name;
        const cookiesForDeletion = names.filter(name => name !== consentCookieName);

        if (0 >= cookiesForDeletion.length) {
            return;
        }

        const domain = this._plugin.getConfig('cookie').domain || window.location.hostname;
        const domains = [domain];

        if (0 === domain.lastIndexOf('www.', 0)) {
            domains.push(domain.substring(4));
        }

        eraseCookies(cookiesForDeletion, '/', domains);
    }

    _updateLastActionDate() {
        this._plugin.setCookieData({
            value: {
                last_action_date: (new Date()).toJSON(),
            },
            mode: 'update',
        });
    }

    _showModalAgainIfAnyStorageIsExpired() {
        let lastActionDate = (this._plugin.getCookie('data') || {}).last_action_date;

        lastActionDate = lastActionDate ? new Date(lastActionDate) : undefined;

        if (!lastActionDate || isNaN(lastActionDate.getTime())) {
            this._updateLastActionDate();

            return;
        }

        for (const storage of this._storagePool.all()) {
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;

            if (this._plugin.acceptedCategory(checkName)) {
                continue;
            }

            if ('number' !== typeof storage.showModalAgainExpiration || 0 >= storage.showModalAgainExpiration) {
                continue;
            }

            const expirationDate = new Date(lastActionDate.valueOf());
            expirationDate.setDate(expirationDate.getDate() + storage.showModalAgainExpiration);

            if (new Date() >= expirationDate) {
                this._plugin.showPreferences();
                this._updateLastActionDate();

                return;
            }
        }
    }
}

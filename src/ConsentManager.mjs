import { AutoClearOptions } from './Config/AutoClearOptions.mjs';
import { Events } from './EventBus/Events.mjs';

export class ConsentManager {
    constructor(cookieConsent, eventBus, config, storagePool, eventTriggers, gtag) {
        this._cookieConsent = cookieConsent;
        this._eventBus = eventBus;
        this._config = config;
        this._storagePool = storagePool;
        this._eventTriggers = eventTriggers;
        this._gtag = gtag;

        this.first_action_triggered = false;
    }

    onFirstAction(userPreferences) {
        setTimeout(() => {
            if ('all' !== userPreferences.accept_type && 0 < userPreferences.rejected_categories.length) {
                this._autoClearCookies();
            }

            const consent = this._updateConsent();
            this.first_action_triggered = true;

            this._updateLastActionDate();
            this._eventBus.dispatch(Events.ON_CONSENT_FIRST_ACTION, consent);
        }, 0);
    }

    onAccept() {
        setTimeout(() => {
            const consent = this.first_action_triggered ? this._getContent() : this._updateConsent();
            this.first_action_triggered = false;

            this._showModalAgainIfAnyStorageIsExpired();
            this._eventBus.dispatch(Events.ON_CONSENT_ACCEPTED, consent);
        }, 0);
    }

    onChange(cookie, changedCategories) {
        setTimeout(() => {
            const consent = this._updateConsent();

            if (0 < changedCategories.length) {
                for (let changedCategoryKey in changedCategories) {
                    if (!(changedCategories[changedCategoryKey] in consent)) {
                        continue;
                    }

                    if ('denied' === consent[changedCategories[changedCategoryKey]]) {
                        this._autoClearCookies();

                        break;
                    }
                }
            }

            this._updateLastActionDate();
            this._eventBus.dispatch(Events.ON_CONSENT_CHANGED, consent, changedCategories);
        }, 0);
    }

    _getContent() {
        const storageArr = this._storagePool.all();
        const consent = {};

        for (let storageKey in storageArr) {
            const storage = storageArr[storageKey];
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;

            consent[storage.name] = this._cookieConsent.allowedCategory(checkName) ? 'granted' : 'denied';
        }

        return consent;
    }

    _updateConsent() {
        const storageArr = this._storagePool.all();
        const consent = {};
        const accepted = [];

        for (let storageKey in storageArr) {
            const storage = storageArr[storageKey];
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;
            const allowed = this._cookieConsent.allowedCategory(checkName);

            consent[storage.name] = allowed ? 'granted' : 'denied';

            if (allowed) {
                accepted.push(storage.name);
            }
        }

        this._gtag('consent', 'update', consent);

        if (0 >= accepted.length) {
            return;
        }

        let eventTriggerKey;
        let eventTrigger;

        for (eventTriggerKey in this._eventTriggers) {
            eventTrigger = this._eventTriggers[eventTriggerKey];

            if (eventTrigger.tryInvoke(this._gtag, accepted)) {
                delete this._eventTriggers[eventTriggerKey];
            }
        }

        return consent;
    }

    _autoClearCookies() {
        if (!this._config.autoClearOptions.enabled) {
            return;
        }

        const strategy = this._config.autoClearOptions.strategy;

        // AutoClear based on cookie tables is managed by the original plugin
        if (AutoClearOptions.STRATEGY_COOKIE_TABLES === strategy) {
            return;
        }

        const allCookies = document.cookie.split(/;\s*/);
        const cookiesForDeletion = [];

        const cookieNames = this._config.autoClearOptions.cookie_names || [];

        for(let i = 0; i < allCookies.length; i++){
            const name = allCookies[i].split("=")[0];

            if (this._config.pluginOptions.cookie_name === name) {
                continue;
            }

            if ((AutoClearOptions.STRATEGY_CLEAR_ALL_EXCEPT_DEFINED === strategy && -1 === cookieNames.indexOf(name))
                || AutoClearOptions.STRATEGY_CLEAR_DEFINED_ONLY === strategy && -1 !== cookieNames.indexOf(name)
            ) {
                cookiesForDeletion.push(name);
            }
        }

        const domain = this._cookieConsent.getConfig('cookie_domain');
        const domains = [domain];

        if (0 === domain.lastIndexOf('www.', 0)) {
            domains.push(domain.substring(4));
        }

        if (0 < cookiesForDeletion.length) {
            for (let i = 0; i < domains.length; i++) {
                this._cookieConsent.eraseCookies(cookiesForDeletion, '/', domains[i]);
            }
        }
    }

    _updateLastActionDate() {
        this._cookieConsent.set('data', {
            value: {
                last_action_date: (new Date()).toJSON(),
            },
            mode: 'update',
        });
    }

    _showModalAgainIfAnyStorageIsExpired() {
        let lastActionDate = (this._cookieConsent.get('data') || {}).last_action_date;

        lastActionDate = lastActionDate ? new Date(lastActionDate) : undefined;

        if (!lastActionDate || 'Invalid Date' === lastActionDate || isNaN(lastActionDate)) {
            this._updateLastActionDate();

            return;
        }

        const storageArr = this._storagePool.all();

        for (let storageKey in storageArr) {
            const storage = storageArr[storageKey];
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;

            if (this._cookieConsent.allowedCategory(checkName)) {
                continue;
            }

            if ('number' !== typeof storage.showModalAgainExpiration || 0 >= storage.showModalAgainExpiration) {
                continue;
            }

            const now = new Date();
            const expirationDate = new Date(lastActionDate.valueOf());

            expirationDate.setDate(expirationDate.getDate() + storage.showModalAgainExpiration);

            if (now >= expirationDate) {
                this._cookieConsent.showSettings(0);
                this._updateLastActionDate();

                return;
            }
        }
    }
}

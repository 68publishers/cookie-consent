'use strict';

const AutoClearOptions = require('./Config/AutoClearOptions');

class ConsentManager {
    constructor(cookieConsent, config, storagePool, eventTriggers, gtag) {
        this._cookieConsent = cookieConsent;
        this._config = config;
        this._storagePool = storagePool;
        this._eventTriggers = eventTriggers;
        this._gtag = gtag;
    }

    onFirstAction(userPreferences) {
        if ('all' !== userPreferences.accept_type && 0 < userPreferences.rejected_categories.length) {
            this._autoClearCookies();
        }

        this._updateLastActionDate();
    }

    onAccept() {
        this._updateConsent();
        this._showModalAgainIfAnyStorageIsExpired();
    }

    onChange(cookie, changedCategories) {
        const consent = this._updateConsent();

        if (0 < changedCategories.length) {
            for (let changedCategoryKey in changedCategories) {
                if (!changedCategories.hasOwnProperty(changedCategoryKey) || !consent.hasOwnProperty(changedCategories[changedCategoryKey])) {
                    continue;
                }

                if ('denied' === consent[changedCategories[changedCategoryKey]]) {
                    this._autoClearCookies();

                    break;
                }
            }
        }

        this._updateLastActionDate();
    }

    _updateConsent() {
        const storageArr = this._storagePool.all();
        const consent = {};
        const accepted = [];

        for (let storageKey in storageArr) {
            if (!storageArr.hasOwnProperty(storageKey)) {
                continue;
            }

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
            if (!this._eventTriggers.hasOwnProperty(eventTriggerKey)) {
                continue;
            }

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

        const allCookies = document.cookie.split(/;\s*/);
        const cookiesForDeletion = [];
        const strategy = this._config.autoClearOptions.strategy;

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
            mode: 'update'
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
            if (!storageArr.hasOwnProperty(storageKey)) {
                continue;
            }

            const storage = storageArr[storageKey];
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;

            if (this._cookieConsent.allowedCategory(checkName)) {
                continue;
            }

            if ('number' !== typeof storage.showModalAgainExpiration) {
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

module.exports = ConsentManager;

'use strict';

class ConsentManager {
    constructor(cookieConsent, storagePool, gtag) {
        this._cookieConsent = cookieConsent;
        this._storagePool = storagePool;
        this._gtag = gtag;
    }

    onAccept() {
        this._updateConsent();
    }

    onChange() {
        this._updateConsent();
    }

    _updateConsent() {
        const storageArr = this._storagePool.all();
        const consent = {};
        const eventTriggers = [];

        for (let storageKey in storageArr) {
            if (!storageArr.hasOwnProperty(storageKey)) {
                continue;
            }

            const storage = storageArr[storageKey];
            const checkName = null !== storage.syncConsentWith ? storage.syncConsentWith : storage.name;

            const permission = this._cookieConsent.allowedCategory(checkName) ? 'granted' : 'denied';

            consent[storage.name] = permission;

            if ('granted' === permission && null !== storage.eventTrigger && !storage.eventTrigger.invoked) {
                eventTriggers.push(storage.eventTrigger);
            }
        }

        this._gtag('consent', 'update', consent);

        const invokedNames = [];

        for (let eventTriggerKey in eventTriggers) {
            if (!eventTriggers.hasOwnProperty(eventTriggerKey)) {
                continue;
            }

            const eventTrigger = eventTriggers[eventTriggerKey];

            if (-1 === invokedNames.indexOf(eventTrigger.name)) {
                this._gtag('event', eventTrigger.name, {});
                invokedNames.push(eventTrigger.name);
            }

            eventTrigger.invoked = true;
        }
    }
}

module.exports = ConsentManager;

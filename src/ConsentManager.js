'use strict';

class ConsentManager {
    constructor(cookieConsent, storagePool, eventTriggers, gtag) {
        this._cookieConsent = cookieConsent;
        this._storagePool = storagePool;
        this._eventTriggers = eventTriggers;
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
    }
}

module.exports = ConsentManager;

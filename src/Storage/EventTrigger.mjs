export class EventTrigger {
    constructor(name, storageNames, type = EventTrigger.TYPE_OR) {
        if (!Array.isArray(storageNames)) {
            if ('string' !== typeof storageNames) {
                throw new TypeError('Invalid argument $storageNames passed, the argument must be string or array of strings.');
            }

            storageNames = [storageNames];
        }

        if (0 >= storageNames.length) {
            throw new Error('Storage names can\'t be an empty array.');
        }

        if (-1 === [EventTrigger.TYPE_OR, EventTrigger.TYPE_AND].indexOf(type)) {
            throw new Error(`Invalid event trigger type ${type}.`);
        }

        this._name = name;
        this._type = type;
        this._storageNames = storageNames;
    }

    static get TYPE_OR() {
        return 'or';
    };

    static get TYPE_AND() {
        return 'and';
    };

    tryInvoke(gtag, acceptedStorageNames) {
        let storageKey;
        let invoke = false;

        for (storageKey in this._storageNames) {
            invoke = -1 !== acceptedStorageNames.indexOf(this._storageNames[storageKey]);

            if ((invoke && EventTrigger.TYPE_OR === this._type) || (!invoke && EventTrigger.TYPE_AND === this._type)) {
                break;
            }
        }

        if (invoke) {
            gtag('event', this._name, {});
        }

        return invoke;
    }
}

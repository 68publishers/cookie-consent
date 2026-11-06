export class Events {
    static get ON_INIT() {
        return 'init';
    };

    static get ON_CONSENT_FIRST_ACTION() {
        return 'consent:first-action';
    };

    static get ON_CONSENT_ACCEPTED() {
        return 'consent:accepted';
    };

    static get ON_CONSENT_CHANGED() {
        return 'consent:changed';
    };

    static get ON_LOCALE_CHANGE() {
        return 'locale:change';
    };

    static get ON_CONSENT_SAVED() {
        return 'consent:saved';
    };

    static get ON_SERVICES_CHANGED() {
        return 'services:changed';
    };

    static get ON_CMP_CONSENT_NOT_SENT() {
        return 'cmp:consent-not-sent';
    };
}

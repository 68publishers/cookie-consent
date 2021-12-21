'use strict';

class SettingsModalOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.layout = 'box';
        this.position = undefined;
        this.transition = 'zoom';
    }

    exportCookieConsentConfig() {
        return {...this};
    }
}

module.exports = SettingsModalOptions;

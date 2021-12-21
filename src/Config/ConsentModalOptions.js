'use strict';

class ConsentModalOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.layout = 'box';
        this.position = 'bottom center';
        this.transition = 'zoom';
        this.primary_button_role = 'accept_all';
        this.secondary_button_role = 'settings';
        this.swap_buttons = false;
    }

    exportCookieConsentConfig() {
        return {
            layout: this.layout,
            position: this.position,
            transition: this.transition,
            swap_buttons: this.swap_buttons
        };
    }
}

module.exports = ConsentModalOptions;

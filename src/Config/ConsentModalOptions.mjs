import { AbstractOptions } from './AbstractOptions.mjs';

export class ConsentModalOptions extends AbstractOptions {
    constructor() {
        super();

        this.layout = 'box';
        this.position = 'bottom center';
        this.transition = 'zoom';
        this.primary_button_role = 'accept_all';
        this.secondary_button_role = 'settings';
        this.swap_buttons = false;

        // Custom implementation. Adds the third button to the consent modal. If the secondary button's role is "Open settings" the third button's role is "Accept necessary" and vice versa.
        this.show_third_button = false;
    }

    exportCookieConsentConfig() {
        return {
            layout: this.layout,
            position: this.position,
            transition: this.transition,
            swap_buttons: this.swap_buttons,
        };
    }
}

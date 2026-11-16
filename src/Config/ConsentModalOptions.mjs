import { AbstractOptions } from './AbstractOptions.mjs';

export class ConsentModalOptions extends AbstractOptions {
    constructor() {
        super();

        this.layout = 'box';
        this.position = 'bottom center';
        this.transition = undefined; // deprecated since 2.0
        this.primary_button_role = 'accept_all';
        this.secondary_button_role = 'settings';
        this.swap_buttons = false;
        this.equal_weight_buttons = false;

        // Adds the third button. If the secondary button's role is "Open settings" the third button's role is "Accept necessary" and vice versa.
        this.show_third_button = false;
    }

    merge(options) {
        if (options && 'transition' in options && undefined !== options.transition) {
            console.warn('CookieConsentWrapper: the option "transition" is deprecated and ignored since 2.0, use the CSS variable --cc-modal-transition-duration.');
        }

        super.merge(options);
    }
}

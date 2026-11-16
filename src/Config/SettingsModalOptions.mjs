import { AbstractOptions } from './AbstractOptions.mjs';

export class SettingsModalOptions extends AbstractOptions {
    constructor() {
        super();

        this.layout = 'box';
        this.position = undefined;
        this.transition = undefined; // deprecated since 2.0
        this.modal_trigger_selector = null;
        // services (providers) inside categories instead of cookie tables only: "categories" | "services"
        this.preferences_mode = 'categories';
    }

    merge(options) {
        if (options && 'transition' in options && undefined !== options.transition) {
            console.warn('CookieConsentWrapper: the option "transition" is deprecated and ignored since 2.0, use the CSS variable --cc-modal-transition-duration.');
        }

        super.merge(options);
    }
}

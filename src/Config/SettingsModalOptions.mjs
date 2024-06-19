import { AbstractOptions } from './AbstractOptions.mjs';

export class SettingsModalOptions extends AbstractOptions {
    constructor() {
        super();

        this.layout = 'box';
        this.position = undefined;
        this.transition = 'zoom';
        this.modal_trigger_selector = null;
    }

    exportCookieConsentConfig() {
        return {
            layout: this.layout,
            position: this.position,
            transition: this.transition,
        };
    }
}

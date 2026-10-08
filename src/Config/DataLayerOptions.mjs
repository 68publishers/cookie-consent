import { AbstractOptions } from './AbstractOptions.mjs';

export class DataLayerOptions extends AbstractOptions {
    constructor() {
        super();

        this.push_consent = false;
        this.consent_event_name = '68publishers_consent';
    }
}

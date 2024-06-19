import { StorageConfig } from './StorageConfig.mjs';

export class Storage {
    constructor(config) {
        this._config = new StorageConfig(config);
    }

    get config() {
        return {...this._config};
    }

    get name() {
        return this._config.name;
    }

    get enabledByDefault() {
        return this._config.enabled_by_default;
    }

    get displayInWidget() {
        return this._config.display_in_widget;
    }

    get readonly() {
        return this._config.readonly;
    }

    get syncConsentWith() {
        return this._config.sync_consent_with;
    }

    get showModalAgainExpiration() {
        return this._config.show_modal_again_expiration;
    }
}

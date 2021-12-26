'use strict';

const StorageConfig = require('./StorageConfig');
const EventTrigger = require('./EventTrigger');

class Storage {
    constructor(config) {
        this._config = new StorageConfig(config);
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
}

module.exports = Storage;

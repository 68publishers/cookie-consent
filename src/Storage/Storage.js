'use strict';

const StorageConfig = require('./StorageConfig');
const EventTrigger = require('./EventTrigger');

class Storage {
    constructor(config) {
        this._config = new StorageConfig(config);
        this._eventTrigger = 'string' === typeof this._config.event_trigger ? new EventTrigger(this._config.event_trigger, this._config.event_trigger_invoked) : null;
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

    get eventTrigger() {
        return this._eventTrigger;
    }
}

module.exports = Storage;

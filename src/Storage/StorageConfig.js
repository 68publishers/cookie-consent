'use strict';

class StorageConfig {
    constructor(config) {
        if (!config.hasOwnProperty('name') || '' === config.name) {
            throw new Error('Missing required property "name".')
        }

        this.name = config.name;
        this.enabled_by_default = config.enabled_by_default || false;
        this.display_in_widget = config.display_in_widget || false;
        this.readonly = config.readonly || false;
        this.sync_consent_with = config.sync_consent_with || null;
        this.event_trigger = config.event_trigger || null;
        this.event_trigger_invoked = config.event_trigger_invoked || false;
    }
}

module.exports = StorageConfig;

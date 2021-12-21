'use strict';

const PluginOptions = require('./PluginOptions');
const ConsentModalOptions = require('./ConsentModalOptions');
const SettingsModalOptions = require('./SettingsModalOptions');
const UiOptions = require('./UiOptions');

class Config {
    constructor() {
        this.pluginOptions = new PluginOptions();
        this.consentModalOptions = new ConsentModalOptions();
        this.settingsModalOptions = new SettingsModalOptions();
        this.uiOptions = new UiOptions();
    }

    exportCookieConsentConfig() {
        const config = this.pluginOptions.exportCookieConsentConfig();

        config['gui_options'] = {
            consent_modal: this.consentModalOptions.exportCookieConsentConfig(),
            settings_modal: this.settingsModalOptions.exportCookieConsentConfig()
        };

        return config;
    }
}

module.exports = Config;

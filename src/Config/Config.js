'use strict';

const PluginOptions = require('./PluginOptions');
const ConsentModalOptions = require('./ConsentModalOptions');
const SettingsModalOptions = require('./SettingsModalOptions');
const UiOptions = require('./UiOptions');
const AutoClearOptions = require('./AutoClearOptions');
const CmpApiOptions = require('./CmpApiOptions');

class Config {
    constructor() {
        this.pluginOptions = new PluginOptions();
        this.consentModalOptions = new ConsentModalOptions();
        this.settingsModalOptions = new SettingsModalOptions();
        this.uiOptions = new UiOptions();
        this.autoClearOptions = new AutoClearOptions();
        this.cmpApiOptions = new CmpApiOptions();
    }

    exportCookieConsentConfig() {
        const config = this.pluginOptions.exportCookieConsentConfig();

        config['gui_options'] = {
            consent_modal: this.consentModalOptions.exportCookieConsentConfig(),
            settings_modal: this.settingsModalOptions.exportCookieConsentConfig()
        };

        if (this.autoClearOptions.enabled && AutoClearOptions.STRATEGY_COOKIE_TABLES === this.autoClearOptions.strategy) {
            config['autoclear_cookies'] = true;
        }

        return config;
    }
}

module.exports = Config;

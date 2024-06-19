import { PluginOptions } from './PluginOptions.mjs';
import { ConsentModalOptions } from './ConsentModalOptions.mjs';
import { SettingsModalOptions } from './SettingsModalOptions.mjs';
import { UiOptions } from './UiOptions.mjs';
import { AutoClearOptions } from './AutoClearOptions.mjs';
import { CmpApiOptions } from './CmpApiOptions.mjs';

export class Config {
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
            settings_modal: this.settingsModalOptions.exportCookieConsentConfig(),
        };

        if (this.autoClearOptions.enabled && AutoClearOptions.STRATEGY_COOKIE_TABLES === this.autoClearOptions.strategy) {
            config['autoclear_cookies'] = true;
        }

        return config;
    }
}

import { PluginOptions } from './PluginOptions.mjs';
import { ConsentModalOptions } from './ConsentModalOptions.mjs';
import { SettingsModalOptions } from './SettingsModalOptions.mjs';
import { UiOptions } from './UiOptions.mjs';
import { AutoClearOptions } from './AutoClearOptions.mjs';
import { CmpApiOptions } from './CmpApiOptions.mjs';

export class Config {
    constructor(scriptBasePath) {
        this.pluginOptions = new PluginOptions();
        this.consentModalOptions = new ConsentModalOptions();
        this.settingsModalOptions = new SettingsModalOptions();
        this.uiOptions = new UiOptions(scriptBasePath);
        this.autoClearOptions = new AutoClearOptions();
        this.cmpApiOptions = new CmpApiOptions();
    }

    exportCookieConsentConfig() {
        const config = this.pluginOptions.exportCookieConsentConfig();

        config['gui_options'] = {
            consent_modal: this.consentModalOptions.exportCookieConsentConfig(),
            settings_modal: this.settingsModalOptions.exportCookieConsentConfig(),
        };

        config['autoclear_cookies'] = this.autoClearOptions.enabled && AutoClearOptions.STRATEGY_COOKIE_TABLES === this.autoClearOptions.strategy;

        return config;
    }
}

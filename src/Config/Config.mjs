import { PluginOptions } from './PluginOptions.mjs';
import { ConsentModalOptions } from './ConsentModalOptions.mjs';
import { SettingsModalOptions } from './SettingsModalOptions.mjs';
import { UiOptions } from './UiOptions.mjs';
import { AutoClearOptions } from './AutoClearOptions.mjs';
import { CmpApiOptions } from './CmpApiOptions.mjs';
import { DataLayerOptions } from './DataLayerOptions.mjs';

export class Config {
    constructor(scriptBasePath) {
        this.pluginOptions = new PluginOptions();
        this.consentModalOptions = new ConsentModalOptions();
        this.settingsModalOptions = new SettingsModalOptions();
        this.uiOptions = new UiOptions(scriptBasePath);
        this.autoClearOptions = new AutoClearOptions();
        this.cmpApiOptions = new CmpApiOptions();
        this.dataLayerOptions = new DataLayerOptions();
    }
}

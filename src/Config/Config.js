'use strict';

const PluginOptions = require('./PluginOptions');
const ModalOptions = require('./ModalOptions');
const UiOptions = require('./UiOptions');

class Config {
    constructor() {
        this.pluginOptions = new PluginOptions();
        this.consentModalOptions = new ModalOptions();
        this.settingsModalOptions = new ModalOptions();
        this.uiOptions = new UiOptions();

        this.consentModalOptions.merge({
            layout: 'box',
            position: 'bottom center'
        });

        this.settingsModalOptions.merge({
            layout: 'box'
        });
    }

    buildCookieConsentConfig() {
        return {
            ...this.pluginOptions,
            'gui_options': {
                'consent_modal': {
                    ...this.consentModalOptions
                },
                'settings_modal': {
                    ...this.settingsModalOptions
                }
            }
        }
    }
}

module.exports = Config;

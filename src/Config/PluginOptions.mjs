import { AbstractOptions } from './AbstractOptions.mjs';

export class PluginOptions extends AbstractOptions {
    constructor() {
        super();

        // options managed by the GTM template:
        this.autorun = true;
        this.delay = 0;
        this.hide_from_bots = false;
        this.cookie_name = 'cc-settings';
        this.cookie_expiration = 182; // 6 months in days
        this.force_consent = false;
        this.revision = 0;
        this.current_lang = 'en';
        this.auto_language = 'document';
        this.page_scripts = false;
        this.script_selector = 'data-cookiecategory';
        this.cookie_domain = window.location.hostname;
        this.use_rfc_cookie = false;

        // options managed by the GTM template without association with the original plugin:
        this.init_after_dom_content_loaded = false;

        // another options for the original plugin
        this.cookie_path = '/';
        this.cookie_same_site = 'Lax';
        this.remove_cookie_tables = false;

        // unsupported options (custom reimplementation)
        //this.theme_css = ''; useless for our use case
        //this.autoclear_cookies = false; implemented in the AutoClearOptions
    }

    exportCookieConsentConfig() {
        const config = {...this};
        delete config.init_after_dom_content_loaded;

        const configDomain = 0 === config.cookie_domain.indexOf('.') ? config.cookie_domain.substring(1) : config.cookie_domain;
        const currentDomain = window.location.hostname;

        if (-1 === currentDomain.indexOf(configDomain, currentDomain.length - configDomain.length)) {
            config.cookie_domain = currentDomain;
        }

        return config;
    }
}

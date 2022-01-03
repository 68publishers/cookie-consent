'use strict';

class PluginOptions extends require('./AbstractOptions') {
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

        // another options for the original plugin
        this.cookie_path = '/';
        this.cookie_domain = window.location.hostname;
        this.cookie_same_site = 'Lax';
        this.use_rfc_cookie = false;
        this.remove_cookie_tables = false;

        // unsupported options (custom reimplementation)
        //this.theme_css = ''; useless for our use case
        //this.autoclear_cookies = false; implemented in the AutoClearOptions
    }

    exportCookieConsentConfig() {
        return {...this};
    }
}

module.exports = PluginOptions;

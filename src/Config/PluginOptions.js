'use strict';

class PluginOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.autorun = true;
        this.delay = 0;

        this.cookie_name = 'cc-settings';
        this.cookie_expiration = 182; // 6 months in days
        this.cookie_path = '/';
        this.cookie_domain = window.location.hostname;
        this.cookie_same_site = 'Lax';
        this.use_rfc_cookie = false;

        //this.theme_css = ''; useless of our use case

        this.force_consent = false;
        this.revision = 0;

        this.current_lang = 'en';
        this.auto_language = 'document';
        this.autoclear_cookies = false;
        this.page_scripts = false;
        this.script_selector = 'data-cookiecategory';
        this.remove_cookie_tables = false;
        this.hide_from_bots = false;
    }
}

module.exports = PluginOptions;

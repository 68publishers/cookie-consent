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

        // options managed by the GTM template without association with the plugin:
        this.init_after_dom_content_loaded = false;

        // other options
        this.cookie_path = '/';
        this.cookie_same_site = 'Lax';
        this.remove_cookie_tables = false;
        this.lazy_html_generation = true;
        // ids and classes of the plugin 2.9 markup for GTM triggers and tags of 1.x clients
        this.compat_legacy_ids = true;

        // deprecated since 2.0, accepted and ignored
        this.use_rfc_cookie = undefined;
    }

    merge(options) {
        if (options && 'use_rfc_cookie' in options && undefined !== options.use_rfc_cookie) {
            console.warn('CookieConsentWrapper: the option "use_rfc_cookie" is deprecated and ignored, the cookie value is always URI encoded since 2.0.');
        }

        super.merge(options);
    }

    /**
     * The configured domain if the current host belongs to it, the current host otherwise.
     */
    resolveCookieDomain() {
        const domain = this.cookie_domain || window.location.hostname;
        const configDomain = 0 === domain.indexOf('.') ? domain.substring(1) : domain;
        const currentDomain = window.location.hostname;

        if (-1 === currentDomain.indexOf(configDomain, currentDomain.length - configDomain.length)) {
            return currentDomain;
        }

        return domain;
    }
}

# Migration from 1.x to 2.0

Version 2.0 is built on [vanilla-cookieconsent 3.2](https://cookieconsent.orestbida.com) instead of the plugin 2.9.
The configuration (`cc_wrapper_config`, the GTM template fields), events, translations and the consent cookie stay compatible:
a visitor with a valid consent does not see the widget again after the upgrade, and the same holds after a rollback to 1.6.x.
The only change a client has to make is custom CSS targeting the markup of 1.x.

## Requirements

- **HTTPS.** The checksum of the configuration sent to the CMP is computed by WebCrypto, which browsers provide in a secure context only. On `http://` pages the widget works, but the consent is not sent to the CMP and a warning is logged.
- **Browsers supporting ES2020**: Chrome 80+, Firefox 74+, Safari 13.1+, Edge 80+. Internet Explorer is not supported (neither by the plugin 3.x).

## Steps in GTM

1. Import `gtm_template.tpl` of 2.0 into the existing template (Templates → the template → Import). Existing tags keep their configuration.
2. Review the new permission of the template: read access to `navigator.globalPrivacyControl` (used by the new field `Respect Global Privacy Control`).
3. Set `Package version` to `2.0.0` (or keep `latest`).
4. Rewrite custom CSS (the field `Internal stylesheet`, external stylesheets, Custom HTML tags), see [CSS selectors](#css-selectors).
5. Optionally use the new fields `Preferences layout` (services of cookie providers) and `Respect Global Privacy Control`.
6. Check the browser console for deprecation warnings of Custom HTML tags (`unwrap().showSettings()` etc.) and update them when convenient.

## Compatibility

| Combination | Works | Note |
|---|---|---|
| Template 1.6 + package 2.0 | yes | the services layout and GPC cannot be enabled; the template sends `transition` and `use_rfc_cookie`, the package logs them as deprecated |
| Template 2.0 + package 1.6.x | yes | 1.6.x ignores the new fields |
| Package 2.0 + CMP without services (≤ 1.2.x) | yes | the CMP ignores `services`, consents per category are stored as before |
| Package 1.6.x + CMP with services (1.3+) | yes | consents without services are stored with an empty `services` object |
| Consents stored before the CMP upgrade | yes | read with no services, no data migration needed |
| Consent settings with `schemaVersion: 2` + CMP without services | yes | the CMP stores the settings as JSON without a schema |
| Cookie of 1.x + package 2.0 | yes | converted before the plugin starts, the widget is not shown again (unless the revision changed) |
| Cookie of 2.0 + package 1.6.x (rollback) | yes | 2.0 writes the fields of 1.x into the cookie too, 1.6.x accepts the consent |
| Custom CSS targeting `#cm`, `#s-bl`, `.c-bn`, ... | no | the only required change, see [CSS selectors](#css-selectors) |
| Custom translations (key, value) in GTM | yes | the keys and their content are unchanged; new optional keys `settings_modal_service_counter_label` and `consent_modal_close_btn_label` |
| Custom HTML tags using `unwrap()` | yes | the 2.9 methods are kept with a deprecation warning, see below |
| GTM click triggers on `{{Click ID}}` of the buttons | yes | the 1.x ids are kept (`compat_legacy_ids`) |

## Removed and changed options

| Option | 2.0 |
|---|---|
| `consent_modal_options.transition`, `settings_modal_options.transition` (template field `Transition`) | removed, logged as deprecated; animations are set by the CSS variable `--cc-modal-transition-duration` |
| `plugin_options.use_rfc_cookie` (template field `Use RFC cookie`) | removed, logged as deprecated; the cookie value is always URI encoded |
| `plugin_options.script_selector` | works now (in 1.x the plugin ignored it and only `data-cookiecategory` worked) |
| `plugin_options.hide_from_bots` | also browsers controlled by automation (`navigator.webdriver`) are treated as bots |
| `locales` | only the current locale is loaded before the widget is shown, the others on `changeLocale()`; the GTM template injects only the locale of the field `Current locale` when it is set |
| `CookieConsentWrapper.configurationExport` | a Promise of `{configuration, checksum}` instead of the object |
| `auto_language: 'browser'` | the first available language of `navigator.languages` is used, not only `navigator.language` |

New options: `settings_modal_options.preferences_mode`, `storage_pool[].services`, `consent_modal_options.equal_weight_buttons`, `plugin_options.respect_gpc`, `plugin_options.lazy_html_generation`, `plugin_options.compat_legacy_ids`. See [Configuration without GTM](../README.md#configuration-without-gtm).

## Data layer

A returning visitor gets the event of the option `Push consent to the data layer as an event` once per page (`consent_status: 'default'` from the template). 1.6.0 pushed the same values again with `update` when the widget was loaded, so tags fired by the Custom Event trigger ran twice. The `gtag('consent', 'update', ...)` command is still sent.

## Events

- `consent:changed` gets the changed services as the third argument.
- New `consent:saved`: after every action of the user in the widget, also without a change, when the cookie is saved.
- New `services:changed`: the accepted services in the services layout.

## The consent cookie

The cookie has the structure of the plugin 3.x (`categories`, `services`, `consentId`, `consentTimestamp`, `lastConsentTimestamp`, `expirationTime`, `revision`, `data`) and also the fields read by 1.x (`level`, `consent_uuid`, `consent_date`, `last_consent_update`, `rfc_cookie`).
A cookie of 1.x is converted when the widget starts: the consent, its date, its id and `data.last_action_date` are kept.
A copy of the consent cookie on another domain than `cookie_domain` (e.g. `www.example.com` next to `.example.com`) is removed before the plugin reads the cookie; custom tags doing this are not needed any more.

## Custom HTML tags

`CookieConsentWrapper.unwrap()` returns the API of the plugin 3.x with the methods of the plugin 2.9 kept for one major version (each logs a deprecation warning once):
`show(delay)`, `showSettings(delay)`, `hideSettings()`, `allowedCategory()`, `accept()`, `updateLanguage()`, `getUserPreferences()` (with the snake_case keys), `set('data', ...)`, `get('data')`, `eraseCookies()` and `getConfig()` with the keys of 2.9 (`cookie_name`, `current_lang`, `cookie_domain`, ...).
Assigning a function to `unwrap().hideSettings` keeps the settings modal open, the same as `CookieConsentWrapper.setSettingsModalClosable(false)`.

The tags below work in 2.0 unchanged, only their CSS has to be updated. Their 2.0 versions:

Removing a duplicated consent cookie (not needed in 2.0, the widget does it):

```html
<!-- remove the tag -->
```

Consent settings inside a mobile app (webview):

```html
<script>
    CookieConsentWrapper.on('init', function () {
        CookieConsentWrapper.setSettingsModalClosable(false);
        CookieConsentWrapper.unwrap().showPreferences();
    });

    CookieConsentWrapper.on('consent:saved', function () {
        var params = new URLSearchParams(window.location.search);
        var message = { consent: CookieConsentWrapper.consentCookieData, source: params.get('source') || 'default' };

        if ('ReactNativeWebView' in window) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
    });
</script>

<style>
    #cc-main .cm { display: none !important; }
    #cc-main .pm { box-shadow: none !important; top: 0 !important; bottom: 0 !important; max-height: 100vh !important; }
</style>
```

Hiding the widget in a webview:

```html
<style>
    #cc-main { display: none !important; }
</style>
```

## Global Privacy Control

With `Respect Global Privacy Control` (`plugin_options.respect_gpc`) and the browser signal `navigator.globalPrivacyControl`, a visitor who has not decided yet gets `denied` for storages enabled by default (except readonly ones) in the default consent of the template and in the widget, and the consent modal is not shown automatically. A saved choice always wins.
The template needs the new permission to read `navigator.globalPrivacyControl`.

## CSS selectors

The markup of the widget changed. Custom CSS targeting the markup of 1.x must be rewritten; this is the only change a client has to make.
Prefer the CSS variables of the plugin (`--cc-*`, see [UI customization](https://cookieconsent.orestbida.com/advanced/ui-customization.html)) to selectors where possible.

With the option `compat_legacy_ids` (enabled by default in 2.x) the buttons keep their 1.x ids, so GTM click triggers based on `{{Click ID}}` keep working.
These ids are marked "kept" below; styling them still works but new CSS should use the 3.x selectors.

| 1.x selector | 2.0 selector | Note |
|---|---|---|
| `#cc--main`, `#cc_div`, `.cc_div` | `#cc-main` | root of the widget |
| `#cm` | `#cc-main .cm` | consent modal |
| `#c-inr`, `#c-inr-i` | `#cc-main .cm__body` | body of the consent modal |
| `#c-ttl` | `#cc-main .cm__title` | |
| `#c-txt` | `#cc-main .cm__desc` | |
| `#c-bns` | `#cc-main .cm__btns` | kept as id |
| `#c-p-bn` | `#cc-main .cm__btn[data-role="all"]` | kept as id |
| `#c-s-bn` | the button of the secondary role: `[data-role="show"]` or `[data-role="necessary"]` | kept as id |
| `#c-t-bn` | the button of the third role | kept as id |
| `.c-bn` | `#cc-main .cm__btn`, `#cc-main .pm__btn` | kept as class |
| `#cm-ov` | `.disable--interaction #cc-main .cm-wrapper::before` | overlay of a required consent |
| `#cs-ov` | `#cc-main .pm-overlay` | overlay of the settings |
| `#cs`, `#s-cnt` | `#cc-main .pm-wrapper` | container of the settings modal |
| `#s-inr`, `#c-s-in` | `#cc-main .pm` | settings modal |
| `#s-hdr` | `#cc-main .pm__header` | |
| `#s-c-bnc`, `#s-c-bn` | `#cc-main .pm__close-btn` | `#s-c-bn` kept as id |
| `.cc-back-button` | `#cc-main .cc-back-button` | the back button of custom translations stays in the translation HTML; the 3.x close button is `#cc-main .pm__close-btn` |
| `#s-bl` | `#cc-main .pm__body` | |
| `.c-bl` | `#cc-main .pm__section` | |
| `.b-bn`, `.b-tl` | `#cc-main .pm__section-title` | |
| `.b-ex`, `.exp` | `#cc-main .pm__section--expandable` | |
| `.act` | `#cc-main .pm__section--expandable.is-expanded` | expanded section |
| `.b-acc` | `#cc-main .pm__section-desc-wrapper` | |
| `.p` | `#cc-main .pm__section-desc` | also a class used in custom translations |
| `.title` | `#cc-main .pm__section-title` | |
| `.b-tg` | `#cc-main .section__toggle-wrapper` | |
| `.c-tgl` | `#cc-main input.section__toggle` | kept as class on category toggles |
| `.c-tg`, `.t-lb` | `#cc-main .toggle__icon`, `#cc-main .toggle__label` | |
| `.on-i`, `.off-i` | `#cc-main .toggle__icon-on`, `#cc-main .toggle__icon-off` | |
| `.c-ro` | `#cc-main .section__toggle:disabled ~ .toggle__icon` | readonly toggle; "visible, readonly, disabled" storages have `.cc--readonly-disabled` on the wrapper |
| `#s-bns`, `.bns-t` | `#cc-main .pm__footer` | `#s-bns` kept as id |
| `#s-all-bn` | `#cc-main .pm__btn[data-role="all"]` | kept as id |
| `#s-rall-bn` | `#cc-main .pm__btn[data-role="necessary"]` | kept as id |
| `#s-sv-bn` | `#cc-main .pm__btn[data-role="save"]` | kept as id |
| `.cc-link` | `#cc-main a` | links in the texts; `.cc-link` stays if the translation contains it |
| `.cc-link-box`, `.cc-description-block`, `.cc-always-active` | unchanged | classes of custom translations, prefix them with `#cc-main` |
| `.c--anim` | `#cc-main .cc--anim` | transitions, or `--cc-modal-transition-duration` |
| `.show--settings` | `.show--preferences` | class on `<html>` |
| `.force--consent` | `.disable--interaction` | class on `<html>` |

Example: `tests/fixtures/clients/example-project/branding.css` (1.x) and `tests/fixtures/clients/example-project/branding.v2.css` (2.0).

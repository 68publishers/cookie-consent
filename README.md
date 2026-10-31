<div align="center" style="text-align: center; margin-bottom: 50px">
<img src="docs/images/logo.svg" alt="Cookie Consent Logo" align="center" width="250">
<h1 align="center">Cookie Consent</h1>

An extended integration of [orestbida/cookieconsent](https://github.com/orestbida/cookieconsent) 3.x with support of the Google Tag Manager.
</div>

<br>

- :white_check_mark: Easy configurable GTM template
- :white_check_mark: Configurable storages standardized by Google
- :white_check_mark: Possibility to synchronize consents between more storages
- :white_check_mark: Default translations
- :white_check_mark: WCAG 2 compliant
- :white_check_mark: Support for storing consents via [CMP](https://github.com/68publishers/consent-management-platform)
- :white_check_mark: Consent per category or per service (cookie provider)
- :white_check_mark: Global Privacy Control

> :information_source: Version 2.0 is built on the plugin 3.x. The configuration, events and the consent cookie stay compatible with 1.x; custom CSS has to be updated. See [Migration from 1.x to 2.0](docs/migration-from-1.x-to-2.0.md).

**Requirements:** HTTPS (the consent is sent to the CMP only from a secure context) and browsers supporting ES2020 (Chrome 80+, Firefox 74+, Safari 13.1+, Edge 80+).

## Table of contents

* [Integration into the GTM](#integration-into-the-gtm)
* [Configuration](#configuration)
* [Using other CDN or self-hosted](#using-other-cdn-or-self-hosted)
* [Settings modal trigger](#settings-modal-trigger)
* [Triggering tags based on the consent](#triggering-tags-based-on-the-consent)
* [Consent state in the data layer](#consent-state-in-the-data-layer)
* [Accessing the wrapper in the JavaScript](#accessing-the-wrapper-in-the-javascript)
* [Configuration without GTM](#configuration-without-gtm)
* [Integration with CMP application](#integration-with-cmp-application)
* [How the GTM integration works](#how-the-gtm-integration-works)
* [How to update already published container](#how-to-update-already-published-containers)
  * [Migration from 1.x to 2.0](#migration-from-1x-to-20)
  * [Migration from v0.4 to v0.5](#migration-from-v04-to-v05)
* [Development](#development)
* [License](#license)

## Integration into the GTM

Open Google Tag Manager [web administration](https://tagmanager.google.com) and select a container for your website.
Next, go through the `Templates` link in the left navigation and click on the button `New` inside a section `Tag Templates`.

All you need is a file [`gtm_template.tpl`](/gtm_template.tpl) from the root directory of this package. Download the file and import it in the Template editor:

<img src="docs/images/import-template.png" alt="Right dropdown" width="150">

After successful import click on the button `Save`, leave the Template editor, and go through the `Tags` link in the left navigation.
Then create the new tag with the imported Template, as trigger set an option `Consent Initialization - All Pages` and save it.

<img src="docs/images/cookie-consent-tag.png" alt="Cookie consent tag" width="600">

Now you can open a preview of the website and as you can see the cookie widget is here! But let's configure it a bit.

## Configuration

> :exclamation: Locking the package version is highly recommended (see the field `Package version` below) after you successfully configure the template. Avoid using the `latest` version in production containers!

The plugin is configurable using fields inside the tag definition.

### Basic options

| Field                               | Description                                                                                                                                                                                                                                                  |
|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Package version                     | Version of the package `68publishers/cookie-consent`. Valid inputs are the `latest` or a version in formats `x.x.x`, `x.x.x-beta.x` and `x.x.x-alpha-x`. For available versions see the [releases](https://github.com/68publishers/cookie-consent/releases). |
| Package source                      | The URL where the package files are hosted. If the field is not filled, the **unpkg.com** CDN is used. To use a different source, please read the [Using other CDN or self-hosted](#using-other-CDN-or-self-hosted)                                          |
| Make consent required               | The page will be blocked until a user action.                                                                                                                                                                                                                |
| Show the widget as soon as possible | The widget will be displayed automatically on the page load. You must trigger the widget manually by calling `CookieConsentWrapper.unwrap().show()` if the option is disabled.                                                                               |
| Init widget after DOMContentLoaded  | The widget is initialized as soon as possible by default. If the option is enabled, initialization will wait until the `DOMContentLoaded` event.                                                                                                             |
| Hide from bots                      | Enable if you don't want the plugin to run when a bot/crawler/webdriver is detected (including browsers controlled by automation, `navigator.webdriver`).                                                                                                   |
| Revision                            | Revision number of your terms of use of cookies. For more information [see below](#how-to-manage-revisions).                                                                                                                                                 |
| Delay                               | Number of milliseconds before showing the consent modal.                                                                                                                                                                                                     |

### Consent & Setting modal options

Both sections contain these fields: `Layout` and `Position`. These settings affect where modals appear and what shape they take (the consent modal layouts `box`, `cloud` and `bar`, the settings modal layouts `box` and `bar`; the `bar` consent modal uses the vertical part of the position only).
The behavior of the consent modal buttons can be configured through fields `Primary button role`, `Secondary button role` (accept necessary cookies or open the settings modal), and `Buttons order`.
See the [plugin documentation](https://cookieconsent.orestbida.com/advanced/ui-customization.html) for more details. The field `Transition` was removed in 2.0, animations are set by the CSS variable `--cc-modal-transition-duration`.

The settings modal has the field `Preferences layout`:

- `Categories with cookie tables` (default) shows a toggle for every category and the table of its cookies.
- `Categories with services (providers)` shows also a toggle for every service (cookie provider) inside the category. The services are the providers of the cookies loaded from the [CMP application](#integration-with-cmp-application) (Cookies API, the provider code is the service name) and the services defined in the configuration (`storage_pool[].services`). The consent of services is stored in the cookie and sent to the CMP. Google Consent Mode keeps working per storage: a storage is `granted` when its category is accepted.

The consent modal has also an option `Show third button` that adds the third button to the modal. If the secondary button's role is `Open settings` the third button's role is `Accept necessary` and vice versa.

The settings modal has one special option with the name `Settings modal trigger selector`. A value of the option can be CSS selector for automatic creation of the trigger button that opens the modal. Check the [example](#settings-modal-trigger).

### Cookies options

| Field                       | Description                                                                                                                                                                                                            |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Cookie name                 | The name of a cookie value that holds information about the user's consent.                                                                                                                                            |
| Cookie domain               | The domain name for the cookie that holds information about the user's consent, for example ".example.com". If the value is empty, it is automatically set in a browser using the "window.location.hostname" variable. |
| Cookie expiration           | Expiration of the cookie in days.                                                                                                                                                                                      |
| Enable cookies auto-clear   | All cookies will be deleted based on the user's consent and a selected strategy if the option is enabled.                                                                                                              |
| Cookies auto-clear strategy | Strategy for cookies auto-clear feature.                                                                                                                                                                               |
| Cookie names                | Names of the cookies that will be deleted or kept (based on a selected strategy).                                                                                                                                      |
| Respect Global Privacy Control | If the browser sends the [Global Privacy Control](https://globalprivacycontrol.org/) signal and the visitor has not decided yet, storages enabled by default (except readonly ones) are treated as denied, also in the default consent of the GTM template, and the consent modal is not shown automatically. The visitor can still open the settings. |

The field `Use RFC cookie` was removed in 2.0, the cookie value is always URI encoded.

The following strategies are implemented:

1) `Clear all except defined`<sup>*</sup> - All cookies except those you define in the field `Cookie names` will be deleted when the user denies any storage.
2) `Clear defined only`<sup>*</sup> - All cookies you defined in the field `Cookie names` will be deleted when the user denies any storage.
3) `Use cookie tables` - The cookies listed in the cookie tables of the rejected categories (and of the rejected services in the services layout) are deleted. Integration of [CMP application](#integration-with-cmp-application) is required for this option.

<sup>*</sup> There is no need to define a name from the `Cookie name` field because this cookie is never automatically deleted.

### Storage options

The following types of storage are available:

- Functionality storage
- Security storage
- Personalization storage
- Ad storage
- Ad user data
- Ad personalization
- Analytics storage

Each storage defines the name of a trigger that will be invoked if the user provides consent. It is not necessary to use or display each storage in the widget. Also, the consent for the storage can be synchronized with the consent of another storage.

| Field                                                        | Description                                                                                                                                                                                                                                        |
|--------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Visibility and default state                                 | Defines whether the storage should be visible in the widget and what its default value is.                                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;- Visible, Enabled by default              | Storage is visible in the widget and is enabled by default.                                                                                                                                                                                        |
| &nbsp;&nbsp;&nbsp;- Visible & Readonly, Enabled by default   | Storage is visible in the widget, it is always enabled and cannot be disabled (usually used for `Functionality storage`).                                                                                                                          |
| &nbsp;&nbsp;&nbsp;- Visible, Disabled by default             | Storage is visible in the widget and is disabled by default.                                                                                                                                                                                       |
| &nbsp;&nbsp;&nbsp;- Hidden, Synchronized                     | Storage is not visible in the widget and the consent is synchronized with another storage.                                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;- Hidden, Disabled always                  | Storage is not visible in the widget and is always disabled. Use for storages that are not used by the application at all.                                                                                                                         |
| &nbsp;&nbsp;&nbsp;- Visible & Readonly, Disabled always      | Storage is visible in the widget and is always disabled.                                                                                                                                                                                           |
| Synchronize consent with                                     | The consent can be synchronized with another storage. The option is available only if the option `Visibility and default state` is set to `Hidden, Synchronized`.                                                                                  |
| If the storage is denied show the modal again after `x` days | The settings modal will be opened again after the specified number of days if the storage is denied. The option is available only if the option `Display in the widget` is set to `Visible, Enabled by default` or `Visible, Disabled by default`. |
| Event trigger name                                           | The name of an event trigger that will be invoked on `granted` consent with storage. The name may not be unique for each storage (unique triggers are invoked only). No trigger is invoked if the option has an empty value.                       |

### Event triggers based on composite consent

As mentioned above, each storage can define a trigger that is invoked when consent with the storage has been granted.
In some situations, you may want some trigger to be fired only if the user gives consent with multiple storage types.
For example, if you have a trigger called `fb_pixel_trigger` and you want to fire it only if the user gives consent with the `analytics_storage` and the `ad_stroage`.
Then your configuration may look like this:

<img src="docs/images/composite-consent-event-trigger.png" alt="Revision message translation" width="600">

### Translation settings

The package comes with the default translations for the following languages:

- [English - en](src/resources/translations/en.json)
- [Czech - cs](src/resources/translations/cs.json)
- [Slovak - sk](src/resources/translations/sk.json)
- [Spanish - es](src/resources/translations/es.json)
- [French - fr](src/resources/translations/fr.json)
- [German - de](src/resources/translations/de.json)
- [Bulgarian - bg](src/resources/translations/bg.json)
- [Hungarian - hu](src/resources/translations/hu.json)
- [Polish - pl](src/resources/translations/pl.json)
- [Romanian - ro](src/resources/translations/ro.json)
- [Slovenian - sl](src/resources/translations/sl.json)
- [Finnish - fi](src/resources/translations/fi.json)
- [Dutch - nl](src/resources/translations/nl.json)
- [Croatian - hr](src/resources/translations/hr.json)
- [Italian - it](src/resources/translations/it.json)
- [Norwegian - no](src/resources/translations/no.json)
- [Swedish - sv](src/resources/translations/sv.json)
- [Ukrainian - uk](src/resources/translations/uk.json)
- [Portuguese - pt](src/resources/translations/pt.json)
- [Basque - eu](src/resources/translations/eu.json)
- [Taiwanese Mandarin - zh-TW](src/resources/translations/zh-TW.json)
- [Turkish - tr](src/resources/translations/tr.json)

Translations that will be loaded and accessible for the widget are taken from the field `Locales`. Each locale must be defined on a new line.
Alternatively, from version `1.0.0`, the URL from which the translations are to be downloaded can also be entered.

<img src="docs/images/locale-options.png" alt="Locale options" width="600">

In the example above, the default translations for the English language are downloaded and the translations for the German language are downloaded from the URL `https://www.example.com/public/cc-translations/de.json`.
A translation file must always be in JSON format and its name must match a locale.

If you want to rewrite default translations, or you want to add translations for a new locale then you can define them in a table `Translations`.

### Locale detection

Locale detection can be affected with the following fields:

| Field                     | Description                                                                                                                                                  |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Locale detection strategy | `Browser` to get user's browser language or `Document` to read a value from `<html lang="...">` of the current page.                                         |
| Locale                    | You must define the website locale when the detection strategy is disabled. The locale must be one of the previously defined locales in the field `Locales`. |

### How to manage revisions

The default revision number is `0` and the number can be changed through the field `Revision`. When you change the value the consent modal will be displayed for all users again.
You can define a message that will be displayed in the consent modal's description. If you want to do that define custom translation with the key `consent_modal_revision_message` and rewrite a translation with the key `consent_modal_description`. The plugin will replace the placeholder `[[revision_message]]` in the consent modal description with your revision message.

<img src="docs/images/revision-message-translation.png" alt="Revision message translation" width="600">

*<sup>Note: the <a href="https://cookieconsent.orestbida.com/advanced/revision-management.html">cookieconsent plugin</a> uses the placeholder `{{revisionMessage}}` but this notation is used by GTM for variables so the package comes with the placeholder `[[revision_message]]` instead.</sup>*

### Stylesheets

| Field                       | Description                                                                                                                                                                                  |
|-----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Include default stylesheets | The default stylesheet for the widget will be loaded into the page if the option is checked. We recommend keeping the option checked and adding custom stylesheets through the next options. |
| External stylesheets        | The list of custom CSS stylesheets. One URL per line.                                                                                                                                        |
| Internal stylesheet         | Custom CSS rules that will be injected into the page after default stylesheets and other external stylesheets.                                                                               |

The widget is styled by the CSS variables of the plugin (`--cc-*`, see [UI customization](https://cookieconsent.orestbida.com/advanced/ui-customization.html)), e.g. `#cc-main { --cc-btn-primary-bg: #54a40d; }`.
The default stylesheet contains the light scheme only; the dark scheme is in `cookie-consent-dark.css` (add it to the external stylesheets and the class `cc--darkmode` to `<html>`). Right-to-left layouts are not part of the default stylesheet.

### Page scripts

| Field               | Description                                                          |
|---------------------|----------------------------------------------------------------------|
| Manage page scripts | Enable if you want to easily manage existing `<script>` tags.        |
| Script selector     | The name of a data attribute that is used for managed <script> tags. |

Managing page scripts is disabled by default. When the feature is enabled then the following notation can be used for scripts you want to manage (the attribute name is the value of `Script selector`, the plugin attribute `data-category` works too; `data-service` limits a script to a service in the services layout):

```html
<script type="text/plain" data-cookiecategory="analytics_storage" src="analytics.js" defer></script>

<script type="text/plain" data-cookiecategory="ad_storage" defer>
    console.log('Ad storage enabled!');
</script>
```

## Using other CDN or self-hosted

The configuration gives the option to set the URL from which the package files (js, css and translation files) will be loaded via the `Package source` field.

If the field is left blank, the `unpkg.com` CDN is used. Alternatively, `jsDelivr.com` can be used by entering the following URL:
```
https://cdn.jsdelivr.net/npm/@68publishers/cookie-consent@{version}/dist/
```
The `{version}` placeholder is automatically replaced with the value from the `Package version` field.

### Self-hosted package

It is possible to host package files at any URL. To do this, the following steps are required:

1. The complete contents of the [dist](./dist) folder must be accessible from that URL.
2. The "Package source" field needs to be set correctly.
3. It is necessary to modify the "Inject script" permissions in the GTM template.

For example, if the package files are available at the URL https://www.example.com/static/cookie-consent/, the `Package source` field needs to be set to `https://www.example.com/static/cookie-consent/`.
Also, the placeholder `{version}` can be used in the field.

Next, the GTM template needs to be modified. In the "Permissions" tab, it is necessary to add the URL `https://www.example.com/` in the "Inject scripts" section.

> :exclamation: Each time the GTM template is updated, the permissions need to be modified again, as an overwrite will occur.

<img src="docs/images/inject-scripts-permissions.png" alt="Inject scrips permissions" width="300">

## Settings modal trigger

When the user dismisses the consent modal then the modal is not displayed until the consent cookie expires. But you want to give the ability to change preferences later.
This can be done automatically with the configuration field `Settings modal trigger selector`. For example, if you have this HTML code on your website:

```html
<footer>
    <div class="footer-container">
        <div class="footer-item">
            <a href="/terms-of-use">
                <span class="footer-item-text">Terms of use</span>
            </a>
        </div>
        <div class="footer-item">
            <a href="/faq">FAQ</a>
        </div>
        <div class="footer-item">
            <a href="/contact">
                <span class="footer-item-text">Contact</span>
            </a>
        </div>
    </div>
</footer>
```

And the field `Settings modal trigger selector` is configured like this:

<img src="docs/images/settings-modal-trigger-selector-field.png" alt="Settings modal trigger selector field" height="100" align="center">

Then the plugin injects a new item into the footer automatically:

```html
<footer>
    <div class="footer-container">
        <div class="footer-item">
            <a href="/terms-of-use">
                <span class="footer-item-text">Terms of use</span>
            </a>
        </div>
        <div class="footer-item">
            <a href="/faq">FAQ</a>
        </div>
        <div class="footer-item">
            <a href="/contact">
                <span class="footer-item-text">Contact</span>
            </a>
        </div>
        <div class="footer-item">
            <a href="#cookie-settings" data-cc="c-settings">
                <span class="footer-item-text">Cookie settings</span>
            </a>
        </div>
    </div>
</footer>
```

However, it is not always possible to achieve the right result with this automation (depending on the website layout). In this case, leave the `Settings modal trigger selector` field blank and define the link in your layout manually.
Opening of the settings modal will be triggered automatically to the link.

## Triggering tags based on the consent

Tags are triggered after the consent with event triggers that are defined for each [storage](#storage-options). For example, if you have the `analytics_storage` configured like this:

<img src="docs/images/analytics-storage-options.png" alt="Analytics storage options" width="300">

Then create a custom trigger with the following options:

<img src="docs/images/analytics-storage-trigger.png" alt="Analytics storage trigger" width="600">

And a tag that is fired with the trigger:

<img src="docs/images/analytics-storage-tag.png" alt="Analytics storage trigger" width="600">

## Consent state in the data layer

The consent state is always sent to the data layer as [Google Consent Mode](https://developers.google.com/tag-platform/devguides/consent) commands (`gtag('consent', 'default' | 'update', {...})`). GTM processes those commands internally, so their values cannot be read by Data Layer Variables and no trigger can be attached to them.

If you need the state of all storages (both `granted` and `denied`) in GTM, enable the option `Push consent to the data layer as an event` in the `Data layer` section of the tag. The widget then pushes a regular data layer event immediately after every `default` and `update` command, with the same values:

```javascript
dataLayer.push({
  event: '68publishers_consent', // configurable through the option "Data layer event name"
  consent_status: 'default', // or 'update'
  functionality_storage: 'granted',
  security_storage: 'granted',
  personalization_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'
});
```

The values can then be read by Data Layer Variables (e.g. `analytics_storage`, `consent_status`) and tags can be fired by a Custom Event trigger with the configured event name.

Things to keep in mind:

- The option is disabled by default.
- The `default` event is pushed in the Consent Initialization, but GTM processes it after the `Container Loaded` event and before `DOM Ready`. The values are therefore **not** available in tags fired by the `Initialization` or `All Pages` triggers.
- The consent event is always pushed before the [event triggers](#triggering-tags-based-on-the-consent) of the storages (`68publishers_*`), so tags fired by these triggers can already read the consent values.
- For a returning visitor, the event is pushed once on every page with the `default` status. Since 2.0 the widget does not push the same values again with the `update` status when it is loaded (the `gtag('consent', 'update', ...)` command stays).
- The event is pushed with the `update` status after the user's first action in the consent modal and after every change in the settings modal.
- The storage keys are pushed to the top level of the data model, so they overwrite any variables with the same names pushed by other tools.

## Accessing the wrapper in the JavaScript

The wrapper is accessible in the `window` under the name `CookieConsentWrapper`. The recommended way how to manipulate with it is through event callbacks because the wrapper may not be fully initialized at the time your script is executed.
Callbacks are attached with calling of the method `CookieConsentWrapper.on()`, however since the version `1.0.0` the preferred method is to use the `window.cookieConsentWrapperEvents` variable.

The use of the variable avoids the situation when the wrapper does not exist in the window yet.

### Init event

A callback is invoked when the wrapper is fully initialized or directly if everything has been already initialized.

```html
<script>
    window.cookieConsentWrapperEvents = window.cookieConsentWrapperEvents || [];

    window.cookieConsentWrapperEvents.push(['init', function () {
        if (CookieConsentWrapper.allowedCategory('analytics_storage')) {
            // check if the analytics_storage is granted
        }

        CookieConsentWrapper.unwrap(); // get the original cookie consent plugin (3.x API)
    }]);
</script>
```

`CookieConsentWrapper.unwrap()` returns the API of the plugin 3.x (`show()`, `showPreferences()`, `acceptCategory()`, `acceptedService()`, `getCookie()`, ...).
For Custom HTML tags written for 1.x it also keeps the methods of the plugin 2.9 (`showSettings()`, `hideSettings()`, `allowedCategory()`, `accept()`, `updateLanguage()`, `getConfig('cookie_name')`, ...); they log a deprecation warning and will be removed in the next major version.

Other methods of the wrapper:

| Method / property | Description |
|---|---|
| `allowedCategory(name)` | `true` if the storage is accepted. |
| `changeLocale(locale, force)` | Changes the language of the widget (loads the translations if needed). Returns a Promise. |
| `setSettingsModalClosable(closable)` | `false` keeps the settings modal open: no close icon, Escape and clicks outside do nothing (e.g. the consent settings inside a mobile app). |
| `consentCookieData`, `consentCookieValue` | The parsed and the raw value of the consent cookie. |
| `acceptedServices` | Accepted services by storage (the services layout). |
| `configurationExport` | A Promise of the configuration sent to the CMP and its checksum (a plain object in 1.x). |
| `version` | The version of the package. |

With the option `compat_legacy_ids` (enabled by default) the buttons and toggles keep the ids and classes of 1.x (`c-p-bn`, `s-all-bn`, `s-sv-bn`, `c-tgl`, ...), so GTM click triggers based on `{{Click ID}}` keep working.

### Consent events

```html
<script>
    window.cookieConsentWrapperEvents = window.cookieConsentWrapperEvents || [];

    window.cookieConsentWrapperEvents.push(['consent:first-action', function (consent) {
        // called on the first user's action
    }]);

    window.cookieConsentWrapperEvents.push(['consent:accepted', function (consent) {
        // called on every page load after the first user's action
    }]);

    window.cookieConsentWrapperEvents.push(['consent:changed', function (consent, changedCategories, changedServices) {
        // called when preferences changed
    }]);

    window.cookieConsentWrapperEvents.push(['consent:saved', function (consent) {
        // called after every action of the user in the widget, also without a change (the cookie is saved)
    }]);

    window.cookieConsentWrapperEvents.push(['services:changed', function (acceptedServices) {
        // the services layout only: {ad_storage: ['google_ads', 'meta'], ...}
    }]);
</script>
```

### Locale event

```html
<script>
    window.cookieConsentWrapperEvents = window.cookieConsentWrapperEvents || [];

    window.cookieConsentWrapperEvents.push(['locale:change', function (locale) {
        // called when the plugin locale is changed through method `CookieConsentWrapper.changeLocale()`
        console.log(locale + '!');
    }]);

    // ...

    CookieConsentWrapper.changeLocale('cs', true) // cs!
    CookieConsentWrapper.changeLocale('en', true) // en!
</script>
```

## Configuration without GTM

Without GTM the wrapper is configured by the object `window.cc_wrapper_config` defined before the script `cookie-consent.min.js` is loaded. The GTM template creates the same object.

```html
<script>
    window.cc_wrapper_config = {
        locales: ['cs', 'en'],
        storage_pool: [
            { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
            { name: 'analytics_storage', display_in_widget: true },
        ],
    };
</script>
<script src="https://unpkg.com/@68publishers/cookie-consent@2/dist/cookie-consent.min.js" async></script>
```

| Key | Option | Description |
|---|---|---|
| `plugin_options` | `autorun` | Show the consent modal automatically (default `true`). |
| | `delay` | Milliseconds before the consent modal is shown. |
| | `hide_from_bots` | Do not run for bots and browsers controlled by automation. |
| | `cookie_name` | Name of the consent cookie (default `cc-settings`). |
| | `cookie_expiration` | Expiration in days (default `182`). |
| | `cookie_domain` | Domain of the cookie; the current host is used if the page is not on that domain. |
| | `cookie_path` | Path of the cookie (default `/`). |
| | `cookie_same_site` | SameSite attribute of the cookie (default `Lax`). |
| | `force_consent` | Block the page until the user decides. |
| | `revision` | Revision of the cookie policy; a change shows the widget again. |
| | `current_lang` | Default language. |
| | `auto_language` | Language detection: `document`, `browser` or `null`. |
| | `page_scripts` | Manage `<script type="text/plain">` tags. |
| | `script_selector` | Attribute of managed scripts (default `data-cookiecategory`). |
| | `respect_gpc` | Respect the Global Privacy Control signal. |
| | `init_after_dom_content_loaded` | Initialize after `DOMContentLoaded`. |
| | `remove_cookie_tables` | Kept for compatibility, no effect. |
| | `lazy_html_generation` | Create the settings modal when it is opened (default `true`). |
| | `compat_legacy_ids` | Ids and classes of 1.x on buttons and toggles (default `true`). |
| | `use_rfc_cookie` | Deprecated, ignored. |
| `consent_modal_options` | `layout`, `position` | Layout (`box`, `cloud`, `bar`) and position of the consent modal. |
| | `primary_button_role` | `accept_all`. |
| | `secondary_button_role` | `settings` or `accept_necessary`. |
| | `show_third_button` | Add the button with the other role. |
| | `swap_buttons` | Reverse the order of the buttons. |
| | `equal_weight_buttons` | All buttons look the same. |
| | `transition` | Deprecated, ignored. |
| `settings_modal_options` | `layout`, `position` | Layout (`box`, `bar`) and position (`left`, `right`) of the settings modal. |
| | `modal_trigger_selector` | CSS selector of an element cloned as the link opening the settings. |
| | `preferences_mode` | `categories` (default) or `services`. |
| | `transition` | Deprecated, ignored. |
| `auto_clear_options` | `enabled`, `strategy`, `cookie_names` | See [Cookies options](#cookies-options); strategies `clear_all_except_defined`, `clear_defined_only`, `cookie_tables`. |
| `ui_options` | `include_default_stylesheets`, `external_stylesheets`, `internal_stylesheets` | See [Stylesheets](#stylesheets). |
| `user_options` | `identity`, `attributes` | User identity and attributes sent to the CMP (attributes may be functions). |
| `data_layer_options` | `push_consent`, `consent_event_name` | See [Consent state in the data layer](#consent-state-in-the-data-layer). |
| `cmp_api_options` | `url`, `project`, `version`, `environment`, `consent_api_enabled`, `cookies_api_enabled`, `cookie_table_headers` | See [Integration with CMP application](#integration-with-cmp-application). |
| `storage_pool` | `name`, `enabled_by_default`, `display_in_widget`, `readonly`, `sync_consent_with`, `show_modal_again_expiration`, `services` | Storages; `services` is a list of `{name, label}` for the services layout. |
| `event_triggers` | `name`, `storage_names`, `type` | Events pushed by `gtag('event', ...)` when the storages are granted (`or`, `and`). |
| `locales` | | Locale codes or URLs of translation files; only the current one is loaded. |
| `translations` | | Custom translations: `{cs: {consent_modal_title: '...'}}`. |

## Integration with CMP application

The widget can be integrated with [the CMP application](https://github.com/68publishers/consent-management-platform).

The first thing to do is to set up the user information under the `Integration` section. Each user must have an identity (ID).
The default option is `Generated UUID`, however you can set a custom GTM variable that will return the ID of the current user of your website.

The ID will be accessible in all your translations with placeholder `[[user_identity]]`.

You can also set other attributes that will be sent to the CMP application along with the consents.

<img src="docs/images/user-integration.png" alt="User integration" width="600">

Configuration of the CMP application is easy, just set the URL of your application and the project code (if you leave it blank, the site domain is used as the code).

<img src="docs/images/cmp-integration.png" alt="CMP integration" width="600">

The configuration includes two options

- Consent API enabled
- Cookies API enabled

If you check the `Consent API enabled` option, the widget will automatically send consents to the CMP application.

If you check the `Cookies API enabled` option then the widget will automatically pull all cookies from the CMP application for the project and creates cookie tables from them.
Below this field you can define which columns the cookie table should contain.

<img src="docs/images/widget-with-cookie-tables.png" alt="Widget with cookie tables" width="600">

## How the GTM integration works

#### Consent initialization

- :fire: A tag that is associated with the [Cookie Consent Template](/gtm_template.tpl) is fired
    - :gear: A configuration for `CookieConsentWrapper` object is created from values defined inside the tag
    - :ballot_box_with_check: The default consent is resolved according to the configuration and already existent user preferences
    - :arrows_counterclockwise: The default consent is sent into [native Google Consent API](https://developers.google.com/tag-platform/devguides/consent#gtag.js)
    - :arrows_counterclockwise: The default consent is pushed into the data layer as an event (if [enabled](#consent-state-in-the-data-layer))
    - :hourglass_flowing_sand: Custom [triggers](#triggering-tags-based-on-the-consent) for granted storage types are scheduled into a `gtag` function
    - :arrow_double_down: A script with the wrapper initialization is injected into a page

#### GTM Container loaded

- :fire: The data layer event with the default consent is processed (if [enabled](#consent-state-in-the-data-layer))
- :fire: Custom triggers for granted storage types are fired

#### Page loaded

- :fast_forward: The `CookieConsentWrapper` object is fully initialized
    - :fast_forward: The [original plugin](https://github.com/orestbida/cookieconsent) is initialized
    - :fire: Callbacks for an [event](#init-event) `CookieConsentWrapper.on('init')` are fired
    - :eye: The consent modal is shown if a user has not yet agreed to the use of cookies
        - :fire: After user's action, callbacks for an [event](#consent-events) `CookieConsentWrapper.on('consent:first-action')` are fired
        - :arrows_counterclockwise: The consent is sent into the CMP application
    - :fire: Callbacks for an [event](#consent-events) `CookieConsentWrapper.on('consent:accepted')` are fired

#### User updates his preferences through the setting modal

- :arrows_counterclockwise: The consent update is sent into [native Google Consent API](https://developers.google.com/tag-platform/devguides/consent#gtag.js)
- :arrows_counterclockwise: The consent update is pushed into the data layer as an event (if [enabled](#consent-state-in-the-data-layer))
- :fire: Custom triggers for newly granted storage types are fired
- :fire: Callbacks for an [event](#consent-events) `CookieConsentWrapper.on('consent:changed')` are fired
- :arrows_counterclockwise: The consent is sent into the CMP application

## How to update already published containers

If you want to update to the newer version please firstly look into [releases](https://github.com/68publishers/cookie-consent/releases) to see what has changed until the release that you are using.

For update, you must reimport the Template in your GTM in the same way how you imported it for the first time. The template will be updated but existing configurations inside tags will be kept. Of course, if the Template wasn't changed between releases then you can skip this step.

Then open the associated tag and update the value of the field `Package version`.

If the package files are [self-hosted](#self-hosted-package), it is necessary to re-edit the Injects scripts in template permissions.

### Migration from 1.x to 2.0

Reimport the template, update the field `Package version` and rewrite custom CSS of the widget. Custom HTML tags using `unwrap()` and GTM triggers using the ids of the buttons keep working. See the page [Migration from 1.x to 2.0](docs/migration-from-1.x-to-2.0.md).

### Migration from v0.4 to v0.5

For more detailed information on migrating from `0.4.x` to `0.5.x`, please continue to the page [Migration from v0.4 to v0.5](docs/migration-from-0.4-to-0.5.md).

## Development

```sh
$ git clone https://github.com/68publishers/cookie-consent.git
$ cd cookie-consent
$ npm install
$ npx playwright install chromium firefox webkit
```

| Command | Description |
|---|---|
| `npm run build:prod` | Production build into `dist/`. |
| `npm run demo` | Builds into `var/build` and serves the demo pages on http://localhost:4173/demo/standalone.html, `gtm.html` (the GTM template with the Example Project configuration through a sandbox shim), `cmp.html` (a mocked CMP) and `example-project.html` (the widget of a 1.x client with its branding, custom tags and click triggers; `?version=1.6.0` shows the same page with 1.6.0, `&app=settings` the mobile app mode; 1.6.0 needs `npm run ref` once). The pages need the server, opening the files directly does not work. |
| `npm test` | Unit tests (Vitest), e2e tests (Playwright in Chromium, Firefox and WebKit) and, on macOS, the visual references. `CC_TARGET=var/perf-ref` runs the e2e tests against another build, e.g. 1.6.0 downloaded by `npm run ref`. |
| `npm run test:visual -- --update-snapshots=all` | Updates the visual references after an intended change of the look; `npm run test:visual:gallery` builds `var/visual/index.html`. |
| `npm run perf -- --compare` | Measures the size, requests and time to the widget against 1.6.0 (budget in `perf/budget.json`). |
| `npm run size` | Size limits of the JS and the CSS. |

## License

The package is distributed under the MIT License. See [LICENSE](LICENSE.md) for more information.

<div align="center" style="text-align: center; margin-bottom: 50px">
<img src="docs/images/logo.svg" alt="Cookie Consent Logo" align="center" width="250">
<h1 align="center">Cookie Consent</h1>

An extended integration of [orestbida/cookieconsent](https://github.com/orestbida/cookieconsent) with support of the Google Tag Manager.
</div>

<br>

- :white_check_mark: Easy configurable GTM template
- :white_check_mark: Five configurable storages standardized by Google
- :white_check_mark: Possibility to synchronize consents between more storages
- :white_check_mark: Default translations

## Table of contents

* [Integration into the GTM](#integration-into-the-gtm)
* [Configuration](#configuration)
* [Settings modal trigger](#settings-modal-trigger)
* [Triggering tags based on the consent](#triggering-tags-based-on-the-consent)
* [Accessing the wrapper in the JavaScript](#accessing-the-wrapper-in-the-javascript)
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

The plugin is configurable using fields inside the tag definition.

### Basic options

| Field | Description |
| ------ | ------ |
| Package version  | Version of the package `68publishers/cookie-consent`. Valid inputs are the `latest` or a version in format `x.x.x`. For available versions see the [releases](https://github.com/68publishers/cookie-consent/releases). |
| Make consent required | The page will be blocked until a user action. |
| Show the widget as soon as possible | The widget will be displayed automatically on the page load. You must trigger the widget manually by calling `CookieConsentWrapper.unwrap().show()` if the option is disabled. |
| Hide from bots | Enable if you don't want the plugin to run when a bot/crawler/webdriver is detected. |
| Revision | Revision number of your terms of use of cookies. For more information [see below](#how-to-manage-revisions). |
| Delay | Number of milliseconds before showing the consent modal. |

### Consent & Setting modal options

Both sections contain these fields: `Layout`, `Position`, `Transition`. These settings affect where modals appear and what shape they take.
The behavior of the consent modal buttons can be configured through fields `Primary button role`, `Secondary button role` (accept necessary cookies or open the settings modal), and `Buttons order`.
See the [widget documentation](https://github.com/orestbida/cookieconsent/tree/v2.7.1#layout-options--customization) for more details.

The settings modal has one special option with the name `Settings modal trigger selector`. A value of the option can be CSS selector for automatic creation of the trigger button that opens the modal. Check the [example](#settings-modal-trigger).

### Cookies options

| Field | Description |
| ------ | ------ |
| Cookie name | The name of a cookie value that holds information about the user's consent. |
| Cookie expiration | Expiration of the cookie in days. |
| Enable cookies auto-clear | All cookies will be deleted based on the user's consent and a selected strategy if the option is enabled. |
| Cookies auto-clear strategy | Strategy for cookies auto-clear feature. |
| Cookie names | Names of the cookies that will be deleted or kept (based on a selected strategy). |

The following strategies are implemented:

1) `Clear all except defined` - All cookies except those you define in the field `Cookie names` will be deleted when the user denies any storage.
2) `Clear defined only` - All cookies you defined in the field `Cookie names` will be deleted when the user denies any storage.

There is no need to define a name from the `Cookie name` field because this cookie is never automatically deleted.
The option `autoclear_cookies` from the original [plugin](https://github.com/orestbida/cookieconsent) is not currently supported because cookie tables are not implemented in this package.

### Storage options

Five types of storage are available:

- Functionality storage
- Security storage
- Personalization storage
- Ad storage
- Analytics storage

Each storage defines the name of a trigger that will be invoked if the user provides consent. It is not necessary to use or display each storage in the widget. Also, the consent for the storage can be synchronized with the consent of another storage.

| Field | Description |
| ------ | ------ |
| Enabled by default | A storage has `granted` consent by default if the option is checked. Triggers will be invoked as soon as possible. |
| Display in the widget | A storage will be displayed inside the settings modal if the option is checked. |
| Readonly | A toggle button for storage inside the settings modal will be disabled if the option is checked. Commonly used for functionality storage. The option is available only if the option `Display in the widget` is checked. |
| Synchronize consent with | The consent can be synchronized with another storage. The option is available only if the option `Display in the widget` is not checked. |
| Event trigger name | The name of an event trigger that will be invoked on `granted` consent with storage. The name may not be unique for each storage (unique triggers are invoked only). No trigger is invoked if the option has an empty value. |

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

Translations that will be loaded and accessible for the widget are taken from the field `Locales`. Each locale must be defined on a new line.
If you want to rewrite default translations or you want to add translations for a new locale then you can define them in a table `Translations`.

### Locale detection

Locale detection can be affected with the following fields:

| Field | Description |
| ------ | ------ |
| Locale detection strategy | `Browser` to get user's browser language or `Document` to read a value from `<html lang="...">` of the current page. |
| Locale | You must define the website locale when the detection strategy is disabled. The locale must be one of the previously defined locales in the field `Locales`. |

### How to manage revisions

The default revision number is `0` and the number can be changed through the field `Revision`. When you change the value the consent modal will be displayed for all users again.
You can define a message that will be displayed in the consent modal's description. If you want to do that define custom translation with the key `consent_modal_revision_message` and rewrite a translation with the key `consent_modal_description`. The plugin will replace the placeholder `[[revision_message]]` in the consent modal description with your revision message.

<img src="docs/images/revision-message-translation.png" alt="Revision message translation" width="600">

*<sup>Note: the <a href="https://github.com/orestbida/cookieconsent/tree/v2.7.1#how-to-enablemanage-revisions">cookieconsent plugin</a> uses the placeholder `{{revision_message}}` but this notation is used by GTM for variables so the package comes with the placeholder `[[revision_message]]` instead.</sup>*

### Stylesheets

| Field | Description |
| ------ | ------ |
| Include default stylesheets | The default stylesheet for the widget will be loaded into the page if the option is checked. We recommend keeping the option checked and adding custom stylesheets through the next options. |
| External stylesheets | The list of custom CSS stylesheets. One URL per line. |
| Internal stylesheet | Custom CSS rules that will be injected into the page after default stylesheets and other external stylesheets. |

### Page scripts

| Field | Description |
| ------ | ------ |
| Manage page scripts | Enable if you want to easily manage existing `<script>` tags. |
| Script selector | The name of a data attribute that is used for managed <script> tags. |

Managing page scripts is disabled by default. When the feature is enabled then the following notation can be used for scripts you want to manage:

```html
<script type="text/plain" data-cookiecategory="analytics_storage" src="analytics.js" defer></script>

<script type="text/plain" data-cookiecategory="ad_storage" defer>
    console.log('Ad storage enabled!');
</script>
```

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

## Accessing the wrapper in the JavaScript

The wrapper is accessible in the `window` under the name `CookieConsentWrapper`. The recommended way how to manipulate with it is through event callbacks because the wrapper may not be fully initialized at the time your script is executed.
Callbacks are attached with calling of the method `CookieConsentWrapper.on()`.

### Init event

The only currently available event is `init`. A callback is invoked when the wrapper is fully initialized or directly if everything has been already initialized.

```html
<script>
    CookieConsentWrapper.on('init', function () {
        if (CookieConsentWrapper.allowedCategory('analytics_storage')) {
            // check if the analytics_storage is granted
        }
        
        CookieConsentWrapper.unwrap(); // get the original cookie consent plugin
    });
</script>
```

## Development

Firstly download the package:

```sh
$ git clone https://github.com/68publishers/cookie-consent.git
$ cd cookie-consent
```

Use predefined commands for the package build:

```sh
$ npm run build:dev # or prod
```

Paths of output files are:
 - `~/build/cookie-consent.js` (dev mode)
 - `~/dist/cookie-consent.min.js` (production mode)

A simple demo page without real GTM is located in `~/build/index.html`. To show the demo in your browser run:

```sh
$ npm run start:dev
```

Then visit the page `http://localhost:3000`.

## License

The package is distributed under the MIT License. See [LICENSE](LICENSE.md) for more information.

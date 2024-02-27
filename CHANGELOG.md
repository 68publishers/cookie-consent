# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2024-02-28

### Added

- Added default translations for `Croatian` (`hr`).
- Added default translations for `Italian` (`it`).
- Added default translations for `Norwegian` (`no`).
- Added default translations for `Swedish` (`sv`).
- Added default translations for `Ukrainian` (`uk`).

### Changed

- Updated translations for `Bulgarian` (`bg`).

## [0.5.0] - 2024-02-27

### Added

- Added new storages `ad_user_data` and `ad_personalization` in the GTM template (Google Consent Mode v2 integration).
- Added new translation keys `ad_user_data_title`, `ad_user_data_description`, `ad_personalization_title` and `ad_personalization_description`.
- Added the [Migration from v0.4 to v0.5](docs/migration-from-0.4-to-0.5.md) guide.

### Changed

- Changed the way to configure storages (more information in the [Migration from v0.4 to v0.5](docs/migration-from-0.4-to-0.5.md) guide).
- Updated README.

## [0.4.8] - 2024-02-15

### Added

- Added fields `Integration > CMP API > Default environment` and `Integration > CMP API > Environment code` in the GTM template.
- Added option `evironment` in the `CmpApiOptions`. The environment is taken into account in the integration with CMP.
- Added getter `CookieConsentWrapper.consentCookieData` that returns data from the consent cookie (`cc-settings` by default) as an object or null if the consent doesn't exists.

### Changed

- Credentials are now omitted in CPM integration requests.

## [0.4.7] - 2023-10-04

### Added

- Added default translations for `Dutch` (`nl`) language.

### Changed

- Updated all dependencies including the original plugin (`vanilla-cookieconsent@^2.9.2`).
- The wrapper now includes CSS styles of the original plugin corresponding to its version.

### Fixed

- Fixed npm audit vulnerability.

## [0.4.6] - 2023-09-01

### Added

- Added missing translation keys in the GTM template.
- Added default translations for `Finnish` (`fi`) language.

## [0.4.5] - 2023-04-26

### Added

- Added default translations for `German` (`de`) language.
- Added default translations for `Bulgarian` (`bg`) language.
- Added default translations for `Hungarian` (`hu`) language.
- Added default translations for `Polish` (`pl`) language.
- Added default translations for `Romanian` (`ro`) language.
- Added default translations for `Slovenian` (`sl`) language.

### Fixed

- Fixed the default consent initialization when any category is configured as "enabled_by_default" and user disables it.

## [0.4.4] - 2023-04-01

### Added

- added getter `CookieConsentWrapper.version`
- the version is also exported via `CookieConsentWrapper.configurationExport`

## [0.4.3] - 2023-03-28

### Added

- Added default translations for `French` (`fr`) language.

## [0.4.2] - 2023-02-21

### Added

- Added default translations for `Spanish` (`es`) language.

## [0.4.1] - 2022-12-23

### Fixed

- Fixed typo in the czech dictionary.

## [0.4.0] - 2022-12-09

### Added

- Added the CMP application integration
- Added the field `Show third button` in GTM template under the section `Consent modal options`.
- Added the field `Cookie domain` in GTM template under the section `Cookie options`.
- Added the cookie auto-clear option `Use cookie tables`
- Added events `consent:first-action`, `consent:accepted`, `consent:changed` and `locale:change`
- Added mentions of new fields and events in README
- Added the section `Integration with CMP application` in README
- Added all new translations for locales `en`, `cs` and `sk`

### Changed

- Updated the original plugin to the version `^2.8.6`

## [0.3.8] - 2022-02-09

### Fixed

- The value of the key `data` from the cookie `cc-settings` could be null.

## [0.3.7] - 2022-02-09

### Fixed

- The data attribute `last_action_date` is automatically added into the `cc-settings` cookie for users that accepts/rejects consent before the plugin update.

## [0.3.6] - 2022-02-07

### Added

- Added fields `Show the modal again if storage is denied` for each storage in the GTM template. The settings modal can be opened again after the specified number of days if the storage is denied.

## [0.3.5] - 2022-01-08

### Added

- Added the section `How the GTM integration works` in README
- Added the section `How to update already published container` in README

### Changed

- The original plugin is initialized directly if the DOM is loaded or inside a callback attached to an event `document.DOMContentLoaded` instead of `window.load`.

## [0.3.4] - 2022-01-05

### Removed

- Removed argument `wrapper` for an event `init`. Callbacks for the event now have no arguments now, please use directly `CookieConsentWrapper` inside a callback function.

## [0.3.3] - 2022-01-05

### Changed

- Default translations are now loaded also for locales that are consist of an `ISO 639-1` language code and an `ISO 3166-1` country code e.g. `en-US`.

## [0.3.2] - 2022-01-03

### Added

- Added the section `Accessing the wrapper in the JavaScript` in the README
- Added the section `Cookies options` in the README
- Added the field `Enable cookies auto-clear` in GTM template under the section `Cookies options`.
- Added the field `Cookies auto-clear strategy` in GTM template under the section `Cookies options`.
- Added the field `Cookie names` in GTM template under the section `Cookies options`.
- Added implementation of cookies auto-clear based on mentioned fields.

### Changed

- Updated a code in the GTM template - temporary object `window.CookieConsentWrapper` is created before the real wrapper is created by an external script. This allows attaching events through the method `CookieConsentWrapper.on()` before the script is downloaded by a browser.
- Moved fields `Cookie name` and `Cookie expiration` under the new section `Cookies options`.
- Moved the field `Settings modal trigger selector` under the section `Settings modal options`.

## [0.3.1] - 2021-12-31

### Fixed

- Fixed initialization of the original plugin when a page is too small and DOM is already loaded before an event `window.addEventListener('load', ...)` is attached.

## [0.3.0] - 2021-12-28

### Added

- Added param table `Event triggers` in a new section `Composite consent` in GTM template. Event triggers for composite consent can be defined here. For more information look into the section [Event triggers based on composite consent](./README.md#event-triggers-based-on-composite-consent) in README.

### Changed

- Options for the wrapper are now accessible under a single global variable `window.cc_wrapper_config` instead of multiple smaller variables (GTM template must be updated).
- Modified regex validation rule for GTM field `Package version`. The regex now allows beta and alpha versions.

## [0.2.7] - 2021-12-22

### Changed

- Changed descriptions of the `security` storage in translations.
- Unified translations for buttons in the consent modal.
- Removed emojis from translations.

## [0.2.6] - 2021-12-21

### Added

- Added options `consent_modal_secondary_btn_settings` and `consent_modal_secondary_btn_accept_necessary` for GTM field `Translations - Key`.

## [0.2.5] - 2021-12-21

### Added

- Added default translations for `Slovak` (`sk`) language.

### Changed

- Changed default translations for `English` (`en`) and `Czech` (`cs`) languages.

## [0.2.4] - 2021-12-21

### Fixed

- Fixed loading od internal stylesheets.

## [0.2.3] - 2021-12-21

### Added

- The field `Primary button role` in GTM template under the section `Consent modal options`.
- The field `Secondary button role` in GTM template under the section `Consent modal options`.
- The field `Buttons order` in GTM template under the section `Consent modal options`.
- The translation key `consent_modal_secondary_btn_settings`
- The translation key `consent_modal_secondary_btn_accept_necessary`

### Changed

- Changed the package logo.
- Updated GTM template - logo, brand etc. - nothing about functionality.
- Updated README.

### Removed

- The translation key `consent_modal_secondary_btn`

## [0.2.2] - 2021-12-17

### Added

- The method `CookieConsentWrapper.on()` and an event `init`. The event is fired when the plugin initialization is completed or has been already completed. For example: `CookieConsentWrapper.on('init' function (wrapper) { /* do something*/ })`.

## [0.2.1] - 2021-12-17

### Fixed

- Fixed GTM template - the field `locale_detection_strategy` now contains an item `disabled` instead of "noSet" value because of problem with saving in a tag configuration.

## [0.2.0] - 2021-12-17

### Added

- The field `hide_from_bots` in GTM template.
- The field `locale_detection_strategy` in GTM template.
- The field `current_locale` in GTM template.
- The field `page_scripts` in GTM template.
- The field `script_selector` in GTM template.
- Sections `Locale detection` and `Page scripts` in README.
- Shortcut method `CookieConsentWrapper.allowedCategory()`.
- Dummy page script in the development demo.

### Fixed

- Text inside a modal trigger is translated with a locale that is resolved by the `cookieconsent` plugin.

## [0.1.3] - 2021-12-14

### Added

- The section `How to manage revisions` in README.
- The file `package-lock.json`.
- Ignore files for npm and git in the directory `~/dist`.

### Changed

- Updated cookieconsent package to the version `2.7.1`.
- Updated GTM template - options `cookie_expiration`, `revision` and `delay` must be converted into integers.
- Modified the `Development` section in README.
- Plugin `terser-webpack-plugin` is used in a production build instead of `uglifyjs-webpack-plugin`.

### Fixed

- Fixed usage of revisions.

## [0.1.2] - 2021-12-10

### Added

- The LICENSE.
- The README.

### Changed

- Updated cookieconsent package to the version `2.7.0`.
- Default translation files are now `json` files instead of standard `js` modules.
- Updated GTM template - removed help text from the field `consent_modal_position`.

## [0.1.1] - 2021-12-10

### Added

- The GTM template.

### Fixed

- Removed whitespaces and newlines from internal stylesheets.

## [0.1.0] - 2021-12-10

### Added

- The first version of the package has been released.

[unreleased]: https://github.com/68publishers/cookie-consent/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/68publishers/cookie-consent/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/68publishers/cookie-consent/compare/v0.4.8...v0.5.0
[0.4.8]: https://github.com/68publishers/cookie-consent/compare/v0.4.7...v0.4.8
[0.4.7]: https://github.com/68publishers/cookie-consent/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/68publishers/cookie-consent/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/68publishers/cookie-consent/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/68publishers/cookie-consent/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/68publishers/cookie-consent/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/68publishers/cookie-consent/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/68publishers/cookie-consent/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/68publishers/cookie-consent/compare/v0.3.8...v0.4.0
[0.3.8]: https://github.com/68publishers/cookie-consent/compare/v0.3.7...v0.3.8
[0.3.7]: https://github.com/68publishers/cookie-consent/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/68publishers/cookie-consent/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/68publishers/cookie-consent/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/68publishers/cookie-consent/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/68publishers/cookie-consent/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/68publishers/cookie-consent/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/68publishers/cookie-consent/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/68publishers/cookie-consent/compare/v0.2.7...v0.3.0
[0.2.7]: https://github.com/68publishers/cookie-consent/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/68publishers/cookie-consent/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/68publishers/cookie-consent/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/68publishers/cookie-consent/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/68publishers/cookie-consent/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/68publishers/cookie-consent/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/68publishers/cookie-consent/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/68publishers/cookie-consent/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/68publishers/cookie-consent/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/68publishers/cookie-consent/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/68publishers/cookie-consent/compare/v0.1...v0.1.1
[0.1.0]: https://github.com/68publishers/cookie-consent/commits/v0.1

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Default translations are now loaded also for locales that are consist of an `ISO 639-1` language code and an `ISO 3166-1` country code e.g. `en-US`.

## [0.3.2] - 2021-01-03

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

[unreleased]: https://github.com/68publishers/cookie-consent/compare/v0.3.2...main
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

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Shortcut method `CookieConsentWrapper.allowedCategor()`.
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

[unreleased]: https://github.com/68publishers/cookie-consent/compare/v0.2.1...main
[0.2.1]: https://github.com/68publishers/cookie-consent/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/68publishers/cookie-consent/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/68publishers/cookie-consent/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/68publishers/cookie-consent/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/68publishers/cookie-consent/compare/v0.1...v0.1.1
[0.1.0]: https://github.com/68publishers/cookie-consent/commits/v0.1

[![grunt ESLint](https://github.com/lunatech/safariCookieCleaner/actions/workflows/npm-grunt.yml/badge.svg)](https://github.com/lunatech/safariCookieCleaner/actions/workflows/npm-grunt.yml)
# Safari Cookie Cleaner
Safari Cookie Cleaner is a focused Safari extension and companion app for macOS and iOS. It removes cookies for the current site, clears only the current subdomain when you need a tighter reset, and can keep selected targets clean on a repeating schedule.

This project is a fork of [Cookie Editor](https://github.com/Moustachauve/cookie-editor), stripped down and rebuilt from scratch as a delete-only tool for Safari.

## What it does
- Delete cookies for the current site in one tap
- Delete only the current subdomain without broad parent-domain cleanup when possible
- Save recurring cleanup rules for either the site or the exact subdomain
- Run the same product idea on Safari for macOS, iPhone, and iPad

## Scope and limitations
Safari Cookie Cleaner does one thing: delete cookies. It is not a general-purpose cookie manager, and it is intentionally missing anything beyond that:
- Safari only — no Chrome, Firefox, or other browsers
- delete only — no cookie viewer, editor, or value inspector
- no import or export tools
- no DevTools panel
- no account, cloud sync, or telemetry of any kind

Scheduled cleanup works best on macOS. On iPhone and iPad, Safari may delay background runs until the system wakes the extension again.

## Availability
This app is not published on the App Store, TestFlight, or anywhere else. There is no download link. To use it, you build it yourself from source with your own Apple Developer account and signing certificate — see [Development](docs/development.md).

## Documentation
- [Documentation](https://lunatech.github.io/safariCookieCleaner/)

## Issues
To report a bug or suggest a change, [open an issue](https://github.com/lunatech/safariCookieCleaner/issues).

## License
Safari Cookie Cleaner is published under [GPL-3.0](LICENSE).

---
title: Safari Cookie Cleaner
---

# Safari Cookie Cleaner

Safari Cookie Cleaner is a focused Safari extension and companion app for macOS and iOS. It removes cookies for the current site, clears only the current subdomain when you need a tighter reset, and can keep selected targets clean on a repeating schedule.

It is a fork of [Cookie Editor](https://github.com/Moustachauve/cookie-editor), stripped down and rebuilt from scratch as a delete-only tool for Safari.

## What it does

- Delete cookies for the current site in one tap
- Delete only the current subdomain without broad parent-domain cleanup when possible
- Save recurring cleanup rules for either the site or the exact subdomain
- Run the same product idea on Safari for macOS, iPhone, and iPad

## What it deliberately doesn't do

Safari Cookie Cleaner does one thing: delete cookies. It's not a general-purpose cookie manager:

- Safari only — no Chrome, Firefox, or other browsers
- delete only — no cookie viewer, editor, or value inspector
- no import or export tools
- no DevTools panel
- no account, cloud sync, or telemetry of any kind

Scheduled cleanup works best on macOS. On iPhone and iPad, Safari may delay background runs until the system wakes the extension again.

## Getting the app

This app is not published on the App Store, TestFlight, or anywhere else. There is no download link. You build it yourself from source with your own Apple Developer account and signing certificate — see [Development](development.html).

## Learn more

- [Architecture](architecture.html) — how the extension and the native wrapper app fit together
- [Development](development.html) — build, run, and debug the extension locally
- [Publishing](publishing.html) — TestFlight and App Store release steps

## Cookies

- [How cookies work](how-cookies-work.html) — the Set-Cookie header, attributes, scope, and how to inspect the live cookie jar from the browser console
- [Evercookie tracking](evercookie.html) — how trackers respawn deleted cookies across multiple storage mechanisms, and documented real-world cases

## Source and issues

The source is on [GitHub](https://github.com/lunatech/safariCookieCleaner). To report a bug or suggest a change, [open an issue](https://github.com/lunatech/safariCookieCleaner/issues).

Safari Cookie Cleaner is published under [GPL-3.0](https://github.com/lunatech/safariCookieCleaner/blob/master/LICENSE).

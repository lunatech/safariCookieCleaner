---
title: Safari Cookie Cleaner
---

# Safari Cookie Cleaner

Safari Cookie Cleaner is a focused Safari extension and companion app for macOS and iOS. It removes cookies for the current site, clears only the current subdomain when you need a tighter reset, detects repeated values that can respawn deleted cookies, and can keep selected targets clean on a repeating schedule.

It is a fork of [Cookie Editor](https://github.com/Moustachauve/cookie-editor), stripped down and rebuilt from scratch as a delete-only tool for Safari.

## What it does

- Delete cookies for the current site in one tap
- Delete only the current subdomain without broad parent-domain cleanup when possible
- Detect repeated values across page storage and clear site cookies plus site data when a site is respawning identifiers
- Save recurring cleanup rules for either the site or the exact subdomain

## What it deliberately doesn't do

Safari Cookie Cleaner does one thing: clear site tracking state from Safari. It is not a general-purpose cookie manager:

- Safari only — no Chrome, Firefox, or other browsers
- focused cleanup, not a full cookie viewer or editor
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
- [Respawning cookies](respawning-cookies.html) — how Safari Cookie Cleaner detects repeated values and clears the storage that can write deleted cookies back
- [World famous cookies](world-famous-cookies.html) — recognizable cookies from Google, Cloudflare, and Yahoo, what they do, and what deletion changes

## Source and issues

The source is on [GitHub](https://github.com/lunatech/safariCookieCleaner). To report a bug or suggest a change, [open an issue](https://github.com/lunatech/safariCookieCleaner/issues).

Safari Cookie Cleaner is published under [GPL-3.0](https://github.com/lunatech/safariCookieCleaner/blob/master/LICENSE).

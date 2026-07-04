# How Safari Cookie Cleaner works on Safari

Safari does not let you install a WebExtension directly the way Chrome or Firefox do. Apple requires a Safari Web Extension to ship inside a native app for macOS and iOS. This repo keeps both pieces together.

## The moving parts

Safari Cookie Cleaner has two layers:

1. **The extension** — `interface/`, `cookie-editor.js`, and `manifest.safari.json`. This is the Safari-facing WebExtension code.
2. **The wrapper app** — `safari/Cookie-Editor/`. Xcode builds the macOS and iOS apps that carry the extension into the App Store.

Xcode target layout:

```text
safari/Cookie-Editor/
├── macOS (App)/
├── macOS (Extension)/
├── iOS (App)/
├── iOS (Extension)/
└── Shared (App)/
    ├── ViewController.swift
    └── Resources/ (Main.html, Script.js, Style.css)
```

## Product shape in the extension

The Safari build is now a delete-only product:

- `interface/popup/` contains the action popup for the current site and current subdomain.
- `interface/options/` contains rule management for recurring cleanup.
- `interface/core/` contains the non-UI extension logic that can be exercised from the CLI.
- `tests/core/` contains the CLI tests for cleanup scope, rule storage, and scheduler helpers.

The popup no longer exposes cookie editing, import/export, ads, or a DevTools workflow.

## The manifest

`manifest.safari.json` is a Manifest V3 file. The Safari build depends on these permissions:

- `cookies` for reading and removing cookie state
- `tabs` for the active-page context shown in the popup
- `storage` for saved rules and theme preference
- `alarms` for recurring cleanup on supported Safari runtimes
- optional host permissions for `<all_urls>` so the user can grant site access from the popup

The action popup is `interface/popup/cookie-list.html`, and the management page is `interface/options/options.html`.

## Background automation

`cookie-editor.js` is the Safari background service worker.

It does three jobs:

1. Switches the popup to `interface/popup-mobile/cookie-list.html` on iOS.
2. Watches `storage.local` for rule changes.
3. Maps each enabled rule to a Safari alarm and runs cleanup when the alarm fires.

Rule cadence presets are fixed to:

- 1 minute
- 15 minutes
- 1 hour
- 24 hours

When an alarm runs, the extension records `lastRunAt`, `lastRunStatus`, and the number of cookies removed so the management page can show the latest outcome.

## Scope handling

Two scopes matter throughout the product:

- **Site** — the registrable domain, such as `example.com`
- **Subdomain** — the exact hostname, such as `app.example.com`

Manual cleanup and scheduled cleanup use different selectors on purpose:

- **Delete current site** removes the cookies Safari would send to the active page right now.
- **Delete this subdomain only** removes only cookies scoped to the exact hostname, leaving broader parent-domain cookies in place when possible.
- **Scheduled site rules** clean the full saved site target, including its subdomains.

The helper logic for these decisions lives in `interface/core/urlScope.js` and `interface/core/cookieCleaner.js`.

## Building the Safari version

The Safari build pipeline is still handled by Grunt:

```text
json-replace:safari → clean:safari → copy:safari → replace:safari
```

Run it with:

```bash
./node_modules/.bin/grunt build-safari
```

That produces `build/safari/`, which Xcode embeds into the native wrapper app.

The core extension modules are intentionally separated from popup and options UI so you can run `npm run test:core` without involving Safari, Xcode, or any DOM-only UI code.

## The wrapper app

The native app exists to help the user enable the extension and understand the platform limits.

- `Shared (App)/Base.lproj/Main.html` is the onboarding screen shown in the wrapper app.
- `ViewController.swift` loads that page inside a `WKWebView`.
- On macOS, the app can jump the user into Safari’s extension settings.
- On iOS, the app explains how to enable the extension manually because Safari does not offer the same settings handoff.

The wrapper app also states the main limitation plainly: scheduled cleanup is strongest on macOS, while iOS may delay background runs until Safari wakes the extension again.

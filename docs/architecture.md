[Docs home](index.md) · [Development](development.md) · [Publishing](publishing.md)

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
- `tests/core/` contains the CLI tests for cleanup scope, rule storage, scheduler helpers, and evercookie detection.

The popup no longer exposes cookie editing, import/export, ads, or a DevTools workflow.

## The manifest

`manifest.safari.json` is a Manifest V3 file. The Safari build depends on these permissions:

- `cookies` for reading and removing cookie state
- `tabs` for the active-page context shown in the popup
- `storage` for saved rules and theme preference
- `alarms` for recurring cleanup on supported Safari runtimes
- `scripting` for injecting the evercookie storage scan into the active tab
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

## Evercookie detection

Deleting cookies alone doesn't stop a site from re-deriving the same tracking identifier out of `localStorage`, `IndexedDB`, the Cache API, or `window.name` — see [Evercookie tracking](evercookie.md) for how that respawning works. `interface/core/evercookieScanner.js` is the extension's detector for that pattern:

- `collectPageStorage()` is a self-contained function injected into the active tab via `chrome.scripting.executeScript` (the `scripting` permission above). It reads cookies, `localStorage`, `sessionStorage`, `window.name`, the `cookieStore` API, IndexedDB database names, and Cache API cache names from the page's own context — the same visibility a page's own script has, nothing more. IndexedDB and Cache API contents are not read because doing so safely requires knowing each site's schemas and response formats.
- `detectRespawnSignals()` cross-references the values collected from every store and flags any identifier (8+ characters) that shows up in more than one place. That duplication across independent stores is the respawn signature evercookie-style tracking leaves behind.
- `listPopulatedMechanisms()` summarizes which storage mechanisms hold any data at all, independent of whether a duplicate was found.
- `scanTabForEvercookies()` ties the above together for a given tab and degrades to an empty result if the `scripting` API isn't available.
- `clearPageStorage()` is the injected counterpart to `collectPageStorage()`: it clears `localStorage`, `sessionStorage`, `window.name`, `cookieStore`, IndexedDB databases, and Cache API caches for the page's origin. `clearPageStorageForTab()` injects it into a given tab the same way `scanTabForEvercookies()` does.

Like the cookie cleanup logic, the duplicate-detection, summarization, and orchestration functions are pure or dependency-injected and covered by `tests/core/evercookieScanner.test.mjs`, runnable via `npm run test:core` without Safari or a real DOM. The page-injected `collectPageStorage()` and `clearPageStorage()` functions themselves can only be exercised by loading the built extension in Safari.

The popup runs a scan each time it opens for a site the user has already granted host permission to (the same lifecycle as the cookie counts). There is no separate card for it: the result folds into the same panel as the Site/Subdomain rows, as a `#respawn-note` element that stays entirely hidden when nothing was found, unsupported, or the scan failed — silence is the default, since most sites have nothing to report. The one storage-mechanism-agnostic count that does reach the UI is phrased in plain language ("N respawning cookies found"), never a list of which stores held the duplicate; that detail stays in the pure detection functions and their tests.

When something is found, the note renders as a single collapsed, danger-colored disclosure row ("respawning cookie" was chosen over "zombie cookie" or "evercookie" as the more accurate metaphor — it recreates itself from a stored copy rather than rising from the dead). It always opens collapsed, per progressive-disclosure UI guidance: tapping it expands an explanation plus an opt-in checkbox, "Also clear respawning cookies for this subdomain," off by default. Checking it and tapping the **Subdomain** Clear button runs `clearPageStorageForTab()` against the current tab after the cookie removal completes. The checkbox only arms the Subdomain button, never Site — `clearPageStorageForTab()` reaches only the exact page's origin, which is what Subdomain scope matches; Site scope spans other subdomains too, so pairing the storage wipe with it would misstate what actually gets cleared. It's kept opt-in and separate from the default cookie-only delete because it's more disruptive: it can sign the user out or drop locally-saved app state, which the checkbox's helper text says explicitly.

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

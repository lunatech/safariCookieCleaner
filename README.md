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
This app is not published on the App Store, TestFlight, or anywhere else. There is no download link. To use it, you build it yourself from source with your own Apple Developer account and signing certificate — see the build instructions below.

## Build and deploy
### Local development
1. Install dependencies and build the Safari extension payload:

   ```bash
   npm install
   ./node_modules/.bin/grunt build-safari
   ```

2. Run the CLI tests for the non-UI extension core in `interface/core/`:

   ```bash
   npm run test:core
   ```

3. Configure your own Apple signing certificate. This project is not distributed by Apple, so the checked-in Xcode project has no usable signing identity for anyone but the original author: open `safari/Cookie-Editor/Cookie-Editor.xcodeproj` in Xcode, select each target (macOS App, macOS Extension, iOS App, iOS Extension), and under **Signing & Capabilities** set **Team** to your own Apple Developer account. `xcodebuild` will fail to sign the build until this is set.

4. Build the macOS app from the CLI:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (macOS)" \
     -configuration Debug \
     build
   ```

5. Build the iOS app from the CLI without depending on a simulator:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (iOS)" \
     -configuration Debug \
     -destination "generic/platform=iOS" \
     build
   ```

6. Re-run `./node_modules/.bin/grunt build-safari` after every extension change you want embedded in the native app.

### Install the local macOS build on this Mac
1. Build the extension payload and the macOS app (see steps above), then copy the built app into `/Applications`:

   ```bash
   ./node_modules/.bin/grunt build-safari
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (macOS)" \
     -configuration Debug \
     -derivedDataPath build/DerivedData-mac \
     build
   cp -R "build/DerivedData-mac/Build/Products/Debug/Safari Cookie Cleaner.app" "/Applications/Safari Cookie Cleaner.app"
   ```

2. Register and launch the installed app so Safari can see its embedded extension:

   ```bash
   /System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister -f "/Applications/Safari Cookie Cleaner.app"
   open "/Applications/Safari Cookie Cleaner.app"
   ```

3. In Safari, turn on the Develop menu: **Safari > Settings > Advanced** and check **Show features for web developers**.
4. A local debug build signed with your own Apple Development certificate is not notarized or distributed through the Mac App Store, so Safari treats it as unsigned. From the menu bar, choose **Develop > Allow Unsigned Extensions** and check it. This resets every time Safari restarts, so re-check it whenever the extension disappears after a relaunch.
5. Enable the extension: **Safari > Settings > Extensions**, turn on **Safari Cookie Cleaner**, then grant it access to the sites you want to test.
6. Open the extension's toolbar icon to load the popup, click **Delete current site**, **Delete this subdomain only**, or the auto-delete buttons to exercise the flows, and open **Manage automation** to reach the options page.

### View extension logs in Safari's console
All of the instrumentation added for debugging is plain `console.log`/`console.error` output tagged with a component prefix:
- `[SafariCookieCleaner][popup]` — popup lifecycle and every button click
- `[SafariCookieCleaner][cookieCleaner]` — every cookie fetch, filter, and removal, including the startup cookie probe
- `[SafariCookieCleaner][permissions]` — permission eligibility checks, requests, and results

`cookieCleaner.js` is imported directly by both the popup and the background script, so which console shows its logs depends on what triggered the action:
- Clicking **Delete current site**, **Delete this subdomain only**, or the auto-delete buttons in the popup runs entirely in the **popup's** own script — these never message the background service worker, so they will never show up under "Web Extension Background Content."
- The background service worker only wakes up for `runtime.onInstalled`/`onStartup` (logs `starting background script`) and for `alarms.onAlarm` firing on a saved automation rule's real cadence (which is what actually calls `deleteCookiesForRule` and produces `[cookieCleaner]` logs there). Until one of those happens, Safari's Develop menu will correctly show the background content as **"(not loaded)"** — that's not a bug, the worker is just idle.

To see these logs:
1. Confirm the Develop menu is enabled (see step 3 above).
2. **Manual button clicks and the startup cookie probe** (`[popup]`, `[cookieCleaner]`, `[permissions]` from the popup itself): click the Safari Cookie Cleaner toolbar icon to open the popup, then open the **Develop** menu and choose **Inspect Apps and Devices**. This opens a unified Web Inspector window listing every inspectable target; the popup shows up there as **"Extension Popup Page — cookie-list.html"**. Select it and use its **Console** tab. (The popup closes as soon as it loses focus, so open the popup again right before checking — the "thorondor"/device submenu and "Web Extension Background Content" submenu do **not** list the popup; only "Inspect Apps and Devices" does.)
3. **Scheduled/automation cleanup logs**: **Develop > Web Extension Background Content > Safari Cookie Cleaner**. This will show "(not loaded)" until a saved rule's alarm actually fires (or Safari restarts the extension) — save a rule with the shortest cadence and wait it out to see this fire for real.
4. **Options ("Manage automation") page logs**: open the page from the popup's **Manage automation** link, or by opening `Safari > Settings > Extensions > Safari Cookie Cleaner > Preferences…`. With that tab open, use **Develop > [page title]** to attach Web Inspector, then check its **Console** tab.
5. Reproduce the issue (for example, open the popup on a fresh tab) and watch the **popup's** console for the `Running startup cookie probe` / `Fetching cookies` / `Fetch complete` log lines to see whether Safari returned any cookies on the first request.

### Staging / TestFlight
1. Bump the extension version in `package.json`.
2. In Xcode, update `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` for the app and extension targets so the native app version matches the extension bundle version you are shipping.
3. Rebuild the Safari extension payload:

   ```bash
   ./node_modules/.bin/grunt build-safari
   ```

4. Archive the iOS app for TestFlight:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (iOS)" \
     -configuration Release \
     -destination "generic/platform=iOS" \
     -archivePath build/SafariCookieCleaner-iOS.xcarchive \
     archive
   ```

5. Archive the macOS app for TestFlight:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (macOS)" \
     -configuration Release \
     -destination "generic/platform=macOS" \
     -archivePath build/SafariCookieCleaner-macOS.xcarchive \
     archive
   ```

6. Upload each archive to App Store Connect from Organizer, then assign the processed builds to your internal or external TestFlight groups.

### Publish
1. After TestFlight signoff, archive fresh Release builds if needed with the same `xcodebuild ... archive` commands above.
2. Upload the approved macOS and iOS archives to App Store Connect.
3. Attach those builds to the app version you plan to ship.
4. Fill in release metadata, privacy details, screenshots, and review notes.
5. Submit the version for App Review.
6. Once Apple approves it, release it manually or use your preferred automatic release option in App Store Connect.

## Issues
To report a bug or suggest a change, [open an issue](https://github.com/lunatech/safariCookieCleaner/issues).

## License
Safari Cookie Cleaner is published under [GPL-3.0](LICENSE).

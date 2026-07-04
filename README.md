[![grunt ESLint](https://github.com/Moustachauve/cookie-editor/actions/workflows/npm-grunt.yml/badge.svg)](https://github.com/Moustachauve/cookie-editor/actions/workflows/npm-grunt.yml)
# Safari Cookie Cleaner
Safari Cookie Cleaner is a focused Safari extension and companion app for macOS and iOS. It removes cookies for the current site, clears only the current subdomain when you need a tighter reset, and can keep selected targets clean on a repeating schedule.

## What it does
- Delete cookies for the current site in one tap
- Delete only the current subdomain without broad parent-domain cleanup when possible
- Save recurring cleanup rules for either the site or the exact subdomain
- Run the same product idea on Safari for macOS, iPhone, and iPad

## Scope and limitations
Safari Cookie Cleaner is intentionally narrow:
- Safari only
- delete only
- no cookie editing
- no import or export tools
- no DevTools panel

Scheduled cleanup works best on macOS. On iPhone and iPad, Safari may delay background runs until the system wakes the extension again.

## Installation
Safari Cookie Cleaner is available for both macOS and iOS. It has been tested on Mac, iPhone, and iPad.

Find the app on the [App Store](https://apps.apple.com/app/apple-store/id6446215341?pt=126143671&ct=github&mt=8).
[![Apple App Store](readme/get-safari-mac.svg)](https://apps.apple.com/app/apple-store/id6446215341?pt=126143671&ct=github&mt=8)

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

3. Build the macOS app from the CLI:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (macOS)" \
     -configuration Debug \
     build
   ```

4. Build the iOS app from the CLI without depending on a simulator:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Safari Cookie Cleaner (iOS)" \
     -configuration Debug \
     -destination "generic/platform=iOS" \
     build
   ```

5. Re-run `./node_modules/.bin/grunt build-safari` after every extension change you want embedded in the native app.

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
4. Because a local debug build is signed with an Apple Development certificate instead of coming from the App Store, Safari treats it as unsigned. From the menu bar, choose **Develop > Allow Unsigned Extensions** and check it. This resets every time Safari restarts, so re-check it whenever the extension disappears after a relaunch.
5. Enable the extension: **Safari > Settings > Extensions**, turn on **Safari Cookie Cleaner**, then grant it access to the sites you want to test.
6. Open the extension's toolbar icon to load the popup, click **Delete current site**, **Delete this subdomain only**, or the auto-delete buttons to exercise the flows, and open **Manage automation** to reach the options page.

### View extension logs in Safari's console
All of the instrumentation added for debugging is plain `console.log`/`console.error` output tagged with a component prefix:
- `[SafariCookieCleaner][popup]` — popup lifecycle and every button click
- `[SafariCookieCleaner][cookieCleaner]` — every cookie fetch, filter, and removal, including the startup cookie probe
- `[SafariCookieCleaner][permissions]` — permission eligibility checks, requests, and results

To see these logs:
1. Confirm the Develop menu is enabled (see step 3 above).
2. **Background script logs** (`cookie-editor.js`, scheduled cleanup, alarms): **Develop > Web Extension Background Content > Safari Cookie Cleaner**. This opens a Web Inspector window with a **Console** tab attached to the background service worker.
3. **Popup logs**: click the Safari Cookie Cleaner toolbar icon to open the popup, then open the **Develop** menu again. The open popup shows up directly in that menu (listed by the extension's process, not under a submenu). Selecting it opens Web Inspector for the popup; use its **Console** tab. The popup closes as soon as it loses focus, so keep Web Inspector open before you click elsewhere.
4. **Options ("Manage automation") page logs**: open the page from the popup's **Manage automation** link, or by opening `Safari > Settings > Extensions > Safari Cookie Cleaner > Preferences…`. With that tab open, use **Develop > [page title]** to attach Web Inspector, then check its **Console** tab.
5. Reproduce the issue (for example, open the popup on a fresh tab) and watch the console for the `Running startup cookie probe` / `Fetching cookies` / `Fetch complete` log lines to see whether Safari returned any cookies on the first request.

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
To report a bug or suggest a change, [open an issue](https://github.com/Moustachauve/cookie-editor/issues).

## License
Safari Cookie Cleaner is published under [GPL-3.0](LICENSE).

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
The Xcode project and schemes still use the legacy names `Cookie-Editor (macOS)` and `Cookie-Editor (iOS)`. The shipped app name is Safari Cookie Cleaner, but those are the scheme names you need for `xcodebuild`.

### Local development
1. Install dependencies and build the Safari extension payload:

   ```bash
   npm install
   ./node_modules/.bin/grunt build-safari
   ```

2. Build the macOS app from the CLI:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Cookie-Editor (macOS)" \
     -configuration Debug \
     build
   ```

3. Build the iOS app from the CLI without depending on a simulator:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Cookie-Editor (iOS)" \
     -configuration Debug \
     -destination "generic/platform=iOS" \
     build
   ```

4. Re-run `./node_modules/.bin/grunt build-safari` after every extension change you want embedded in the native app.

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
     -scheme "Cookie-Editor (iOS)" \
     -configuration Release \
     -destination "generic/platform=iOS" \
     -archivePath build/SafariCookieCleaner-iOS.xcarchive \
     archive
   ```

5. Archive the macOS app for TestFlight:

   ```bash
   xcodebuild \
     -project safari/Cookie-Editor/Cookie-Editor.xcodeproj \
     -scheme "Cookie-Editor (macOS)" \
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

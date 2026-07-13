[Docs home]({% link index.md %}) · [Contributing]({% link contributing.md %})

# Publishing

This app is not published on the App Store, TestFlight, or anywhere else today. These are the steps for taking a local build through TestFlight and, eventually, App Review, if you're maintaining your own signed release.

## On this page

* TOC
{:toc}

## Staging / TestFlight

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

## Publish

1. After TestFlight signoff, archive fresh Release builds if needed with the same `xcodebuild ... archive` commands above.
2. Upload the approved macOS and iOS archives to App Store Connect.
3. Attach those builds to the app version you plan to ship.
4. Fill in release metadata, privacy details, screenshots, and review notes.
5. Submit the version for App Review.
6. Once Apple approves it, release it manually or use your preferred automatic release option in App Store Connect.

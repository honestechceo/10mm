# Where's My 10MM?! — TestFlight preparation (no Mac required)

This branch prepares the existing HTML game for iOS with Capacitor and a Codemagic cloud Mac. It does **not** upload or publish the game by itself.

## First: merge and build

1. Merge this PR into main.
2. Create a Codemagic account at https://codemagic.io and connect the GitHub repository `honestechceo/10mm`.
3. In Apple Developer / App Store Connect, reserve the app's bundle identifier `com.honestech.wheresmy10mm` (change it in both configuration files if unavailable).
4. In App Store Connect, create an app record for the iOS app using that exact bundle ID.
5. In App Store Connect → Users and Access → Integrations → App Store Connect API, generate a **dedicated** key for Codemagic with the required permissions. Download its private .p8 file once; keep it private. Do not commit keys, certificates, passwords, or provisioning profiles to GitHub.
6. In Codemagic → Team integrations → Developer Portal, add the API key with its Issuer ID and Key ID. Configure **automatic iOS signing** for the bundle ID.
7. Run the `ios-testflight` workflow. Check the build logs and IPA artifact. Cloud build and signing must succeed before any TestFlight upload.
8. After a signed build works, configure Codemagic App Store Connect publishing, then upload the IPA. Apple will process it before TestFlight availability.

## Before external testers

- Replace temporary app icon and launch screen with final artwork.
- Confirm every game asset is in the repository (the web packager copies root-level web assets into `www`).
- Test touch controls, audio, rotation/orientation, level persistence, restart and scoring on a real iPhone.
- Provide the privacy details, age rating, description and other required App Store Connect metadata.
- Apple's external TestFlight testing may require Beta App Review.

## Important

- `capacitor.config.json` uses a **proposed** bundle ID, not an Apple-reserved ID.
- The cloud workflow has not been executed or validated with your Apple account.
- No private Apple keys belong in GitHub.
- The first build may need adjustments for Xcode / Codemagic versions and app icons.

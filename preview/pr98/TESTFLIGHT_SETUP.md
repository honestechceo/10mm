# Where's My 10MM?! — TestFlight

The iPhone app builds on **GitHub's Macs** with `.github/workflows/ios.yml`, the same setup as the PPI-App repo. No Codemagic, no Mac needed.

## One-time setup

1. **App record**: in App Store Connect (https://appstoreconnect.apple.com/apps), click **+** → New App → iOS. Name it "Where's My 10MM?!", choose bundle ID `com.honestech.wheresmy10mm`, and enter any SKU (e.g. `10mm-001`).
   If that bundle ID isn't in the list yet, run the workflow once first. The first signed run registers the ID automatically, and the run fails at the upload step because the app record doesn't exist yet. Then create the app record and run the workflow again.
2. **Secrets**: in this repo, go to Settings → Secrets and variables → Actions → New repository secret. Add the **same four values you used in PPI-App**:
   - `APPLE_TEAM_ID`
   - `ASC_KEY_ID`
   - `ASC_ISSUER_ID`
   - `ASC_KEY_P8` (the full text of the AuthKey .p8 file)

   Using the same key matters: it lets this build reuse PPI-App's App Store certificate instead of making a new one.
3. **Run it**: Actions → **iPhone app** → Run workflow. After that, every push to `main` that changes the game builds and uploads automatically.

## What every build does

- Generates the Xcode project and sets the app ID, version, and build number (`100 + run number`, so it's always new)
- Makes it iPhone only, portrait only, full screen, with no status bar and the home-screen name "10MM?!"
- Sets `ITSAppUsesNonExemptEncryption = NO`, so there's no "Missing Compliance" prompt
- Uses `assets/icon-only.png` for the app icon and `assets/splash.png` for the launch screen
- Signs with the shared certificate and a "10MM App Store (GitHub)" profile, then uploads to TestFlight

Pull requests only run an unsigned simulator build, to check that the app compiles.

Change `APP_VERSION` in the workflow when you want a new version number.

## After the first upload

- The build appears in App Store Connect → TestFlight after Apple processes it (about 5–20 minutes).
- Internal testers can install it right away. External testers need Beta App Review.
- App Privacy: choose "Data Not Collected". Progress is saved only on the phone.

## Test on a real iPhone

- [ ] The icon and launch screen look right
- [ ] Jump responds instantly, and long-pressing doesn't select text or zoom
- [ ] Sound and music play when the Silent switch is off, and the Settings toggles work
- [ ] The phone vibrates on jump, crash, and level complete
- [ ] Swiping home mid-level pauses the game, and RESUME continues it
- [ ] Level select, Reset progress, Difficulty, and the One-button layout all work
- [ ] Progress survives force-quitting the app
- [ ] Nothing is hidden under the notch or the home bar

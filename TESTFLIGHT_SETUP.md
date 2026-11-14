# Where's My 10MM?! — TestFlight checklist (no Mac needed)

The game ships as an iOS app via Capacitor, built on a Codemagic cloud Mac. Each push of the `ios-testflight` workflow builds, signs, and uploads to TestFlight.

## One-time setup

1. **Apple Developer Program** — paid membership ($99/yr) on your Apple ID.
2. **Bundle ID** — developer.apple.com → Certificates, IDs & Profiles → Identifiers → **+** → App IDs → `com.honestech.wheresmy10mm`. (If you use a different ID, change it in `capacitor.config.json` and both places in `codemagic.yaml`.)
3. **App record** — App Store Connect → Apps → **+** → New App → iOS, name "Where's My 10MM?!", pick that bundle ID, SKU anything (e.g. `10mm-001`).
4. **API key** — App Store Connect → Users and Access → Integrations → App Store Connect API → **+**, role **App Manager**. Download the `.p8` (only downloadable once). Note the Issuer ID and Key ID. Never put the `.p8` in GitHub.
5. **Codemagic** — sign in at codemagic.io with GitHub, add the `honestechceo/10mm` repo.
6. **Codemagic key** — Team settings → Team integrations → Developer Portal → Manage keys → add the key. **Name it `codemagic`** (the yaml looks it up by that name). Paste the Issuer ID and Key ID, and upload the `.p8`.
7. Start the **ios-testflight** workflow on `main`.

## What every build does automatically

- Generates the app icon and launch screen from `assets/`
- Locks the app to portrait, hides the status bar
- Sets `ITSAppUsesNonExemptEncryption = NO` (no export-compliance prompt)
- Sets version `1.0.0` with a new build number every run (`BUILD_NUMBER + 100`)
- Signs with automatic App Store signing and uploads to TestFlight

Bump `APP_VERSION` in `codemagic.yaml` when you want a new version number (1.0.1, 1.1.0…).

## After the first upload

- Apple processes the build for about 10–30 minutes. Then it appears under the app → TestFlight.
- **Internal testers** (up to 100 people on your App Store Connect team) can install right away.
- **External testers** (anyone with an email or public link) need a quick Beta App Review. Fill in TestFlight → Test Information first: beta description, feedback email, contact info.
- **App Privacy**: the game collects nothing (progress is stored only on the phone). Answer "Data Not Collected."

## Test on a real iPhone

- [ ] Icon and launch screen look right
- [ ] Jump buttons respond instantly, no text-select or zoom on long-press
- [ ] Sound effects and music play with the Silent switch off; Settings toggles work
- [ ] Vibration fires on jump, crash, and level complete
- [ ] Swiping home mid-level pauses the game; RESUME continues it
- [ ] Level select, Reset progress, Difficulty, and the One-big-button layout all work
- [ ] Progress survives force-quitting the app
- [ ] Nothing hides under the notch or the home bar

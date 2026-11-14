# Ads and Remove Ads ($1.99)

The game is free with ads, and players can pay $1.99 once to remove them. This only runs in the iPhone app; the website has no ads.

## How it works in the game
- **After a crash**, players can tap **WATCH AD: KEEP GOING**. They watch a rewarded video and continue with a 3-second shield, once per attempt.
- **Full-screen ad**: about every 3rd crash, when the player taps TRY AGAIN. It never shows twice within 60 seconds, and never before level 4.
- **No banners.**
- **Remove Ads** turns off the full-screen ads. The optional "keep going" ad stays available because players choose it.
- **Settings** has Remove ads (shows the store price), Restore purchase (Apple requires this), and Ad privacy (Google's consent choices).
- **On first launch** the app shows Google's consent form where the law requires it (EU/UK), then Apple's "Allow tracking?" prompt.

All the numbers are in `ads-config.json`.

## Right now: test mode
`ads-config.json` ships with **Google's test IDs** and `"testMode": true`, so TestFlight builds show "Test Ad" banners. They're safe to tap, and no AdMob account is needed yet.

## Before the App Store release

### 1. AdMob (Google)
1. Sign up at https://admob.google.com and add an **iOS app** called "Where's My 10MM?!".
2. Create two ad units: **Interstitial** and **Rewarded**.
3. Copy the **App ID** (`ca-app-pub-…~…`) and both **ad unit IDs** (`ca-app-pub-…/…`) into `ads-config.json`.
4. In AdMob → Privacy & messaging, create and publish a **GDPR message** and an **IDFA explainer** for the app.
5. Leave `"testMode": true` for TestFlight. Set it to `false` only for the App Store build. Never tap your own real ads.

### 2. App Store Connect: the $1.99 purchase
1. Go to **Business**: sign the **Paid Apps agreement** and add your bank and tax info. Purchases can't work without this.
2. Go to your app → **Monetization → In-App Purchases → +**:
   - Type: **Non-Consumable**
   - Product ID: `com.honestech.wheresmy10mm.removeads` (must match `ads-config.json` exactly)
   - Price: $1.99. Add a display name ("Remove Ads"), a description, and a review screenshot of the Settings screen.
3. Join the **App Store Small Business Program** (15% commission instead of 30%): https://developer.apple.com/app-store/small-business-program/
4. To test in TestFlight, add a **Sandbox tester** in Users and Access → Sandbox. Sandbox purchases aren't charged.

### 3. App Privacy (App Store Connect)
"Data Not Collected" is no longer true once ads are on. Declare what the Google Mobile Ads SDK collects (device ID / advertising data, used for third-party advertising, and tracking if the user allows it). Google publishes the exact answers for its SDK in the AdMob help center.

### 4. App Review notes
Mention that the app contains ads, a "Remove Ads" in-app purchase, and a Restore button in Settings.

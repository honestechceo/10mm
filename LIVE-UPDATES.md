# Live updates (no App Store review)

The iPhone app can update the game's **web files** (game code, levels, art, sounds, text) by itself.

## How it works
1. Every merge to `main` that touches the game runs the **Live update** workflow. It zips `www/` and
   publishes it as a GitHub Release (`live-<time>`, with `bundle.zip` and `live.json`). Only the last 5 are kept.
2. In the app, `live.js` checks `releases/latest/download/live.json` a few seconds after launch and when the
   app comes back to the front (at most every 10 minutes).
3. If it's newer and built for the same native app, the phone downloads it in the background and switches to it
   the **next time the game restarts**.
4. Once the game loads, it tells the updater the version works. If a bad update never gets that far, the phone
   **rolls back** to the last working version automatically.

## What still needs an App Store update
Anything native: new or updated Capacitor plugins (`package.json`), Swift code in `ci/native/`, or
`capacitor.config.json`. Those change the app's *native fingerprint* (`scripts/live-version.mjs`), and phones only
take live updates with their own fingerprint, so older App Store builds keep running safely until players update.
The App Store version (`APP_VERSION` in `ios.yml`) is part of the fingerprint from 1.5 on, so bumping it for a
new release also stops that release's web code from reaching phones still on the older version.
Also send big new features and new in-app purchases through review (Apple's rule: live updates can't change what the app is).

When installing a new App Store version, the phone starts fresh from that version (`resetWhenUpdate`).

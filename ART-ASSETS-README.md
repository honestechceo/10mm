# Art assets (V11.0)

| File | Used for |
|---|---|
| `garage-art-1/2/3.jpg` | Scrolling garage backgrounds. Brand badges (Ford oval, Chevy bowtie, Jeep script) were painted out for App Store trademark safety. |
| `car-*.webp` | Finish-line sedans (5 colors). Grille badge painted out. |
| `tool-*.webp` | Obstacle sprites. Cleaned of the grey "ghost box" halos and rotated to lie flat; obstacle hitboxes in `TOOL_SIZE` (index.html) match these proportions. |
| `obstacle-*.svg`, `finish-car-detail-*.svg` | Fallbacks if a raster sprite fails to load. |
| `socket-character-v2.svg` | Hero socket (in game, title screen, app icon). |
| `assets/icon-only.png` | 1024×1024 App Store icon, "MISSING 10MM" poster (no transparency). |
| `assets/splash.png`, `assets/splash-dark.png` | 2732×2732 launch screen. |

`assets/` is turned into the iOS icon set and launch screen by `npx capacitor-assets generate --ios` during the Codemagic build. To change the icon, replace `assets/icon-only.png` with another 1024×1024 PNG without transparency.

Still worth a look before the App Store: the red SUV in the backgrounds keeps its 7-slot grille shape, and the finish sedans are clearly modeled on one real car. The badges are gone, but fully original vehicle art is the safest choice before public release.

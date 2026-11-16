# Version 1.1 — App Store Connect setup

Everything below must match these IDs exactly. The game already uses them.

## 1. Game Center

App Store Connect → your app → **Services** (or **Features**) → **Game Center**. On the **1.1 version page**, scroll to **Game Center**, turn it on, and add the leaderboards and achievements below to the version.

### Leaderboards (Classic, "High score is best", Integer)

| Reference name | Leaderboard ID | Display name | Score format |
|---|---|---|---|
| Highest Level | `wm10_best_level` | Highest Level | Integer (e.g. "47") |
| Endless Distance | `wm10_endless_distance` | Endless Distance | Integer, suffix " m" |
| Total Stars | `wm10_total_stars` | Total Stars | Integer, suffix " stars" |

Sort: High to low. Score range: 0 to 100000.

### Achievements (image files are in `store/gamecenter/`)

| Achievement ID | Name | Points | Description (earned) | Image |
|---|---|---|---|---|
| `wm10_first_escape` | First Escape | 10 | Beat level 1. | ach_first_escape.png |
| `wm10_level_25` | Garage Graduate | 25 | Escape the Garage: beat level 25. | ach_level_25.png |
| `wm10_level_100` | Halfway Home | 50 | Beat level 100. | ach_level_100.png |
| `wm10_level_200` | Never Found | 100 | Reach level 200. | ach_level_200.png |
| `wm10_boss_1` | Big 12 Beaten | 25 | Beat your first boss level. | ach_boss_1.png |
| `wm10_bonus_5` | Sharp Eye | 25 | Win 5 bonus rounds. | ach_bonus_5.png |
| `wm10_daily_first` | Daily Driver | 10 | Beat a Daily Challenge. | ach_daily_first.png |
| `wm10_daily_streak_7` | Daily Champ | 50 | Beat the Daily Challenge 7 days in a row. | ach_daily_streak_7.png |
| `wm10_endless_1000` | Afterburner | 50 | Run 1000 m in Endless mode. | ach_endless_1000.png |
| `wm10_stars_100` | Star Mechanic | 50 | Earn 100 stars. | ach_stars_100.png |

For every achievement: Hidden = No, Achievable more than once = No. The "Pre-earned description" can be the same text.

## 2. Coin packs (In-App Purchases → Consumable)

| Reference name | Product ID | Price | Display name | Description |
|---|---|---|---|---|
| 500 Coins | `com.honestech.wheresmy10mm.coins500` | $0.99 | 500 Coins | 500 coins for socket finishes and upgrades. |
| 1,500 Coins | `com.honestech.wheresmy10mm.coins1500` | $1.99 | 1,500 Coins | 1,500 coins for socket finishes and upgrades. |
| 5,000 Coins | `com.honestech.wheresmy10mm.coins5000` | $4.99 | 5,000 Coins | 5,000 coins for socket finishes and upgrades. |

Each needs a review screenshot (use a screenshot of the Socket Shop) and must be added to the 1.1 version under **In-App Purchases** when you submit.

## 3. Before submitting 1.1

- Tell Claude to switch ads back to live (`testMode: false`).
- Update the App Privacy answers only if asked (no new data types).
- New screenshots are optional.

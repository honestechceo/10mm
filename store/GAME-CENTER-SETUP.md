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
| 400 Coins | `com.honestech.wheresmy10mm.coins.small` | $0.99 | 400 Coins | 400 coins for socket finishes and upgrades. |
| 1,000 Coins | `com.honestech.wheresmy10mm.coins.medium` | $1.99 | 1,000 Coins | 1,000 coins for socket finishes and upgrades. |
| 3,000 Coins | `com.honestech.wheresmy10mm.coins.large` | $4.99 | 3,000 Coins | 3,000 coins for socket finishes and upgrades. |

Each needs a review screenshot (use a screenshot of the Socket Shop) and must be added to the 1.1 version under **In-App Purchases** when you submit.

## 3. Before submitting 1.1

- Tell Claude to switch ads back to live (`testMode: false`).
- Update the App Privacy answers only if asked (no new data types).
- New screenshots are optional.

## Version 1.5: Lost Toolbox achievements and leaderboards

Add these in App Store Connect → Services → Game Center, then add them to the **1.5 version page** (Game Center section) when you submit. For every achievement: Hidden = No, Achievable more than once = No. All 22 achievements together add up to 690 points (Apple's cap is 1,000).

### Leaderboards (Classic)

| Reference name | Leaderboard ID | Display name | Score format | Sort |
|---|---|---|---|---|
| LT Stars | `wm10_lt_stars` | Lost Toolbox Stars | Integer, suffix "star / stars" | High to low |
| LT Drawers | `wm10_lt_drawers` | Drawers Cleared | Integer, suffix "drawer / drawers" | High to low |
| LT Golden Run | `wm10_lt_golden_time` | Fastest Golden Drawer | Elapsed time, to the hundredth of a second | Low to high |

### Achievements (images in `store/gamecenter/`, made by `scripts/lt_badges.py`)

| Achievement ID | Title | Points | Pre-earned | Earned | Image |
|---|---|---|---|---|---|
| `wm10_lt_first_drawer` | Out of the Toolbox | 10 | Clear your first Lost Toolbox drawer. | You cleared your first Lost Toolbox drawer. | ach_lt_first_drawer.png |
| `wm10_lt_golden` | Golden Socket | 25 | Clear the first 5 drawers to win the Golden 10MM. | You won the Golden 10MM. | ach_lt_golden.png |
| `wm10_lt_drawers_25` | Deep Drawers | 25 | Clear 25 Lost Toolbox drawers. | You cleared 25 Lost Toolbox drawers. | ach_lt_drawers_25.png |
| `wm10_lt_drawers_50` | The Grand Chest | 50 | Clear all 50 Lost Toolbox drawers. | You cleared every drawer in the Lost Toolbox. | ach_lt_drawers_50.png |
| `wm10_lt_hideout_1` | Gang Buster | 15 | Find and clear a hidden hideout. | You cleared a hidden hideout. | ach_lt_hideout_1.png |
| `wm10_lt_hideouts_all` | Crew Disbanded | 40 | Clear all 5 hideouts. | You took down the whole bad-guy crew. | ach_lt_hideouts_all.png |
| `wm10_lt_stars_50` | Star Collector | 20 | Find 50 stars in the Lost Toolbox. | You found 50 stars. | ach_lt_stars_50.png |
| `wm10_lt_stars_250` | Every Last Star | 50 | Find all 250 stars in the Lost Toolbox. | You found every star. | ach_lt_stars_250.png |
| `wm10_lt_secret_room` | Secret Stash | 10 | Find a secret room behind a blue toolbox. | You found a secret room. | ach_lt_secret_room.png |
| `wm10_lt_mech` | Mech Mode | 20 | Beat a boss while riding the Ratchet Mech. | You beat a boss in the Ratchet Mech. | ach_lt_mech.png |
| `wm10_lt_maker` | Level Maker | 15 | Make your own level and beat it. | You made a level and beat it. | ach_lt_maker.png |
| `wm10_lt_friend` | Friend's Challenge | 15 | Beat a level a friend shared with you. | You beat a friend's level. | ach_lt_friend.png |

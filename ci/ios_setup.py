#!/usr/bin/env python3
"""Finishes the iPhone project that `npx cap add ios` generates on the build Mac.

Usage: python3 ci/ios_setup.py BUNDLE_ID APP_VERSION BUILD_NUMBER

- app ID, version and build number, iPhone only
- Info.plist: home-screen name, portrait only, full screen, no status bar,
  no export-compliance question (ITSAppUsesNonExemptEncryption = NO)
- app icon from assets/icon-only.png, launch screen from assets/splash.png
"""
import json, pathlib, plistlib, re, shutil, subprocess, sys

BUNDLE, VERSION, BUILD = sys.argv[1], sys.argv[2], sys.argv[3]
ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "ios/App/App"
PBX = ROOT / "ios/App/App.xcodeproj/project.pbxproj"

# --- Xcode project: the App target's Debug and Release settings
s = PBX.read_text()
blocks = [b for b in re.findall(r"buildSettings = \{[^{}]*\}", s) if "INFOPLIST_FILE = App/Info.plist;" in b]
assert len(blocks) == 2, f"expected the App target's 2 build configurations, found {len(blocks)}"
for b in blocks:
    nb = b
    for key, val in [("PRODUCT_BUNDLE_IDENTIFIER", BUNDLE), ("MARKETING_VERSION", VERSION),
                     ("CURRENT_PROJECT_VERSION", BUILD), ("TARGETED_DEVICE_FAMILY", "1")]:
        if re.search(rf"\b{key} = ", nb):
            nb = re.sub(rf"\b{key} = [^;]*;", f"{key} = {val};", nb)
        else:
            nb = nb.replace("buildSettings = {", f"buildSettings = {{\n\t\t\t\t{key} = {val};", 1)
    s = s.replace(b, nb)
PBX.write_text(s)

# --- Info.plist
plist_path = APP / "Info.plist"
with open(plist_path, "rb") as f:
    p = plistlib.load(f)
p["CFBundleDisplayName"] = "10MM?!"
p["CFBundleShortVersionString"] = "$(MARKETING_VERSION)"
p["CFBundleVersion"] = "$(CURRENT_PROJECT_VERSION)"
p["ITSAppUsesNonExemptEncryption"] = False
p["UISupportedInterfaceOrientations"] = ["UIInterfaceOrientationPortrait"]
p["UISupportedInterfaceOrientations~ipad"] = ["UIInterfaceOrientationPortrait"]
p["UIRequiresFullScreen"] = True
p["UIStatusBarHidden"] = True
p["UIViewControllerBasedStatusBarAppearance"] = False
# ads (AdMob): app ID, Apple's tracking prompt text, Google's ad network ID
ads = json.loads((ROOT / "ads-config.json").read_text())
p["GADApplicationIdentifier"] = ads["admobAppId"]
p["NSUserTrackingUsageDescription"] = "This lets the free version show ads that are more relevant to you."
p["SKAdNetworkItems"] = [{"SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork"}]
with open(plist_path, "wb") as f:
    plistlib.dump(p, f)


# --- icon and launch screen (macOS `sips` resizes when a slot isn't the source size)
def fill(set_dir: pathlib.Path, src: pathlib.Path):
    meta = json.loads((set_dir / "Contents.json").read_text())
    n = 0
    for img in meta.get("images", []):
        name = img.get("filename")
        if not name:
            continue
        out = set_dir / name
        shutil.copyfile(src, out)
        size = img.get("size")
        if size and "x" in size and size != "1024x1024":
            px = round(float(size.split("x")[0]) * float(img.get("scale", "1x").rstrip("x")))
            subprocess.run(["sips", "-z", str(px), str(px), str(out)], check=True, capture_output=True)
        n += 1
    assert n, f"no image slots in {set_dir}"
    print(f"{set_dir.name}: {n} image(s) from {src.name}")


fill(APP / "Assets.xcassets/AppIcon.appiconset", ROOT / "assets/icon-only.png")
fill(APP / "Assets.xcassets/Splash.imageset", ROOT / "assets/splash.png")
print(f"iOS project ready: {BUNDLE} version {VERSION} ({BUILD})")

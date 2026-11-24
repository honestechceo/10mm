# Makes the Lost Toolbox Game Center achievement images (1024x1024 PNG) from the game's own art,
# in the same style as the other badges in store/gamecenter. Run from the repo root.
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
S = 1024
BADGES = [  # id, label, disc color, art list [(file, scale, dx, dy, flip)]
    ("lt_first_drawer", "FIRST DRAWER", "#c4302b", [("lt/drawer3.webp", .5, 0, 0, 0)]),
    ("lt_golden", "GOLDEN SOCKET", "#5b2a86", [("socket-golden10.webp", .95, 0, 10, 0)]),
    ("lt_drawers_25", "DEEP DRAWERS", "#1f5fa8", [("lt/drawer2.webp", .5, -120, 40, 0), ("lt/u-idle_01.webp", .42, 150, 30, 0)]),
    ("lt_drawers_50", "GRAND CHEST", "#1f7a3a", [("lt/chest-gold.webp", .54, 0, 0, 0)]),
    ("lt_hideout_1", "GANG BUSTER", "#7a1d1d", [("lt/en-sbolt0.webp", .58, 0, 0, 0)]),
    ("lt_hideouts_all", "CREW DISBANDED", "#4b2a7a", [("lt/en-sbolt0.webp", .4, -200, 20, 0), ("lt/en-rwrench0.webp", .44, -70, 0, 0), ("lt/en-ninja0.webp", .38, 70, 30, 1), ("lt/en-igun0.webp", .42, 200, 10, 1)]),
    ("lt_stars_50", "STAR COLLECTOR", "#14608f", [("lt/star.webp", .3, -150, 60, 0), ("lt/star.webp", .46, 0, -10, 0), ("lt/star.webp", .3, 150, 60, 0)]),
    ("lt_stars_250", "EVERY LAST STAR", "#b8860b", [("lt/star.webp", .56, 0, 0, 0)]),
    ("lt_secret_room", "SECRET STASH", "#0f6e6e", [("lt/warp.webp", .42, -90, 10, 0), ("lt/chest-gold.webp", .34, 140, 50, 0)]),
    ("lt_mech", "MECH MODE", "#b3541e", [("lt/mech-idle1.webp", .9, 0, 10, 0)]),
    ("lt_maker", "LEVEL MAKER", "#2a6f2a", [("lt/qblock.webp", .22, -180, -120, 0), ("lt/qblock.webp", .22, -60, -120, 0), ("lt/u-victory.webp", .58, 110, 40, 0)]),
    ("lt_friend", "FRIEND'S CHALLENGE", "#0f5e7a", [("lt/u-victory.webp", .6, -110, 10, 0), ("lt/u-victory.webp", .6, 110, 10, 1)]),
]
def badge(label, color, arts):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((24, 24, S - 24, S - 24), fill="#ffcb43")
    d.ellipse((58, 58, S - 58, S - 58), fill=color)
    d.ellipse((92, 92, S - 92, S - 92), outline="white", width=6)
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for f, sc, dx, dy, flip in arts:
        a = Image.open(f).convert("RGBA")
        k = (S * sc) / max(a.size); a = a.resize((max(1, int(a.width * k)), max(1, int(a.height * k))), Image.LANCZOS)
        if flip: a = a.transpose(Image.FLIP_LEFT_RIGHT)
        x, y = S // 2 - a.width // 2 + dx, S // 2 - a.height // 2 - 40 + dy
        sh = Image.new("RGBA", a.size, (0, 0, 0, 0)); sh.putalpha(a.getchannel("A").point(lambda v: v * 0.45))
        layer.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)), (x + 8, y + 14))
        layer.alpha_composite(a, (x, y))
    im.alpha_composite(layer)
    size = 78
    while True:
        fnt = ImageFont.truetype(FONT, size); w = d.textlength(label, font=fnt)
        if w <= 640 or size <= 46: break
        size -= 4
    d.text((S // 2, 810), label, font=fnt, fill="white", anchor="mm", stroke_width=9, stroke_fill="#121a24")
    return im
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "store/gamecenter"
    for i, lab, col, arts in BADGES:
        badge(lab, col, arts).save(f"{out}/ach_{i}.png"); print("made", i)

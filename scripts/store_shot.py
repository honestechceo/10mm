# Frames a phone capture like the other App Store screenshots in store/: navy gradient, yellow title,
# white subtitle, capture in a rounded yellow frame. Makes the 6.9" (1320x2868) and 6.3" (1206x2622) sizes.
# Usage: python3 scripts/store_shot.py capture.png "TITLE" "Subtitle" store/iphone-6.9-7.jpg store/iphone-6.3-7.jpg
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps
FONT = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
def make(cap, title, sub, W, H):
    k = W / 1320
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):
        f = y / H; d.line([(0, y), (W, y)], fill=(int(16 + 19 * f), int(46 + 9 * f), int(82 - 39 * f)))
    def fit(text, size, maxw):
        while size > 20:
            fnt = ImageFont.truetype(FONT, size)
            if d.textlength(text, font=fnt) <= maxw: return fnt
            size -= 2
        return ImageFont.truetype(FONT, size)
    d.text((W / 2, 305 * k), title, font=fit(title, int(132 * k), 1190 * k), fill=(251, 203, 67), anchor="mm")
    d.text((W / 2, 483 * k), sub, font=fit(sub, int(62 * k), 1210 * k), fill="white", anchor="mm")
    x0, y0, x1, y1, bw, r = int(78 * k), int(702 * k), int(1242 * k), int(2840 * k), max(6, int(9 * k)), int(60 * k)
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=(255, 203, 63))
    iw, ih = x1 - x0 - 2 * bw, y1 - y0 - 2 * bw
    shot = ImageOps.fit(cap.convert("RGB"), (iw, ih), Image.LANCZOS, centering=(0.5, 0))
    m = Image.new("L", (iw, ih), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, iw - 1, ih - 1), radius=r - bw, fill=255)
    im.paste(shot, (x0 + bw, y0 + bw), m)
    return im
if __name__ == "__main__":
    cap = Image.open(sys.argv[1]); title, sub = sys.argv[2], sys.argv[3]
    make(cap, title, sub, 1320, 2868).save(sys.argv[4], quality=92)
    make(cap, title, sub, 1206, 2622).save(sys.argv[5], quality=92)

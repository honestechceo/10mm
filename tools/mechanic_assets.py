"""Build the HONESTECH Mechanic's Lost Toolbox assets from his HONESTECH Arena (MUGEN) files.

usage: python3 tools/mechanic_assets.py <dir with HonestechMechanic.sff, Mechanic.air, Mechanic.snd>
writes lt/hm-atlas.webp, lt/hm-s*.m4a and lt-mech-data.js
"""
import json, os, re, struct, subprocess, sys, tempfile
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..")

def read_sff(path):
    d = open(path, "rb").read()
    nimages, first = struct.unpack("<I", d[20:24])[0], struct.unpack("<I", d[24:28])[0]
    off, out = first, []
    for i in range(nimages):
        nxt, ln, ax, ay, grp, img, link, same = struct.unpack("<IIhhHHHB", d[off:off + 19])
        out.append(dict(i=i, g=grp, n=img, ax=ax, ay=ay, link=link, same=same, data=d[off + 32:off + 32 + ln]))
        off = nxt
        if not off: break
    return out

def pcx(data):
    xmin, ymin, xmax, ymax = struct.unpack("<HHHH", data[4:12]); bpl = struct.unpack("<H", data[66:68])[0]
    w, h = xmax - xmin + 1, ymax - ymin + 1
    out, p, need = bytearray(), 128, bpl * h
    while len(out) < need and p < len(data):
        b = data[p]; p += 1
        if b >= 0xC0: out += bytes([data[p]]) * (b & 0x3F); p += 1
        else: out.append(b)
    idx = np.frombuffer(bytes(out[:need]), np.uint8).reshape(h, bpl)[:, :w]
    pal = np.frombuffer(data[-768:], np.uint8).reshape(256, 3) if len(data) >= 769 and data[-769] == 12 else None
    return idx, pal

def sprites():
    res, prev = {}, None
    sp = read_sff(os.path.join(SRC, "HonestechMechanic.sff"))
    dec = {}
    for s in sp:
        if not s["data"]: continue
        idx, pal = pcx(s["data"])
        use = prev if (s["same"] and prev is not None) or pal is None else pal
        if not s["same"]: prev = use
        rgba = np.zeros(idx.shape + (4,), np.uint8); rgba[..., :3] = use[idx]; rgba[..., 3] = np.where(idx == 0, 0, 255)
        dec[s["i"]] = rgba
    for s in sp:
        im = dec[s["i"] if s["i"] in dec else s["link"]]
        res[(s["g"], s["n"])] = (Image.fromarray(im), s["ax"], s["ay"])
    return res

def air():
    anims, cur, c1, d1, tgt = {}, None, [], [], None
    for raw in open(os.path.join(SRC, "Mechanic.air"), encoding="latin-1"):
        line = raw.split(";")[0].strip()
        if not line: continue
        m = re.match(r"\[begin action\s+(\d+)\]", line, re.I)
        if m: cur = int(m.group(1)); anims[cur] = {"f": [], "loop": 0}; c1, d1 = [], []; continue
        if cur is None: continue
        if re.match(r"loopstart", line, re.I): anims[cur]["loop"] = len(anims[cur]["f"]); continue
        m = re.match(r"clsn([12])(default)?\s*:", line, re.I)
        if m:
            tgt = [] if m.group(1) == "1" else None  # we only need attack boxes (clsn1)
            if m.group(1) == "1":
                if m.group(2): d1 = tgt
                else: c1 = tgt
            continue
        m = re.match(r"clsn([12])\[\d+\]\s*=\s*(.*)", line, re.I)
        if m:
            if m.group(1) == "1" and tgt is not None: tgt.append([int(float(v)) for v in m.group(2).split(",")[:4]])
            continue
        p = [x.strip() for x in line.split(",")]
        if len(p) >= 5 and re.match(r"-?\d+$", p[0]):
            anims[cur]["f"].append([int(p[0]), int(p[1]), int(p[2]), int(p[3]), int(p[4]), (p[5] if len(p) > 5 else "").upper(), c1 or d1])
            c1 = []
    return anims

# the moves the Lost Toolbox uses
USE = [0, 10, 20, 21, 40, 120, 180, 200, 210, 220, 230, 240, 250, 260, 262, 270, 1000, 1010, 1100, 1110, 1111, 1120, 1200, 1201, 1210, 5100, 5120]
spr, an = sprites(), air()
need = sorted({(f[0], f[1]) for a in USE for f in an[a]["f"]})
# shelf-pack into one atlas (2px gutters), widest-first by height
items = sorted(need, key=lambda k: -spr[k][0].height)
W, x, y, rowh, pos = 2048, 0, 0, 0, {}
for k in items:
    im = spr[k][0]; bb = im.getbbox() or (0, 0, 1, 1)
    cw, ch = bb[2] - bb[0], bb[3] - bb[1]
    if x + cw + 2 > W: x, y, rowh = 0, y + rowh + 2, 0
    pos[k] = (x, y, cw, ch, bb[0], bb[1]); x += cw + 2; rowh = max(rowh, ch)
H = y + rowh
atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
frames = {}
for k, (ax_, ay_, cw, ch, ox, oy) in pos.items():
    im, sx, sy = spr[k]
    atlas.paste(im.crop((ox, oy, ox + cw, oy + ch)), (ax_, ay_))
    # [atlas x, atlas y, w, h, axis x, axis y] with the axis moved into the cropped frame
    frames["%d,%d" % k] = [ax_, ay_, cw, ch, sx - ox, sy - oy]
atlas.save(os.path.join(OUT, "lt/hm-atlas.webp"), quality=90, method=6)
# a stand-alone standing pose for menus and the map
st = spr[(0, 0)][0]; st.crop(st.getbbox()).save(os.path.join(OUT, "lt/hm-idle.webp"), quality=92)
anims = {str(a): {"loop": an[a]["loop"], "f": [["%d,%d" % (f[0], f[1]), f[2], f[3], f[4], f[5], f[6]] for f in an[a]["f"]]} for a in USE}

# sounds: MUGEN snd -> small AAC clips
SND = ["0,0", "0,1", "1,0", "1,1", "1,2", "1,3", "1,4", "2,0", "2,2", "3,0", "3,2", "4,0", "5,0", "5,1", "5,2", "6,0", "7,0", "7,1", "8,0", "8,1",
       "10,0", "10,2", "10,3", "10,4", "10,6", "10,7", "20,0", "20,1", "20,2", "20,3"]
d = open(os.path.join(SRC, "Mechanic.snd"), "rb").read()
n, off = struct.unpack("<II", d[16:24])
with tempfile.TemporaryDirectory() as tmp:
    for _ in range(n):
        nxt, ln, g, s = struct.unpack("<IIII", d[off:off + 16])
        key = "%d,%d" % (g, s)
        if key in SND:
            wav = os.path.join(tmp, "a.wav"); open(wav, "wb").write(d[off + 16:off + 16 + ln])
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-c:a", "aac", "-b:a", "64k", os.path.join(OUT, "lt/hm-s%d_%d.m4a" % (g, s))], check=True)
        off = nxt
        if not off: break
js = "// generated by tools/mechanic_assets.py from the HONESTECH Arena Mechanic (sprites, animations, attack boxes)\n"
js += "window.LT_MECH = " + json.dumps({"atlas": "lt/hm-atlas.webp", "scale": 0.435, "frames": frames, "anims": anims, "snd": SND}, separators=(",", ":")) + ";\n"
open(os.path.join(OUT, "lt-mech-data.js"), "w").write(js)
print("atlas", W, H, len(frames), "frames;", len(anims), "anims;", len(js), "bytes js")

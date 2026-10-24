"""Three cut-out phones side by side on the stage with soft contact shadows (Day 19, S11).
RUN: python3 scripts/lineup.py   → raw/s11-lineup.jpg (2048×1152). Needs numpy + Pillow."""
import numpy as np
from PIL import Image, ImageFilter
stage = Image.open("raw/s0-stage.jpg").convert("RGBA")
W, H = stage.size
items = [("raw/cutouts/s9-finish-b.png", 0.27, 1.0), ("raw/cutouts/s1-back-master.png", 0.50, 1.08), ("raw/cutouts/s10-finish-c.png", 0.73, 1.0)]
base_h, floor = 0.60 * H, 0.84 * H   # phone height, y of the feet
canvas = stage.copy()
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
phones = []
for path, cx, k in items:
    im = Image.open(path).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    s = base_h * k / im.height
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = round(cx * W - im.width / 2), round(floor - im.height)
    phones.append((im, x, y))
    # contact shadow: tight dark ellipse at the feet + wide soft one
    for w, h, a, blur in ((0.9, 0.035, 150, 14), (1.5, 0.08, 70, 46)):
        e = Image.new("L", (W, H), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(e).ellipse([cx * W - im.width * w / 2, floor - h * H * 0.35, cx * W + im.width * w / 2, floor + h * H * 0.65], fill=a)
        e = e.filter(ImageFilter.GaussianBlur(blur))
        layer = Image.new("RGBA", (W, H), (10, 12, 18, 0)); layer.putalpha(e)
        shadow = Image.alpha_composite(shadow, layer)
canvas = Image.alpha_composite(canvas, shadow)
for im, x, y in phones:
    canvas.alpha_composite(im, (x, y))
canvas.convert("RGB").resize((2048, 1152), Image.LANCZOS).save("raw/s11-lineup.jpg", quality=93)
print("ok raw/s11-lineup.jpg", [(p[0].size, p[1], p[2]) for p in phones])

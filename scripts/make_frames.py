#!/usr/bin/env python3
"""
Kit frame pipeline: raw Veo/AI video → scroll-video frames that play by VIDEO TIME (skill: video-frames).
(The older `npm run frames` = scripts/video-to-frames.mjs makes evenly spaced frames; use this one for scroll films.)

  python3 scripts/make_frames.py [clip …] [--phone-only]       clips come from site/frames.json (default: all)

site/frames.json (one per site):
  {
    "slug": "brand",                       → public/frames/<slug>-<clip>[-m]
    "background": "#05080f",               page colour: the video's near-black is graded onto it (no box edge)
    "delogo": "delogo=x=1852:y=1032:w=56:h=32",   Veo watermark (bottom right of 1920×1080); "" to skip
    "clips": {
      "hero": {
        "src": "hero.mp4", "start": 0, "end": 6,          seconds of raw/<src> to use (prefer early seconds)
        "segs": [[0, 3, 16], [3, 6, 24]],                  [t0, t1, fps]: double density (24–48) in slow/key parts
        "desk": [1600], "phone": [540],                    [width px]; no size budget, frames are full quality (WebP q90 default)
        "quality": 90,                                     optional WebP quality (default 90, never lower it to save bytes)
        "phone_cx": [[0, 960]] | "track",                 phone crop centre (x of 1920) over time, or follow the subject
        "phone_crop": 720,                                 720 = 2:3 crop, 1080 = square
        "shrink": 0.9,                                     optional: shrink the frame with a soft fade (headroom)
        "grade": true                                      map near-black onto "background"
      },
      "flavours": { "join": [{"src": "a.mp4", "start": 0, "end": 4}, {"src": "b.mp4", "start": 0, "end": 4}],
                    "crossfade": 0.333, "segs": [...], "desk": [...], "phone": [...], "phone_cx": [[0, 958]] }
    }
  }

For every clip: ffmpeg trims, paints out the watermark and motion-interpolates to 48 fps (temp JPEGs, deleted at the
end) → frames are picked by video time per segment → graded onto the page colour → WebP desktop + phone at the best
full quality (WebP q90 or higher, no size budget) → manifest.json with "times" (the video second of every frame). Play them with
lib/film.ts + components/patterns/FilmPin.tsx (scroll → video time, neighbour frames blended, lazy loading).
"""
import argparse, io, json, os, shutil, subprocess, sys, tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw"
OUT = ROOT / "public" / "frames"
CONFIG = Path(os.environ.get("FRAMES_CONFIG", ROOT / "site" / "frames.json"))
CFG = json.loads(CONFIG.read_text()) if CONFIG.exists() else {"slug": "site", "clips": {}}
SLUG = CFG.get("slug", "site")
TMP = Path(os.environ.get("FRAMES_TMP", tempfile.gettempdir())) / f"{SLUG}-frames"
_bg = CFG.get("background", "#000000").lstrip("#")
BG = np.array([int(_bg[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)
SRC_FPS = 48
DELOGO = CFG.get("delogo", "delogo=x=1852:y=1032:w=56:h=32")
CLIPS = CFG.get("clips", {})


def sh(*args):
    subprocess.run(args, check=True)


def extract(src, start, end, name):
    """Source → 48 fps PNGs (interpolated), watermark painted out. Cached in TMP/<name>."""
    d = TMP / name
    if d.exists() and any(d.iterdir()):
        return d
    d.mkdir(parents=True, exist_ok=True)
    mi = f"minterpolate=fps={SRC_FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
    vf = f"{DELOGO},{mi}" if DELOGO else mi
    sh("ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end), "-i", str(RAW / src), "-vf", vf,
       "-q:v", "2", str(d / "f_%04d.jpg"))
    return d


def frame_times(segs):
    ts = []
    for t0, t1, fps in segs:
        n = max(1, round((t1 - t0) * fps))
        ts += [t0 + i * (t1 - t0) / n for i in range(n)]
    ts.append(segs[-1][1])
    return ts


def grade(a):
    """Near-black → page background: crush the noise floor a little, then lift so 0 lands exactly on BG."""
    a = np.clip((a - 4.0) * (255.0 / 251.0), 0, 255)
    return BG + a * (255.0 - BG) / 255.0


def load(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)


def build_join(c):
    """Two clips joined with a cross-fade: c["join"] = [{src,start,end}, {src,start,end}], c["crossfade"] seconds."""
    (p, q) = c["join"]
    d1 = extract(p["src"], p["start"], p["end"], f"{c['_name']}-a")
    d2 = extract(q["src"], q["start"], q["end"], f"{c['_name']}-b")
    f1, f2 = sorted(d1.iterdir()), sorted(d2.iterdir())
    xf = c.get("crossfade", 1 / 3)
    join = (p["end"] - p["start"]) - xf

    def at(files, t):
        return load(files[min(len(files) - 1, max(0, round(t * SRC_FPS)))])

    def get(T):
        if T < join:
            return at(f1, T)
        if T < join + xf:
            x = (T - join) / xf
            x = x * x * (3 - 2 * x)
            return at(f1, T) * (1 - x) + at(f2, T - join) * x
        return at(f2, T - join)

    return get


def build_simple(c, name):
    d = extract(c["src"], c["start"], c["end"], name)
    files = sorted(d.iterdir())
    shrink = c.get("shrink")

    def get(t):
        a = load(files[min(len(files) - 1, round(t * SRC_FPS))])
        if shrink:
            h, w, _ = a.shape
            im = Image.fromarray(a.astype(np.uint8)).resize((round(w * shrink), round(h * shrink)), Image.LANCZOS)
            small = np.asarray(im, dtype=np.float32)
            # wide, smooth fade of the shrunk frame into black : splash, fruit and
            # mist dissolve long before the frame edge, so no box line can ever show
            sh_, sw, _ = small.shape
            def ramp(n, f0, f1):
                i = np.arange(n, dtype=np.float32)
                x = np.minimum(i / (n * f0), (n - 1 - i) / (n * f1))
                x = np.clip(x, 0, 1)
                return (x * x * (3 - 2 * x)) ** 1.6
            # top 28% (fruit enters through the source's top edge), bottom 18%, sides 14%
            m = np.outer(ramp(sh_, 0.28, 0.18), ramp(sw, 0.14, 0.14))[..., None]
            out = np.zeros_like(a)
            y0, x0 = (h - sh_) // 2, (w - sw) // 2
            out[y0:y0 + sh_, x0:x0 + sw] = small * m
            a = out
        return a

    return get, files


def track_cx(files, times):
    """Horizontal centre of the can over time (bright-pixel centroid in the middle band, heavily smoothed)."""
    pts = []
    for t in np.arange(0, times[-1] + 1e-6, 0.25):
        a = load(files[min(len(files) - 1, round(t * SRC_FPS))]).mean(2)
        band = a[150:900]
        ys, xs = np.where(band > 60)
        pts.append((t, float(np.median(xs)) if len(xs) > 200 else 960.0))
    ts, xs = np.array(pts).T
    # moving average then linear interpolation
    xs = np.convolve(np.pad(xs, 2, mode="edge"), np.ones(5) / 5, mode="valid")
    return list(zip(ts, xs))


def interp(keys, t):
    ts = [k[0] for k in keys]
    xs = [k[1] for k in keys]
    return float(np.interp(t, ts, xs))


def encode(job):
    arr, path, q = job
    Image.fromarray(arr).save(path, "WEBP", quality=q, method=5)
    return os.path.getsize(path)


def render(name, c):
    print(f"▶ {name}")
    times = frame_times(c["segs"])
    files = None
    if c.get("join"):
        c["_name"] = name
        get = build_join(c)
    else:
        get, files = build_simple(c, name)
    cx_keys = c.get("phone_cx") or [[0, 960]]
    if cx_keys == "track":
        cx_keys = track_cx(files, times)
        print("  phone crop centre:", ", ".join(f"{t:.2f}s→{x:.0f}" for t, x in cx_keys[::4]))

    dw = c["desk"][0]
    pw = (c.get("phone") or [0])[0]  # desktop only: phone sets are optional (omit "phone")
    crop_w = c.get("phone_crop", 720)  # 720 = a 2:3 crop; 1080 = square (the closing: whole can, street to the sides)
    ph = round(pw * 1080 / crop_w) if pw else 0
    desk, phone = [], []
    for t in times:
        a = get(t)
        if c.get("grade", True):
            a = grade(a)
        a8 = a.clip(0, 255).astype(np.uint8)
        im = Image.fromarray(a8)
        if not PHONE_ONLY:
            desk.append(np.asarray(im.resize((dw, round(dw * 9 / 16)), Image.LANCZOS)))
        if pw:
            cx = interp(cx_keys, t)
            x0 = int(min(1920 - crop_w, max(0, cx - crop_w / 2)))
            phone.append(np.asarray(im.crop((x0, 0, x0 + crop_w, 1080)).resize((pw, ph), Image.LANCZOS)))

    outs = (("", desk), ("-m", phone))
    if PHONE_ONLY:
        outs = outs[1:]
    if not pw:
        outs = outs[:1]
    for suffix, frames in outs:
        folder = OUT / f"{SLUG}-{name}{suffix}"
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True)
        q = int(c.get("quality", 90))
        jobs = [(f, folder / f"frame_{i + 1:04d}.webp", q) for i, f in enumerate(frames)]
        with ProcessPoolExecutor() as ex:
            total = sum(ex.map(encode, jobs, chunksize=4))
        h, w = frames[0].shape[:2]
        manifest = dict(count=len(frames), ext="webp", width=w, height=h, pad=4, prefix="frame_",
                        times=[round(t, 4) for t in times])
        (folder / "manifest.json").write_text(json.dumps(manifest))
        print(f"  ✓ {SLUG}-{name}{suffix}: {len(frames)} frames {w}×{h} q{q} = {total / 1e6:.1f} MB")


PHONE_ONLY = "--phone-only" in sys.argv

def quick(a):
    """One clip, no frames.json: `npm run film-frames -- --src raw/v1.mp4 --name v1 --fps 24 [--count 120] [--fmt webp|jpg]`.
    Writes public/frames/<name>/frame_0001.<fmt> + manifest.json (count, width, height, ext, pad, prefix, fps, times) that
    FrameScrub (components/video/) and lib/frames.ts read. The Flow/Veo mark is painted out (--delogo "" to skip)."""
    src = Path(a.src)
    if not src.is_absolute():
        src = ROOT / src
    out = Path(a.out) if a.out else OUT / a.name
    if not out.is_absolute():
        out = ROOT / out
    tmp = TMP / f"quick-{a.name}"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)]))
    t0, t1 = a.start, min(a.end or dur, dur)
    fps = a.fps
    if a.count:  # a frame count wins over fps
        fps = a.count / max(0.01, t1 - t0)
    vf = ",".join(x for x in (a.delogo, f"fps={fps:.5f}", f"scale={a.width}:-2:flags=lanczos") if x)
    sh("ffmpeg", "-v", "error", "-y", "-ss", str(t0), "-to", str(t1), "-i", str(src), "-vf", vf, "-q:v", "2", str(tmp / "f_%05d.png"))
    files = sorted(tmp.iterdir())
    if a.count:
        files = files[: a.count]
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    ext = "jpg" if a.fmt == "jpg" else "webp"
    total = 0
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB")
        dst = out / f"frame_{i + 1:04d}.{ext}"
        if ext == "jpg":
            im.save(dst, "JPEG", quality=a.quality, optimize=True)
        else:
            im.save(dst, "WEBP", quality=a.quality, method=5)
        total += os.path.getsize(dst)
    w, h = im.size
    man = dict(count=len(files), ext=ext, width=w, height=h, pad=4, prefix="frame_", fps=round(fps, 3),
               times=[round(t0 + i / fps, 4) for i in range(len(files))])
    (out / "manifest.json").write_text(json.dumps(man))
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"  ✓ {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}: {len(files)} frames {w}×{h} {ext} q{a.quality} = {total / 1e6:.1f} MB")


if __name__ == "__main__":
    if "--src" in sys.argv:
        ap = argparse.ArgumentParser()
        ap.add_argument("--src", required=True)
        ap.add_argument("--name", required=True, help="folder name: public/frames/<name>")
        ap.add_argument("--out", help="override the output folder")
        ap.add_argument("--fps", type=float, default=24)
        ap.add_argument("--count", type=int, help="exact frame count (overrides --fps)")
        ap.add_argument("--fmt", choices=["webp", "jpg"], default="webp")
        ap.add_argument("--quality", type=int, default=90)
        ap.add_argument("--width", type=int, default=1600)
        ap.add_argument("--start", type=float, default=0)
        ap.add_argument("--end", type=float, default=0)
        ap.add_argument("--delogo", default=DELOGO)
        quick(ap.parse_args())
        shutil.rmtree(TMP, ignore_errors=True)
        sys.exit(0)
    if not CLIPS:
        sys.exit(f"no clips: write {CONFIG} first (see the docstring at the top of this file)")
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or list(CLIPS)
    for n in names:
        render(n, CLIPS[n])
    # the 48 fps intermediates are big: never leave them behind
    shutil.rmtree(TMP, ignore_errors=True)

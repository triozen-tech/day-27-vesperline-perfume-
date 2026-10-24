"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { clipFrame, ensureClip, getManifest, getStill, loadFrames, onClipLoad, setClipOrder, viewClip, type FrameManifest } from "@/lib/frames";
import { chainAt, joinMap, joinZone, JOIN_PX, layersAt, timeline, type Seg } from "@/lib/chain";
import { prefersReducedMotion } from "@/lib/gsap";

/**
 * FrameScrub: a scroll-driven image sequence (frames from `npm run film-frames`), video-first engine.
 *  - `frames`: one folder ("/frames/x-v1") or several (V1..Vn): they play one after another along the same scroll
 *    with a crossfade on each join (lib/chain.ts).
 *  - Scroll: the section's own scroll range (pin it: tall section + sticky stage; progress runs while it crosses the
 *    screen) or explicit `start` / `end` page positions in px. Progress is read every frame, so the picture is a pure
 *    function of the scroll position: any speed, a stop or scrolling back give the same frame.
 *  - Eased: the shown position chases the target with time-based damping (`ease`, higher = snappier).
 *  - Alive when idle: a tiny breath (slow scale + drift) never stops, even with the scroll still.
 *  - Loads clip 1 in order (first frame draws at once), later clips start when the previous one is in.
 *  - `?static=1` draws one still frame (`stillAt`, 0..1) and nothing moves. The OS reduce-motion setting is ignored.
 *  - `hover`: pass `onHover` to get enter/leave, and `hoverNudge` (progress, e.g. 0.01) to push the picture on hover.
 *
 * TIMELINE MODE (`segs`): clips AND stills on one scroll, the way a long film section needs it (see docs/VIDEO-FIRST.md).
 *  - `segs`: [{ clip: "/frames/x-v1" }, { img: "/img/s4.jpg", w: 250 }, ...]. A clip plays over `w` scroll units (default its frame
 *    count); a still holds for `w` units. Every segment after the first fades in over 8 units centred on its start (`fade`,
 *    `start` on a still). Stills inside the timeline give lead-ins from the previous clip's last frame and hand-overs.
 *  - Veo joins: a clip with `join: [firstFrame, length]` (the dissolve baked into it) is skipped by the scroll: the picture jumps
 *    from the last clean frame to the first clean one inside JOIN_PX of scroll, and a scroll that stops inside that zone for
 *    150 ms hops (<= 4 px) to the clean side, so a join frame is never shown at rest (`snapJoins`, off in ?record=1).
 *  - `lead` / `hold`: scroll px the section is pinned before / after the film (the picture holds its first / last frame).
 *  - `onProgress(p, still, holdPx)`: every frame while on screen, with the eased progress 0..1 (still = motion off).
 *  - `children` are drawn inside the breathing layer, so overlays share the picture's drift. The view breathes when scroll is still.
 *  - Preload: the first clip starts when its section is within 1.6 screens, the next one at 50 % of the current one, only the
 *    clip on screen and its neighbours (`clipOrder` = all clips of the site, in order) stay decoded. A loader can call
 *    `ensureClip(folder)` and watch `clipProgress(folder)` (lib/frames).
 *  - Test hooks: the canvas carries data-frames (layers shown: [clip, frame, alpha]) and data-zones (join zones in page px);
 *    scripts/join-test.mjs uses them.
 */
export type FrameScrubProps = {
  frames: string | string[];
  /** Section whose scroll range drives it; default: the canvas's closest <section>, else its parent. */
  section?: React.RefObject<HTMLElement | null>;
  /** Explicit page scroll range in px (instead of the section). */
  start?: number;
  end?: number;
  fit?: "cover" | "contain";
  fade?: number;
  ease?: number;
  breath?: number;
  stillAt?: number;
  hoverNudge?: number;
  onHover?: (hovering: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
};
export type FrameScrubTimelineProps = {
  segs: Seg[];
  /** All clip folders of the site in play order (preload the next, drop the far ones). */
  clipOrder?: string[];
  /** Progress of the picture in ?static=1. */
  stillAt?: number;
  onProgress?: (p: number, still: boolean, holdPx: number) => void;
  lead?: number;
  hold?: number;
  /** Hop the scroll off a join zone when it stops there (default true; always off in ?record=1). */
  snapJoins?: boolean;
  children?: ReactNode;
  className?: string;
};

/** Like lib/frames drawFit but without clearing the canvas, so crossfaded layers stack. */
function drawFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, fit: "cover" | "contain") {
  const ir = img.naturalWidth / img.naturalHeight;
  const byWidth = fit === "cover" ? w / h > ir : w / h < ir;
  const dw = byWidth ? w : h * ir;
  const dh = byWidth ? w / ir : h;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function SimpleScrub({
  frames, section, start, end, fit = "cover", fade = 0.04, ease = 9, breath = 1, stillAt = 0.12, hoverNudge = 0, onHover, className, style,
}: FrameScrubProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hovering = useRef(false);
  const folders = Array.isArray(frames) ? frames : [frames];
  const key = folders.join("|");

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = prefersReducedMotion();
    const fs = key.split("|");
    const mans: (FrameManifest | null)[] = fs.map(() => null);
    const sets: (ReturnType<typeof loadFrames> | null)[] = fs.map(() => null);
    let cancelled = false;
    let raf = 0;
    let dirty = true;
    let shown = -1; // eased progress; -1 = not placed yet
    let last = performance.now();

    // clips load one after the other: clip 1 first (its first frame draws at once), the rest when it is in
    const boot = (k: number) => {
      if (cancelled || k >= fs.length) return;
      getManifest(fs[k])
        .then((m) => {
          if (cancelled) return;
          mans[k] = m;
          sets[k] = loadFrames(fs[k], m, (loaded, total) => {
            dirty = true;
            if (loaded === total) boot(k + 1);
          });
        })
        .catch((e) => { console.warn(e.message); boot(k + 1); });
    };
    boot(0);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const el = () => section?.current ?? cv.closest("section") ?? cv.parentElement;
    const target = () => {
      if (still) return stillAt;
      const y = window.scrollY;
      if (start !== undefined && end !== undefined) return (y - start) / Math.max(1, end - start);
      const node = el();
      if (!node) return 0;
      const r = node.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      return run > 1 ? -r.top / run : (window.innerHeight - r.top) / (window.innerHeight + r.height);
    };

    const draw = (time: number) => {
      const counts = mans.map((m) => m?.count ?? 0);
      if (counts.some((c) => !c)) {
        // not all manifests are in yet: play what exists as a chain of the known clips
        const known = counts.map((c, i) => [c, i]).filter(([c]) => c);
        if (!known.length) return;
        counts.splice(0, counts.length, ...known.map(([c]) => c));
        const idx = known.map(([, i]) => i);
        return paint(chainAt(counts, shown, fade).map((l) => ({ ...l, clip: idx[l.clip] })), time);
      }
      paint(chainAt(counts, shown, fade), time);
    };
    const paint = (layers: ReturnType<typeof chainAt>, time: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const t = time / 1000;
      // idle breath: slow scale + drift, never frozen (off in ?static=1)
      const b = still ? 0 : breath;
      const sc = 1 + 0.006 * b * (1 + Math.sin(t * 0.7)) / 2 + 0.004 * b;
      const dx = Math.sin(t * 0.45) * 0.0025 * b * cv.width;
      const dy = Math.cos(t * 0.37) * 0.002 * b * cv.height;
      ctx.save();
      ctx.translate(cv.width / 2 + dx, cv.height / 2 + dy);
      ctx.scale(sc, sc);
      ctx.translate(-cv.width / 2, -cv.height / 2);
      for (const l of layers) {
        const set = sets[l.clip];
        if (!set) continue;
        const f0 = Math.floor(l.frame), f1 = Math.min(f0 + 1, (mans[l.clip]!.count) - 1), m = l.frame - f0;
        ctx.globalAlpha = l.alpha;
        const a = set.get(f0);
        if (a) drawFit(ctx, a, cv.width, cv.height, fit);
        const bImg = m > 0.02 && f1 !== f0 ? set.get(f1) : undefined;
        if (bImg && bImg !== a) {
          ctx.globalAlpha = l.alpha * m;
          drawFit(ctx, bImg, cv.width, cv.height, fit);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const want = Math.min(1, Math.max(0, target() + (hovering.current ? hoverNudge : 0)));
      if (shown < 0 || still) shown = want;
      else shown += (want - shown) * (1 - Math.exp(-ease * dt));
      if (Math.abs(want - shown) < 1e-5) shown = want;
      if (still && !dirty) return;
      draw(now);
      dirty = false;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      sets.forEach((s) => s?.cancel());
    };
  }, [key, section, start, end, fit, fade, ease, breath, stillAt, hoverNudge]);

  return (
    <canvas
      ref={canvas}
      className={className ?? "absolute inset-0 h-full w-full"}
      style={style}
      onPointerEnter={() => { hovering.current = true; onHover?.(true); }}
      onPointerLeave={() => { hovering.current = false; onHover?.(false); }}
    />
  );
}

type Lenis = { scrollTo: (y: number, o?: object) => void };

function TimelineScrub({ segs, clipOrder, stillAt = 0.1, onProgress, lead = 0, hold = 0, snapJoins = true, children, className }: FrameScrubTimelineProps) {
  const root = useRef<HTMLDivElement>(null);
  const breath = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const still_ = prefersReducedMotion();
    const section = (root.current!.closest("section") ?? root.current!.parentElement) as HTMLElement;
    if (clipOrder) setClipOrder(clipOrder);
    const firstClip = (segs.find((s) => "clip" in s) as { clip: string } | undefined)?.clip;
    let cancelled = false, raf = 0, dirty = true, shown = -1, shownExt = -1, boost = 0, runPx = 1, secTop = 0, lastY = -1;
    let lastMove = performance.now(), nudged = false, last = performance.now(), zonesKey = "";
    let tl: ReturnType<typeof timeline> | null = null;
    let counts: number[] = [];
    const rec = /record/.test(location.search);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const off = onClipLoad(() => { dirty = true; });

    const drawImg = (im: HTMLImageElement, alpha: number) => {
      const w = cv.width, h = cv.height, ir = im.naturalWidth / im.naturalHeight;
      const byW = w / h > ir;
      const dw = byW ? w : h * ir, dh = byW ? w / ir : h;
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };
    const zoneOf = (i: number) => (tl ? joinZone(segs[i], i, counts[i], tl, runPx, secTop) : null);

    // scrolling stopped inside a join zone for > 150 ms: ease the scroll (<= 4 px) to the nearest clean side
    const nudge = (want: number, sy: number) => {
      for (const L of layersAt(segs, tl!, want)) {
        const z = zoneOf(L.i);
        if (!z) continue;
        const g = L.t * (counts[L.i] - 1);
        if (g <= z.A + 1e-6 || g >= z.A + z.zf - 1e-6) continue;
        const target = sy - z.yA < JOIN_PX / 2 ? Math.floor(z.yA) - 1 : Math.ceil(z.yA + JOIN_PX) + 1;
        const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
        // a <= 4 px hop (invisible), and the picture hops with it so no join frame is shown while the scroll catches up
        if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
        else window.scrollTo(0, target);
        shownExt = (target - secTop) / runPx;
      }
    };

    const paint = (x: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let dominant: [string, number] | null = null;
      const info: [string, number, number][] = [];
      for (const L of layersAt(segs, tl!, x)) {
        const sg = segs[L.i];
        if ("img" in sg) { const im = getStill(sg.img); if (im) drawImg(im, L.alpha); continue; }
        ensureClip(sg.clip); // a clip dropped while far away restarts the moment any of it is on screen (jump back from the end)
        const n = counts[L.i];
        let f = L.t * (n - 1);
        const z = zoneOf(L.i);
        if (z) f = joinMap(f, z, n);
        info.push([sg.clip, +f.toFixed(3), +L.alpha.toFixed(3)]);
        const f0 = Math.floor(f), m = f - f0;
        const a = clipFrame(sg.clip, f0);
        if (a) drawImg(a, L.alpha);
        const b = m > 0.02 && f0 + 1 < n ? clipFrame(sg.clip, f0 + 1) : undefined;
        if (b && b !== a) drawImg(b, L.alpha * m);
        dominant = [sg.clip, L.t];
      }
      ctx.globalAlpha = 1;
      cv.dataset.frames = JSON.stringify(info);
      return dominant;
    };

    const target = () => {
      const r = section.getBoundingClientRect();
      const run = r.height - window.innerHeight - lead - hold;
      runPx = Math.max(1, run);
      secTop = r.top + window.scrollY + lead;
      return run > 1 ? (-r.top - lead) / run : 0; // 0..1 over the film, > 1 while holding the last frame
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!tl) return; // manifests not in yet
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (still_) {
        if (!dirty) return;
        cb.current?.(stillAt, true, 1e6);
        for (const L of layersAt(segs, tl, stillAt)) { const g = segs[L.i]; if ("clip" in g) ensureClip(g.clip); }
        paint(stillAt);
        dirty = false;
        return;
      }
      const r = section.getBoundingClientRect();
      const near = r.bottom > -200 && r.top < window.innerHeight + 200;
      const wantExt = Math.min(1 + hold / runPx, Math.max(0, target()));
      const want = Math.min(1, wantExt);
      if (!near) { shownExt = wantExt; shown = want; return; }
      if (firstClip && r.top < window.innerHeight * 1.6) ensureClip(firstClip);
      if (shownExt < 0) shownExt = wantExt;
      else shownExt += (wantExt - shownExt) * (1 - Math.exp(-(boost ? 34 : 12) * dt));
      if (Math.abs(wantExt - shownExt) < 1e-5) shownExt = wantExt;
      shown = Math.min(1, shownExt);
      const sy = window.scrollY;
      if (Math.abs(sy - lastY) > 0.01) { lastY = sy; lastMove = now; nudged = false; boost = 0; }
      else if (snapJoins && !nudged && !rec && now - lastMove > 150) { nudged = true; nudge(want, sy); }
      // breathing: same function of time on every stage, so the seam between two pinned sections never jumps
      const t = now / 1000;
      const sc = 1.004 + 0.003 * (1 + Math.sin(t * 0.7));
      if (breath.current) breath.current.style.transform = `translate(${(Math.sin(t * 0.45) * 3.6).toFixed(2)}px, ${(Math.cos(t * 0.37) * 1.8).toFixed(2)}px) scale(${sc.toFixed(4)})`;
      cb.current?.(shown, false, Math.max(0, shownExt - 1) * runPx);
      const zs = JSON.stringify(segs.map((_, i) => ({ z: zoneOf(i), i })).filter((o) => o.z).map((o) => ({ clip: (segs[o.i] as { clip: string }).clip, y: o.z!.yA, h: JOIN_PX, A: o.z!.A, B: o.z!.B })));
      if (zs !== zonesKey) { zonesKey = zs; cv.dataset.zones = zs; }
      const d = paint(shown);
      if (d) viewClip(d[0], d[1]);
    };

    // frame counts come from the manifests (small json files); the timeline starts once they are in
    Promise.all(segs.map((sg) => ("clip" in sg ? getManifest(sg.clip).then((m) => m.count) : Promise.resolve(0))))
      .then((c) => {
        if (cancelled) return;
        counts = c;
        tl = timeline(segs, c);
        if (firstClip) { const r0 = section.getBoundingClientRect(); if (r0.top < window.innerHeight * 1.6) ensureClip(firstClip); }
        last = performance.now();
        dirty = true;
      })
      .catch((e) => console.warn(e.message));
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); ro.disconnect(); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs, stillAt, lead, hold, snapJoins]);

  return (
    <div ref={root} className={className ?? "absolute inset-0"}>
      <div ref={breath} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
        <canvas ref={canvas} style={{ display: "block", width: "100%", height: "100%" }} />
        {children}
      </div>
    </div>
  );
}

export default function FrameScrub(props: FrameScrubProps | (FrameScrubTimelineProps & { frames?: undefined })) {
  return "segs" in props && props.segs ? <TimelineScrub {...props} /> : <SimpleScrub {...(props as FrameScrubProps)} />;
}

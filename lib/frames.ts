"use client";

// Loads an image sequence made by `npm run frames`.
// Folder layout: /public/frames/<name>/frame_0001.webp … + manifest.json

export type FrameManifest = {
  count: number;
  ext: string;
  width: number;
  height: number;
  pad: number;
  prefix: string;
};

export async function getManifest(folder: string): Promise<FrameManifest> {
  const res = await fetch(`${folder.replace(/\/$/, "")}/manifest.json`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`No manifest.json in ${folder}. Run: npm run frames -- <video> ${folder.replace(/^\//, "")}`);
  return res.json();
}

export function frameUrl(folder: string, m: FrameManifest, i: number) {
  return `${folder.replace(/\/$/, "")}/${m.prefix}${String(i + 1).padStart(m.pad, "0")}.${m.ext}`;
}

/**
 * Loads frames in a smart order: first frame, then every 8th (so scrubbing
 * works early at low detail), then fills the gaps.
 */
export function loadFrames(
  folder: string,
  m: FrameManifest,
  onProgress: (loaded: number, total: number) => void,
) {
  const images: (HTMLImageElement | undefined)[] = new Array(m.count);
  let loaded = 0;
  let cancelled = false;

  const order: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i >= 0 && i < m.count && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  push(0);
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < m.count; i += step) push(i);

  const CONCURRENCY = 6;
  let cursor = 0;

  const next = () => {
    if (cancelled || cursor >= order.length) return;
    const i = order[cursor++];
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => {
      if (cancelled) return;
      if (img.naturalWidth) images[i] = img;
      loaded++;
      onProgress(loaded, m.count);
      next();
    };
    img.src = frameUrl(folder, m, i);
  };
  for (let c = 0; c < CONCURRENCY; c++) next();

  return {
    images,
    /** Nearest loaded frame to i (so scrolling never shows a blank). */
    get(i: number) {
      if (images[i]) return images[i];
      for (let d = 1; d < m.count; d++) {
        if (images[i - d]) return images[i - d];
        if (images[i + d]) return images[i + d];
      }
      return undefined;
    },
    cancel() {
      cancelled = true;
    },
  };
}

/** Draws an image into a canvas like CSS object-fit (cover/contain). */
export function drawFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  fit: "cover" | "contain" = "cover",
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let dw = w;
  let dh = h;
  if (fit === "cover" ? cr > ir : cr < ir) {
    dw = w;
    dh = w / ir;
  } else {
    dh = h;
    dw = h * ir;
  }
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/* ---------- shared clip store (FrameScrub timeline mode, loaders) ---------- */
// One store for every clip folder on the page, so a loader can start and watch the hero clip (ensureClip / clipProgress) and the
// film sections share the decoded frames. Frames load first, every 8th, 4th, 2nd, rest (each decoded right after it loads); only
// the clip on screen and its neighbours in `setClipOrder` stay in memory; the next clip starts at 50 % of the current one.
type ClipSet = { man?: FrameManifest; imgs: (HTMLImageElement | undefined)[]; loaded: number; started: boolean; gen: number };
const store = new Map<string, ClipSet>();
const clipListeners = new Set<() => void>();
let clipOrder: string[] = [];
const ping = () => clipListeners.forEach((f) => f());
const setOf = (folder: string) => {
  let s = store.get(folder);
  if (!s) store.set(folder, (s = { imgs: [], loaded: 0, started: false, gen: 0 }));
  return s;
};
export const onClipLoad = (fn: () => void) => { clipListeners.add(fn); return () => { clipListeners.delete(fn); }; };
/** All clips of the site in play order: lets the store preload the next one and drop the far ones. */
export const setClipOrder = (folders: string[]) => { clipOrder = folders; };
/** 0..1 load progress of a clip (0 until its manifest is in). */
export const clipProgress = (folder: string) => { const s = store.get(folder); return s?.man ? s.loaded / s.man.count : 0; };

/** Starts loading a clip (once). */
export function ensureClip(folder: string) {
  const s = setOf(folder);
  if (s.started || typeof window === "undefined") return;
  s.started = true;
  const gen = s.gen;
  getManifest(folder).then((m) => {
    if (gen !== s.gen) return;
    s.man = m; s.imgs = new Array(m.count); s.loaded = 0;
    const n = m.count, order: number[] = [], seen = new Set<number>();
    const push = (i: number) => { if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); order.push(i); } };
    push(0);
    for (const step of [8, 4, 2, 1]) for (let i = 0; i < n; i += step) push(i);
    push(n - 1);
    let cursor = 0;
    const next = () => {
      if (cursor >= order.length || gen !== s.gen) return;
      const i = order[cursor++];
      const img = new Image();
      img.decoding = "async";
      const done = () => { if (gen !== s.gen) return; if (img.naturalWidth) s.imgs[i] = img; s.loaded++; ping(); next(); };
      img.onload = () => { (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(done); };
      img.onerror = done;
      img.src = frameUrl(folder, m, i);
    };
    for (let k = 0; k < 6; k++) next();
  }).catch((e) => console.warn(e.message));
}

/** Call while a clip is on screen (frac = its progress 0..1): keeps it and its neighbours decoded, starts the next at 50 %. */
export function viewClip(folder: string, frac: number) {
  ensureClip(folder);
  const at = clipOrder.indexOf(folder);
  if (at < 0) return;
  clipOrder.forEach((o, k) => {
    const s = store.get(o);
    if (s && Math.abs(k - at) > 1 && s.started) { s.gen++; s.imgs = []; s.loaded = 0; s.started = false; s.man = undefined; }
  });
  if (frac > 0.5 && at < clipOrder.length - 1) ensureClip(clipOrder[at + 1]);
}

/** Frame i of a clip, or the nearest loaded one (never blank once anything is in). */
export function clipFrame(folder: string, i: number) {
  const imgs = store.get(folder)?.imgs;
  if (!imgs) return undefined;
  if (imgs[i]) return imgs[i];
  for (let d = 1; d < imgs.length; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; }
  return undefined;
}

const stills = new Map<string, HTMLImageElement>();
/** A still image (loaded once, shared); undefined until it has loaded. */
export function getStill(url: string) {
  if (typeof window === "undefined") return undefined;
  let im = stills.get(url);
  if (!im) { im = new Image(); im.decoding = "async"; im.onload = ping; im.src = url; stills.set(url, im); }
  return im.complete && im.naturalWidth ? im : undefined;
}

// Chain helper: plays clips V1..Vn one after another along ONE scroll progress (0..1), crossfading on every join.
// Pure function of the progress, so any scroll speed, a stop or scrolling back gives the same picture.

export type ChainLayer = { clip: number; frame: number; alpha: number };

/**
 * chainAt(counts, p, fade) → the layers to draw (1 layer, or 2 during a join; draw in order, each with its alpha).
 *  counts  frame count of each clip
 *  p       scroll progress 0..1 over the whole chain; each clip gets a share of it proportional to its frame count
 *  fade    crossfade length as a fraction of the whole chain (default 0.04); the join is centred on the clip boundary
 * `frame` is fractional (0..count-1): draw floor/ceil blended for smoothness.
 */
export function chainAt(counts: number[], p: number, fade = 0.04): ChainLayer[] {
  const n = counts.length;
  const total = counts.reduce((a, b) => a + b, 0);
  const x = Math.min(1, Math.max(0, p));
  const edges: number[] = [0];
  counts.forEach((c) => edges.push(edges[edges.length - 1] + c / total));
  let i = edges.findIndex((e, k) => k > 0 && x <= e) - 1;
  if (i < 0) i = n - 1;
  const at = (clip: number, q: number): ChainLayer => {
    const span = edges[clip + 1] - edges[clip];
    const t = Math.min(1, Math.max(0, (q - edges[clip]) / span));
    return { clip, frame: t * (counts[clip] - 1), alpha: 1 };
  };
  const half = fade / 2;
  const layers: ChainLayer[] = [];
  const nextEdge = edges[i + 1];
  const prevEdge = edges[i];
  if (i < n - 1 && x > nextEdge - half) {
    const m = (x - (nextEdge - half)) / fade;
    const s = m * m * (3 - 2 * m);
    layers.push(at(i, x), { ...at(i + 1, x), alpha: s });
  } else if (i > 0 && x < prevEdge + half) {
    const m = (x - (prevEdge - half)) / fade;
    const s = m * m * (3 - 2 * m);
    layers.push(at(i - 1, x), { ...at(i, x), alpha: s });
  } else layers.push(at(i, x));
  return layers;
}

/* ---------- timeline mode: stills + clips on one scroll, Veo joins skipped ---------- */
// Used by FrameScrub's `segs` prop. A timeline is a row of segments, each `w` scroll units wide (a clip defaults to its frame
// count). Every segment after the first fades IN over `fade` units centred on its start (or starting at it with `start`).

const ss = (x: number) => { const m = Math.min(1, Math.max(0, x)); return m * m * (3 - 2 * m); };
export const smooth = (a: number, b: number, x: number) => ss((x - a) / (b - a));
/** Rises a..b, falls c..d (smooth); 0 outside. */
export const ramp = (x: number, a: number, b: number, c: number, d: number) => ss((x - a) / (b - a)) * (1 - ss((x - c) / (d - c)));

/** clip: folder of a frame sequence; plays over `w` units (default: its frame count). `join` = [first frame, length] (0-based) of a
 *  dissolve baked into the clip: the scroll skips it and can never rest on it. img: a still held for `w` units. */
export type ClipSeg = { clip: string; w?: number; join?: [number, number]; fade?: number };
export type ImgSeg = { img: string; w: number; fade?: number; start?: boolean };
export type Seg = ClipSeg | ImgSeg;
export type Layer = { i: number; t: number; alpha: number };
/** Scroll px a join zone may take. */
export const JOIN_PX = 3;

const weightOf = (s: Seg, n: number) => ("clip" in s ? (s.w ?? n) : s.w);

/** counts[i] = frame count of segment i (ignored for stills). */
export function timeline(segs: Seg[], counts: number[]) {
  const b = [0];
  segs.forEach((s, i) => b.push(b[b.length - 1] + weightOf(s, counts[i] ?? 0)));
  return { W: b[b.length - 1], b, w: (i: number) => b[i + 1] - b[i] };
}
export type Timeline = ReturnType<typeof timeline>;

/** The layers to draw at progress x (1, or 2 while a segment fades in); `t` = 0..1 inside the segment. */
export function layersAt(segs: Seg[], tl: Timeline, x: number, fadeDef = 8): Layer[] {
  const u = Math.min(1, Math.max(0, x)) * tl.W;
  const alphas = segs.map((s, i) => {
    if (i === 0) return 1;
    const f = s.fade || fadeDef;
    const lo = "img" in s && s.start ? tl.b[i] : tl.b[i] - f / 2;
    return ss((u - lo) / f);
  });
  let k = 0;
  alphas.forEach((a, i) => { if (a > 0) k = i; });
  const mk = (i: number, alpha: number): Layer => ({ i, alpha, t: Math.min(1, Math.max(0, (u - tl.b[i]) / (tl.b[i + 1] - tl.b[i]))) });
  return k > 0 && alphas[k] < 1 ? [mk(k - 1, 1), mk(k, alphas[k])] : [mk(k, 1)];
}

export type JoinZone = { A: number; B: number; zf: number; yA: number };
/** Join zone of clip segment i: the last clean frame A before the dissolve, the first clean frame B after it, the zone's width
 *  in frames (JOIN_PX of scroll) and the page y where it starts. runPx = scroll px of the whole timeline, secTop = its page y. */
export function joinZone(seg: Seg, i: number, n: number, tl: Timeline, runPx: number, secTop: number): JoinZone | null {
  if (!("clip" in seg) || !seg.join) return null;
  const j = seg.join, w = tl.w(i), A = j[0] - 1, B = j[0] + j[1];
  const gpp = ((n - 1) / w) * (tl.W / runPx); // frames per scroll px
  return { A, B, zf: JOIN_PX * gpp, yA: secTop + ((tl.b[i] + (A / (n - 1)) * w) / tl.W) * runPx };
}
/** Frame to show for clip position g: the dissolve frames pass inside the zone, so the picture jumps from A to B within JOIN_PX. */
export function joinMap(g: number, z: JoinZone, n: number) {
  if (g <= z.A) return g;
  if (g < z.A + z.zf) return z.A + ((g - z.A) / z.zf) * (z.B - z.A);
  return Math.min(n - 1, g + (z.B - z.A - z.zf));
}

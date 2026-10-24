// Join pixel test: stops at EVERY scroll pixel across each Veo join zone (V2 61-64, V5 64-67, V6 100-103, V7 137-140, 0-based),
// waits 300 ms, and logs the frame the film shows. A stop "rests on a join frame" when the picture still blends a join frame
// (A < frame < B). Also reports the worst settle time (last change of the picture) per join. Needs `npm start -- -p 3014`.
// The film canvas publishes data-frames ([clip, frame, alpha] per layer) and data-zones (join zones in page px).
// Usage: node scripts/join-test.mjs [port]
import { chromium } from "playwright-core";

const PORT = process.argv[2] || "3014";
const JOINS = [["V2", "v2", 61, 4], ["V5", "v5", 64, 4], ["V6", "v6", 100, 4], ["V7", "v7", 137, 4]];
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
await p.waitForFunction(() => !document.querySelector("[data-loader]"), null, { timeout: 30000 });
await p.waitForTimeout(500);

// in the page: jump to y, sample every frame for 1000 ms, return the picture at 300 ms and the settle time
const stop = (y, clip) => p.evaluate(async ({ y, clip }) => {
  const is = (c) => c === clip || c.endsWith("-" + clip);
  const lenis = window.__lenis;
  lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
  const pick = () => {
    for (const cv of document.querySelectorAll("canvas[data-frames]")) {
      const z = JSON.parse(cv.dataset.zones || "[]");
      if (!z.some((q) => is(q.clip))) continue;
      return JSON.parse(cv.dataset.frames).filter((l) => is(l[0]) && l[2] > 0);
    }
    return null;
  };
  const t0 = performance.now();
  let last = "", settle = 0, at300 = null, scrollAt300 = 0;
  while (performance.now() - t0 < 1000) {
    await new Promise((r) => requestAnimationFrame(r));
    const f = pick();
    const key = JSON.stringify(f);
    if (key !== last) { last = key; settle = performance.now() - t0; }
    if (at300 === null && performance.now() - t0 >= 300) { at300 = f; scrollAt300 = window.scrollY; }
  }
  return { at300, settle: Math.round(settle), scrollAt300, y: window.scrollY };
}, { y, clip });
const zoneOf = (clip) => p.evaluate((clip) => {
  for (const cv of document.querySelectorAll("canvas[data-zones]")) {
    const z = JSON.parse(cv.dataset.zones || "[]").find((q) => q.clip === clip || q.clip.endsWith("-" + clip));
    if (z) return z;
  }
  return null;
}, clip);

let bad = 0, total = 0;
const report = [];
for (const [name, clip, first, len] of JOINS) {
  // a film publishes its zones only once its section has been near the screen: walk down the page until this clip's zone shows up
  let z = await zoneOf(clip);
  for (let y = 0; y < 40000 && !z; y += 500) {
    await p.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);
    await p.waitForTimeout(80);
    z = await zoneOf(clip);
  }
  if (!z) { report.push(`${name}: zone not found`); bad++; continue; }
  const A = first - 1, B = first + len; // clean frames either side
  const lo = Math.floor(z.y) - 6, hi = Math.ceil(z.y + z.h) + 6;
  let worst = 0, joinStops = 0, n = 0, hops = 0;
  const ys = []; for (let y = lo; y <= hi; y++) ys.push(y);
  for (const order of [ys, [...ys].reverse()]) {
    await stop(order[0] + (order[0] === lo ? -40 : 40), clip); // approach from outside the zone
    for (const y of order) {
      const r = await stop(y, clip);
      n++; total++;
      worst = Math.max(worst, r.settle);
      if (Math.abs(r.scrollAt300 - y) > 0.5) hops++;
      const onJoin = (r.at300 || []).some((l) => (l[0] === clip || l[0].endsWith("-" + clip)) && l[1] > A + 1e-6 && l[1] < B - 1e-6);
      if (onJoin) { joinStops++; bad++; console.log(`  REST ON JOIN ${name} y=${y} frames=${JSON.stringify(r.at300)}`); }
    }
  }
  report.push(`${name} (frames ${first}-${first + len - 1}): zone y ${z.y.toFixed(1)}..${(z.y + z.h).toFixed(1)}, ${n} stops, ${joinStops} rested on a join frame, ${hops} hopped (<=4 px), worst settle ${worst} ms`);
}
console.log(report.join("\n"));
console.log(`TOTAL ${total} stops, ${bad} on a join frame (must be 0). console errors: ${errs.length}`);
await b.close();
process.exit(bad ? 1 : 0);

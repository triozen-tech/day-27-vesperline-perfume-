// Asset listing (raw/, public/frames/, public/images/, public/videos/, cover.jpg go into the day's repo).
//   npm run assets   → table of asset folders + biggest file. Information only: there is NO size limit or warning.
// The best output matters more than file size: full-resolution stills, WebP q90+ and full-quality frames.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ASSETS = ["raw", "public/frames", "public/images", "public/videos", "cover.jpg"];
const MB = 1024 * 1024;
const files = [];
const walk = (p) => {
  if (!existsSync(p)) return;
  const s = statSync(p);
  if (s.isFile()) return void (p.endsWith(".DS_Store") || files.push({ p, size: s.size }));
  for (const f of readdirSync(p)) walk(join(p, f));
};
ASSETS.forEach(walk);

const total = files.reduce((a, f) => a + f.size, 0);
const big = files.reduce((a, f) => (f.size > (a?.size ?? 0) ? f : a), null);
for (const a of ASSETS) {
  const sum = files.filter((f) => f.p === a || f.p.startsWith(a + "/")).reduce((s, f) => s + f.size, 0);
  if (sum) console.log(`  ${a.padEnd(15)} ${(sum / MB).toFixed(1).padStart(7)} MB`);
}
console.log(`  ${"total".padEnd(15)} ${(total / MB).toFixed(1).padStart(7)} MB · biggest: ${big ? `${big.p} (${(big.size / MB).toFixed(1)} MB)` : "—"}`);
console.log("assets OK (no size limit)");

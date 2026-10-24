"use client";

import { useEffect } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

// M456 · tracing beam, pinned, a pure function of scroll. The track is as tall as the stage plus PIN px; the stage
// is CSS sticky, so it releases exactly when the track ends. Progress p (0..1) drives: the beam down the clock rail
// (its tail stretches with scroll speed), the active clock step, the three note bars (top fades, heart swells,
// base grows), the glow behind the bottle and the stain on the blotter strip. Dwell at each step so it can be read.
const PIN = 2800;
const STEPS = 3; // 4 steps = 3 gaps
// bar heights (%) at 0 min, 15 min, 3 h, 8 h
const BARS = [
  [96, 6, 4],
  [70, 42, 10],
  [28, 76, 42],
  [12, 38, 92],
];
const GLOW = ["#f3d9a4", "#e9b6d2", "#b9a6f2", "#7a64c8"];
const STAIN = [
  { s: 1.5, o: 1 },
  { s: 1.15, o: 0.85 },
  { s: 0.85, o: 0.6 },
  { s: 0.6, o: 0.45 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
/** progress -> position along the steps (0..3) with a dwell around each step */
function along(p: number) {
  const u = Math.min(STEPS, Math.max(0, p * STEPS));
  const i = Math.min(STEPS - 1, Math.floor(u));
  const f = u - i;
  return i + smooth(Math.min(1, Math.max(0, (f - 0.25) / 0.5)));
}

export default function DryMotion() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const track = document.getElementById("drydown-track");
    const sec = track?.querySelector<HTMLElement>(".v-dry");
    if (!track || !sec) return;
    const lis = Array.from(sec.querySelectorAll<HTMLElement>(".v-clock li"));
    const bars = Array.from(sec.querySelectorAll<HTMLElement>(".v-bar i"));
    const stain = sec.querySelector<HTMLElement>(".v-blotter-stain");
    const glow = sec.querySelector<HTMLElement>(".v-dry-glow");
    const fillEl = sec.querySelector<HTMLElement>(".v-beam-fill");
    const head = sec.querySelector<HTMLElement>(".v-beam-head");
    const rail = sec.querySelector<HTMLElement>(".v-beam");
    const mix = gsap.utils.interpolate;

    track.style.height = `${sec.offsetHeight + PIN}px`;
    let top = 0;
    const measure = () => {
      track.style.height = `${sec.offsetHeight + PIN}px`;
      top = track.getBoundingClientRect().top + window.scrollY;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    let lastY = window.scrollY;
    let vel = 0;
    let active = -1;
    const tick = () => {
      const y = window.scrollY;
      vel += ((y - lastY) - vel) * 0.18; // smoothed px per frame
      lastY = y;
      const p = Math.min(1, Math.max(0, (y - top) / PIN));
      const a = along(p);
      const i = Math.min(STEPS - 1, Math.floor(a));
      const f = a - i;

      const step = Math.round(a);
      if (step !== active) {
        active = step;
        lis.forEach((li, k) => li.classList.toggle("is-on", k === step));
      }
      bars.forEach((b, k) => {
        const v = mix(BARS[i][k], BARS[i + 1][k], f);
        b.style.height = `${v.toFixed(1)}%`;
        b.style.opacity = String((0.55 + 0.45 * Math.min(1, v / 60)).toFixed(2));
      });
      const g = mix(GLOW[i], GLOW[i + 1], f) as string;
      if (glow) glow.style.background = `radial-gradient(ellipse 50% 60% at 17% 78%, ${g}, transparent 70%)`;
      if (stain) {
        const sa = mix(STAIN[i].s, STAIN[i + 1].s, f);
        const so = mix(STAIN[i].o, STAIN[i + 1].o, f);
        stain.style.transform = `scale(${sa.toFixed(3)})`;
        stain.style.opacity = so.toFixed(3);
      }
      // beam: down the rail with p, tail stretches with speed; the head dot fills once it starts
      if (rail && fillEl && head) {
        const h = rail.clientHeight;
        const pos = a / STEPS;
        const tail = Math.min(0.5, 0.12 + Math.abs(vel) * 0.006);
        const from = Math.max(0, pos - tail);
        fillEl.style.top = `${(from * h).toFixed(1)}px`;
        fillEl.style.height = `${((pos - from) * h).toFixed(1)}px`;
        head.style.transform = `translate(-50%, ${(pos * h - 8).toFixed(1)}px)`;
        head.style.opacity = p > 0 ? "1" : "0.55";
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      track.style.height = "";
    };
  }, []);
  return null;
}

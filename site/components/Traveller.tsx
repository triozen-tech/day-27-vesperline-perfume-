"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { BOTTLE } from "../content";
import { onLift } from "../lift";
import { tint } from "../tint";

// F1 · waypoint travel (+ F8 landing), centre version. One glass bottle floats in the middle of the screen, soft and
// slightly blurred, BEHIND the text (headings and cards sit above it), riding a tall page-length glass strip. When a
// section's slot (data-anchor) comes near, the bottle drifts out of the centre, sharpens, tilts and glows, then lands in
// the slot (a ring ripples out as it arrives) and lifts off again when the section has passed. Everything is a pure
// function of scroll, with an idle bob. data-hide anchors: it fades out on the way in (Dry-down, Reviews, FAQ).
// ?static=1: this component renders nothing and the static bottles stay.
const CH = 520; // bottle height while floating in the centre
const CX = 720;
const NAV_CLEAR = 100; // viewport y below the floating nav pill
const RAMP = 460; // scroll distance of each hand-over
const H0 = 600; // drawn size; scale does the rest
const W0 = (H0 * 673) / 1203;
const MINI = 100;

type A = { name: string; x: number; y: number; h: number; top: number; hide: boolean; land: boolean; from: number; to: number };
type S = { x: number; y: number; h: number; o: number; rot: number; pop: number; blur: number; glow: number; ring: number; rx: number; ry: number };

export default function Traveller() {
  const layer = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = img.current;
    if (!el) return;
    const root = document.documentElement;
    root.classList.add("v-travel");
    const s: S = { x: 0, y: 0, h: 400, o: 0, rot: 0, pop: 0, blur: 0, glow: 0, ring: 0, rx: 0, ry: 0 };
    const intro = { k: 0, bob: 0 };

    const measure = (): A[] => {
      const vh = window.innerHeight;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const track = document.getElementById("drydown-track");
      const out: A[] = [];
      document.querySelectorAll<HTMLElement>("[data-anchor]").forEach((a) => {
        const im = a.matches("img") ? a : a.querySelector("img") ?? a;
        const r = im.getBoundingClientRect();
        let y = r.top + window.scrollY + r.height / 2;
        let from: number;
        let to: number;
        const hide = a.hasAttribute("data-hide");
        const dry = a.dataset.anchor === "drydown" && track;
        if (dry) {
          // sticky stage: page y = track top + the bottle's offset inside the stage (stable while it sticks)
          const sec = track.querySelector<HTMLElement>(".v-dry")!;
          const tr = track.getBoundingClientRect();
          y = tr.top + window.scrollY + (r.top - sec.getBoundingClientRect().top) + r.height / 2;
          from = tr.top + window.scrollY - 200;
          to = tr.top + window.scrollY + (track.offsetHeight - sec.offsetHeight) + 500; // the band has mostly left
        } else {
          from = y - vh * 0.75;
          to = y + vh * 0.5 + r.height / 2 - 40; // stays in its slot while the slot is on screen
        }
        const sect = a.closest<HTMLElement>("section, footer, #drydown-track");
        out.push({
          name: a.dataset.anchor ?? "",
          top: sect ? sect.getBoundingClientRect().top + window.scrollY : y,
          x: r.left + window.scrollX + r.width / 2,
          y,
          h: Math.max(r.height, 0) || MINI,
          hide,
          land: a.hasAttribute("data-land") || a.dataset.anchor === "shelf",
          from: Math.min(max, Math.max(0, from)),
          to: Math.min(max, Math.max(0, to)),
        });
      });
      // holds never overlap: each ends before the next one starts
      for (let i = 0; i < out.length - 1; i++) out[i].to = Math.max(out[i].from, Math.min(out[i].to, out[i + 1].from - RAMP)); // leaves a full hand-over stretch before the next slot
      return out;
    };

    let A: A[] = [];
    const build = () => {
      A = measure();
      const end = Math.min(document.documentElement.scrollHeight, (document.querySelector<HTMLElement>(".v-footer")?.offsetTop ?? 9000) + 400);
      if (strip.current) strip.current.style.height = `${end}px`;
    };

    const sm = (x: number) => x * x * (3 - 2 * x);
    const place = (t: number) => {
      const sy = window.scrollY;
      const vh = window.innerHeight;
      let wc = 1;
      let wsum = 0;
      let x = 0;
      let y = 0;
      let h = 0;
      let o = 0;
      let land = 0;
      let ring = 0;
      let rx = 0;
      let ry = 0;
      const rest = sm(Math.min(1, sy / 140)); // at the top of the page the bottle sits exactly on the hero slot (the loader's bottle is there)
      for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const d = sy < a.from ? a.from - sy : sy > a.to ? sy - a.to : 0;
        const w = d >= RAMP ? 0 : sm(1 - d / RAMP) * (i === 0 ? 1 : rest);
        if (!w) continue;
        wc *= 1 - w;
        wsum += w;
        // a hidden anchor keeps the bottle in the centre of the screen and just fades it
        x += w * (a.hide ? CX : a.x);
        y += w * (a.hide ? sy + vh / 2 : a.y);
        h += w * (a.hide ? CH : a.h);
        o += w * (a.hide ? 0 : 1);
        if (a.land && sy >= a.from) land = Math.max(land, Math.sin(Math.PI * Math.min(1, (sy - a.from) / 200)));
        if (w > 0.97 && sy >= a.from) {
          const p = Math.min(1, (sy - a.from) / 320);
          if (p < 1 && p >= ring) {
            ring = p;
            rx = a.x;
            ry = a.y;
          }
        }
      }
      const cy = sy + vh / 2;
      const tot = wc + wsum;
      s.x = (wc * CX + x) / tot;
      s.y = (wc * cy + y) / tot;
      s.h = (wc * CH + h) / tot;
      s.o = (wc * 0.55 + o) / tot;
      s.rot = 14 * wc * Math.sin(sy / 330);
      s.blur = 2.6 * wc;
      s.glow = 4 * wc * (1 - wc);
      s.pop = land;
      s.ring = ring;
      s.rx = rx;
      s.ry = ry;
      void t;
    };

    const draw = (t: number) => {
      place(t);
      const bob = Math.sin(t * 1.5) * 8 * intro.bob;
      const sway = Math.sin(t * 0.9) * 1.6 * intro.bob;
      const sc = (s.h / H0) * (1 + 0.05 * s.pop);
      // never rises under the nav pill: its top stays below the pill, the page text carries on up without it
      const y = Math.max(s.y + bob, window.scrollY + NAV_CLEAR + (s.h * (1 + 0.05 * s.pop)) / 2);
      el.style.transform = `translate(${(s.x - W0 / 2).toFixed(1)}px, ${(y - H0 / 2).toFixed(1)}px) rotate(${(s.rot + sway).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      el.style.filter = `blur(${s.blur.toFixed(2)}px) brightness(${(1 + 0.22 * s.glow).toFixed(3)}) drop-shadow(0 24px 30px rgba(91, 75, 154, ${(0.26 + 0.2 * s.glow).toFixed(3)})) hue-rotate(${tint.hue.toFixed(1)}deg)`;
      el.style.opacity = String(Math.max(0, Math.min(1, s.o * intro.k)).toFixed(3));
      if (strip.current) strip.current.style.opacity = (0.55 * Math.max(0, Math.min(1, s.o / 0.55 > 1 ? 1 : s.o / 0.55))).toFixed(3);
      const g = glow.current;
      if (g) {
        g.style.transform = `translate(${(s.x - 80).toFixed(1)}px, ${(y - 320).toFixed(1)}px)`;
        g.style.opacity = String(Math.min(1, 0.35 + 0.65 * s.glow) * Math.min(1, s.o * 1.6) * intro.k);
      }
      const r = ring.current;
      if (r) {
        const p = s.ring;
        r.style.transform = `translate(${(s.rx - 90).toFixed(1)}px, ${(s.ry - 90).toFixed(1)}px) scale(${(0.5 + 2.2 * p).toFixed(3)})`;
        r.style.opacity = p > 0 ? String(((1 - p) * 0.55).toFixed(3)) : "0";
      }
    };
    const tick = (t: number) => {
      draw(t);
    };

    build();
    gsap.ticker.add(tick);
    let t0 = 0;
    const later = () => {
      clearTimeout(t0);
      t0 = window.setTimeout(build, 150);
    };
    const ro = new ResizeObserver(later);
    ro.observe(document.body);
    document.fonts?.ready.then(later);
    window.addEventListener("load", later);
    window.addEventListener("resize", later);
    const late = window.setTimeout(build, 1500);
    const off = onLift(() => {
      // the loader's bottle sits in the same spot: fade in under it, then let the float ease in
      gsap.to(intro, { k: 1, duration: 0.25, ease: "none" });
      gsap.to(intro, { bob: 1, duration: 1.6, ease: "sine.inOut" });
    });

    return () => {
      off();
      clearTimeout(t0);
      clearTimeout(late);
      ro.disconnect();
      window.removeEventListener("load", later);
      window.removeEventListener("resize", later);
      gsap.ticker.remove(tick);
      root.classList.remove("v-travel");
    };
  }, []);

  return (
    <div ref={layer} className="v-trav" aria-hidden>
      <div ref={strip} className="v-trav-strip" />
      <div ref={glow} className="v-trav-glow" />
      <div ref={ring} className="v-trav-ring" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={BOTTLE} alt="" draggable={false} width={W0} height={H0} style={{ width: W0, height: H0 }} />
    </div>
  );
}

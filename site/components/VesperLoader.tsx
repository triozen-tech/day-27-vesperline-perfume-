"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { BOTTLE } from "../content";
import { lift } from "../lift";

// I50 · Drops on a scale. Lilac drops fall into the empty glass bottle one by one (each with a ripple, the liquid
// rises), a perfumer's scale readout counts 0.00 → 30.00 g with the drops, then the cap drops on, four note words
// pop out and settle (blurred) as the hero's chips, and the curtain lifts. The count is real progress: fonts + the
// bottle image; it stalls while they load and finishes anyway after 6 s. The bottle sits exactly where the hero's
// traveller bottle does, so the hand-over has no jump.
const BH = 420; // hero bottle height
const BW = (BH * 673) / 1203;
const TOP = 118; // hero bottle top
const K = BH / 1203; // screen px per image px
const CAP_Y = 264; // image y where the cap ends and the glass body starts
const SURF_FULL = 428; // liquid surface when full (image y)
const SURF_EMPTY = 1052; // liquid surface when empty
const N = 8; // drops
const GRAMS = 30;
const RATE = 1 / 1.15; // progress per second once started (a full run takes ≈ 1.15 s when nothing is slow)
const GIVE_UP = 6000;
const WORDS = ["bergamot", "iris", "cedar", "amber"];
const pct = (y: number) => ((y / 1203) * 100).toFixed(2);

export default function VesperLoader() {
  const curtain = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bottle = useRef<HTMLDivElement>(null);
  const empty = useRef<HTMLImageElement>(null);
  const liquid = useRef<HTMLImageElement>(null);
  const cap = useRef<HTMLImageElement>(null);
  const full = useRef<HTMLImageElement>(null);
  const digits = useRef<(HTMLSpanElement | null)[]>([]);
  const bar = useRef<HTMLElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setGone(true);
      lift();
      return;
    }
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    window.__lenis?.stop();

    const st = { p: 0 };
    const level = { v: 0 };
    const gv = { v: 0 };
    const imp = { v: 0 }; // surface ripple impulse
    let fonts = false;
    let img = false;
    let forced = false;
    let started = false;
    let released = 0;
    let landed = 0;
    let finished = false;
    let seq: gsap.core.Timeline | null = null;
    const D = digits.current;

    const draw = (t: number) => {
      // liquid surface: a gentle wave that kicks up when a drop lands
      const sy = SURF_EMPTY + (SURF_FULL - SURF_EMPTY) * level.v;
      const amp = 2.5 + 10 * imp.v;
      const pts: string[] = [];
      for (let i = 0; i <= 24; i++) {
        const x = (i * 100) / 24;
        pts.push(`${x.toFixed(2)}% ${pct(sy + amp * Math.sin(t * 6 + x * 0.16) + amp * 0.4 * Math.sin(t * 9.1 + x * 0.31))}%`);
      }
      if (empty.current) empty.current.style.clipPath = `polygon(0% ${pct(CAP_Y)}%, 100% ${pct(CAP_Y)}%, ${[...pts].reverse().join(",")})`;
      if (liquid.current) liquid.current.style.clipPath = `polygon(${pts.join(",")}, 100% 100%, 0% 100%)`;
      // scale readout, fixed-width cells so nothing jitters
      const s = Math.min(GRAMS, gv.v).toFixed(2).padStart(5, "0"); // "07.50"
      if (D[0]) {
        D[0].textContent = s[0];
        D[0].style.visibility = s[0] === "0" ? "hidden" : "visible";
      }
      if (D[1]) D[1].textContent = s[1];
      if (D[2]) D[2].textContent = s[3];
      if (D[3]) D[3].textContent = s[4];
      if (bar.current) bar.current.style.transform = `scaleX(${(gv.v / GRAMS).toFixed(4)})`;
    };

    const ripple = (y: number) => {
      const r = document.createElement("i");
      r.className = "v-ld-ripple";
      r.style.top = `${y - 6}px`;
      stage.current?.appendChild(r);
      gsap.fromTo(r, { scale: 0.3, opacity: 0.85 }, { scale: 1.7, opacity: 0, duration: 0.5, ease: "power2.out", onComplete: () => r.remove() });
    };

    const release = (k: number) => {
      const el = document.createElement("i");
      el.className = "v-ld-drop";
      stage.current?.appendChild(el);
      const endY = TOP + (SURF_EMPTY + (SURF_FULL - SURF_EMPTY) * ((k - 1) / N)) * K;
      gsap.fromTo(
        el,
        { y: -40, scaleY: 1.4, transformOrigin: "50% 0%" },
        {
          y: endY - 20,
          scaleY: 1.1,
          duration: 0.34,
          ease: "power2.in",
          onComplete: () => {
            el.remove();
            ripple(endY);
            gsap.to(level, { v: k / N, duration: 0.28, ease: "power2.out", overwrite: "auto" });
            gsap.to(gv, { v: (k * GRAMS) / N, duration: 0.26, ease: "power1.out", overwrite: "auto" });
            gsap.fromTo(imp, { v: 1 }, { v: 0, duration: 0.6, ease: "power2.out", overwrite: "auto" });
            landed++;
            if (landed === N) finishSeq();
          },
        },
      );
    };

    let lastT = 0;
    const tick = (time: number) => {
      draw(time);
      const dt = Math.min(0.05, time - lastT);
      lastT = time;
      if (!started) return;
      const target = forced || (fonts && img) ? 1 : 0.1 + (fonts ? 0.4 : 0) + (img ? 0.4 : 0);
      st.p = Math.min(target, st.p + dt * RATE * (forced ? 4 : 1));
      while (released < N && st.p >= (released + 1) / N - 1e-6) release(++released);
    };
    gsap.ticker.add(tick);

    const finish = () => {
      if (finished) return;
      finished = true;
      gsap.ticker.remove(tick);
      window.__lenis?.start();
      setGone(true);
    };

    function finishSeq() {
      const tl = gsap.timeline();
      seq = tl;
      // the cap drops on from above the screen, one small bounce
      tl.fromTo(cap.current, { y: -(TOP + 140), opacity: 1 }, { y: 0, duration: 0.34, ease: "power3.in" });
      tl.to(bottle.current, { y: 4, duration: 0.07, ease: "power2.out" });
      tl.to(cap.current, { y: -9, duration: 0.09, ease: "power2.out" }, "<");
      tl.to(cap.current, { y: 0, duration: 0.11, ease: "power2.in" });
      tl.to(bottle.current, { y: 0, duration: 0.14, ease: "power2.out" }, "<");
      tl.call(() => {
        // one whole image from here on, so the hand-over bottle is the real one
        if (full.current) full.current.style.opacity = "1";
        [empty.current, liquid.current, cap.current].forEach((e) => e && (e.style.display = "none"));
      });
      // note words pop out of the cap and settle, blurred, on their hero chips
      const real = gsap.utils.toArray<HTMLElement>("[data-hero] .v-chip").filter((c) => WORDS.includes(c.textContent ?? ""));
      const pops: HTMLElement[] = [];
      const popAt = tl.duration();
      real.forEach((r, i) => {
        const b = r.getBoundingClientRect();
        const c = r.cloneNode(true) as HTMLElement;
        c.style.left = `${b.left}px`;
        c.style.top = `${b.top}px`;
        c.style.zIndex = "5";
        stage.current?.appendChild(c);
        pops.push(c);
        gsap.set(c, { x: 720 - (b.left + b.width / 2), y: TOP + 50 - (b.top + b.height / 2), scale: 0.2, opacity: 0, filter: "blur(0px)" });
        tl.to(c, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "back.out(1.5)" }, popAt + i * 0.05);
      });
      tl.to(pops, { filter: "blur(8px)", opacity: 0.4, duration: 0.3, ease: "power2.inOut" }, popAt + 0.36);
      // the curtain lifts; the traveller takes over the bottle underneath, then the stage goes
      tl.call(() => lift(), [], popAt + 0.4);
      tl.to(curtain.current, { yPercent: -100, duration: 0.6, ease: "power3.inOut" }, popAt + 0.4);
      tl.call(
        () => {
          if (stage.current) stage.current.style.display = "none";
        },
        [],
        popAt + 0.8,
      );
      tl.call(finish, [], popAt + 0.98);
    }

    // ready = fonts + the bottle image decoded (6 s at most)
    document.fonts?.ready.then(() => (fonts = true));
    const im = new Image();
    im.src = BOTTLE;
    im.decode().then(
      () => (img = true),
      () => (img = true),
    );
    const giveUp = window.setTimeout(() => (forced = true), GIVE_UP);
    const hard = window.setTimeout(() => {
      if (finished) return;
      seq?.kill();
      lift();
      finish();
    }, GIVE_UP + 4000);

    // short intro: the empty bottle fades in, then the count starts
    gsap.fromTo(bottle.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", onComplete: () => (started = true) });

    return () => {
      clearTimeout(giveUp);
      clearTimeout(hard);
      gsap.ticker.remove(tick);
      seq?.kill();
    };
  }, []);

  if (gone) return null;
  return (
    <div data-loader className="v-loader" aria-hidden>
      <div ref={curtain} className="v-ld-curtain">
        <p className="v-ld-brand font-display">Vesperline</p>
        <div className="v-ld-scale">
          <p className="v-ld-cap">Perfumer&apos;s scale · net</p>
          <p className="v-ld-read font-display">
            <span ref={(e) => void (digits.current[0] = e)}>0</span>
            <span ref={(e) => void (digits.current[1] = e)}>0</span>
            <span className="v-ld-pt">.</span>
            <span ref={(e) => void (digits.current[2] = e)}>0</span>
            <span ref={(e) => void (digits.current[3] = e)}>0</span>
            <span className="v-ld-unit">g</span>
          </p>
          <span className="v-ld-track">
            <i ref={bar} />
          </span>
        </div>
      </div>
      <div ref={stage} className="v-ld-stage">
        <div ref={bottle} className="v-ld-bottle" style={{ top: TOP, height: BH, width: BW, marginLeft: -BW / 2 }}>
          {/* eslint-disable @next/next/no-img-element */}
          <img ref={empty} src={BOTTLE} alt="" className="v-ld-img v-ld-empty" draggable={false} />
          <img ref={liquid} src={BOTTLE} alt="" className="v-ld-img" draggable={false} />
          <img ref={cap} src={BOTTLE} alt="" className="v-ld-img" draggable={false} style={{ opacity: 0, clipPath: `inset(0 0 ${(100 - (CAP_Y / 1203) * 100).toFixed(2)}% 0)` }} />
          <img ref={full} src={BOTTLE} alt="" className="v-ld-img" draggable={false} style={{ opacity: 0 }} />
          {/* eslint-enable @next/next/no-img-element */}
        </div>
      </div>
    </div>
  );
}

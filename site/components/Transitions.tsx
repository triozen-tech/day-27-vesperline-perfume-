"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

// Section hand-overs, pure functions of scroll:
//   X6  circle iris : a dark circle opens from the screen centre as the Dry-down band rises, and becomes the band
//   X15 vignette    : after the band releases, a dark vignette peaks and clears while the band leaves
export default function Transitions() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const iris = a.current!;
    const vig = b.current!;
    const track = document.getElementById("drydown-track");
    if (!track) return;
    const R = Math.hypot(window.innerWidth / 2, window.innerHeight / 2);
    const tick = () => {
      const top = track.getBoundingClientRect().top;
      const vh = window.innerHeight;
      // X6: band top from 0.85·vh down to 0 → radius 0 → corner
      const p = Math.min(1, Math.max(0, (vh * 0.85 - top) / (vh * 0.85)));
      if (p > 0 && p < 1) {
        iris.style.visibility = "visible";
        iris.style.clipPath = `circle(${(p * p * R).toFixed(1)}px at 50% 50%)`;
      } else iris.style.visibility = "hidden";
      // X15: from the pin release (track top = -2800) over 900 px
      const rel = (-top - (track.offsetHeight - vh)) / 900;
      if (rel > 0 && rel < 1) {
        vig.style.visibility = "visible";
        vig.style.opacity = Math.sin(rel * Math.PI).toFixed(3);
      } else vig.style.visibility = "hidden";
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      <div ref={a} className="v-x v-x6" aria-hidden />
      <div ref={b} className="v-x v-x15" aria-hidden />
    </>
  );
}

"use client";

import { useEffect } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";
import { onLift } from "../lift";

// M50 · rack focus through the note chips. Chips start blurred (8px max, chips only) and sharpen one by one, near
// ones first; the title arrives after the bottle has settled. Afterwards the chips drift on their own and shift
// a little with the scroll, so the hero is alive when it is still. ?static=1: nothing runs.
export default function HeroMotion() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) return;
    const chips = gsap.utils.toArray<HTMLElement>(".v-chip", hero).sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth));
    const chars = gsap.utils.toArray<HTMLElement>(".v-ch", hero);
    const sub = hero.querySelector<HTMLElement>(".v-hero-sub");

    gsap.set(chips, { filter: "blur(8px)", opacity: 0.4 });
    gsap.set(chars, { yPercent: 40, opacity: 0 });
    gsap.set(sub, { opacity: 0, y: 14 });

    let tl: gsap.core.Timeline | null = null;
    const drifts: gsap.core.Tween[] = [];
    const scrolls: gsap.core.Tween[] = [];

    const off = onLift(() => {
      tl = gsap.timeline();
      // the bottle (the traveller) settles on its own for 1.4 s; chips pull focus from 0.5 s
      tl.to(chips, { filter: "blur(0px)", opacity: 1, duration: 0.9, ease: "power2.out", stagger: 0.17 }, 0.5);
      tl.to(chars, { yPercent: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.05 }, 1.1);
      tl.to(sub, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 1.9);
      // calm drift (y only, +- a few px by depth) and a scroll shift
      chips.forEach((c, i) => {
        const d = Number(c.dataset.depth);
        drifts.push(gsap.to(c, { y: (i % 2 ? -1 : 1) * (5 + d * 3), duration: 3 + (i % 4) * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.2 }));
        scrolls.push(gsap.to(c, { yPercent: -(8 + d * 10), ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } }));
      });
    });

    return () => {
      off();
      tl?.kill();
      drifts.forEach((t) => t.kill());
      scrolls.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
      ScrollTrigger.refresh();
    };
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger, SplitText, prefersReducedMotion } from "@/lib/gsap";
import { tint } from "../tint";

// Round 3: section motion (one code per section, see DESIGN.md) + the hover / click interactions.
// Clicks work in both modes; every scroll motion is skipped under ?static=1 (sections show their final state).
export default function SectionMotion() {
  useEffect(() => {
    const still = prefersReducedMotion();
    const $ = <T extends Element = HTMLElement>(q: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(q));
    const cleanups: Array<() => void> = [];
    const on = (t: EventTarget, e: string, f: (ev: Event) => void) => {
      t.addEventListener(e, f);
      cleanups.push(() => t.removeEventListener(e, f));
    };

    /* ---------- finder (M421): the active family follows the scroll; a click picks one for a while ---------- */
    const tiles = $<HTMLButtonElement>(".v-tile");
    const fb = $(".v-finder-bottle")[0];
    let manualUntil = 0;
    let cur = -1;
    const setFamily = (i: number) => {
      if (i === cur || !tiles[i]) return;
      cur = i;
      tiles.forEach((t, k) => t.classList.toggle("is-on", k === i));
      const cs = getComputedStyle(tiles[i]);
      fb?.style.setProperty("--t1", cs.getPropertyValue("--tint").trim());
      fb?.style.setProperty("--t2", cs.getPropertyValue("--tint2").trim());
      tint.target = Number(tiles[i].dataset.hue ?? 0);
    };
    tiles.forEach((t, i) =>
      on(t, "click", () => {
        manualUntil = performance.now() + 3000;
        setFamily(i);
      }),
    );
    setFamily(0);
    const finder = document.getElementById("finder");

    /* ---------- shelf: size chips with a sliding pill, price per size, Add to cart ---------- */
    const setSize = (card: Element, k: number) => {
      const chips = card.querySelector<HTMLElement>(".v-chips");
      chips?.style.setProperty("--k", String(k));
      card.querySelectorAll<HTMLElement>(".v-size").forEach((c, j) => c.classList.toggle("is-on", j === k));
      const amt = card.querySelector<HTMLElement>(".v-amt");
      const d = (card as HTMLElement).dataset;
      if (amt) amt.textContent = [d.p10, d.p30, d.p50][k] ?? amt.textContent;
    };
    $(".v-card").forEach((card) => {
      let base = 1;
      let hot = false;
      const peek = (v: boolean) => {
        if (v === hot) return;
        hot = v;
        const now = Number(card.querySelector<HTMLElement>(".v-chips")?.style.getPropertyValue("--k") || 1);
        if (v) {
          base = now;
          setSize(card, base === 2 ? 0 : 2); // the card shows another size while pointed at
        } else setSize(card, base);
      };
      on(card, "mouseenter", () => peek(true));
      on(card, "mouseleave", () => peek(false));
      const mo = new MutationObserver(() => peek(card.classList.contains("is-hover")));
      mo.observe(card, { attributes: true, attributeFilter: ["class"] });
      cleanups.push(() => mo.disconnect());
      card.querySelectorAll<HTMLElement>(".v-size").forEach((c, k) =>
        on(c, "click", () => {
          base = k;
          hot = false;
          setSize(card, k);
        }),
      );
    });
    // buy box: follows the card being pointed at (Noor Glass by default); swatches tint that card's bottle
    const box = $(".v-buybox")[0];
    const cards = $(".v-card");
    let activeCard = cards[1];
    let sw = 0;
    const baseHue = (c: Element) => Number(/hue-rotate\((-?[\d.]+)deg\)/.exec(c.querySelector<HTMLElement>(".v-card-photo img")?.style.filter ?? "")?.[1] ?? 0);
    const hues = new Map<Element, number>(cards.map((c) => [c, baseHue(c)]));
    const paintBox = () => {
      if (!box || !activeCard) return;
      const idx = cards.indexOf(activeCard);
      const name = activeCard.querySelector("h3")!.textContent!;
      const k = Number(activeCard.querySelector<HTMLElement>(".v-chips")?.style.getPropertyValue("--k") || 1);
      box.querySelector(".v-buy-name")!.textContent = name;
      box.querySelector(".v-buy-size")!.textContent = ["10 ml", "30 ml", "50 ml"][k];
      box.querySelector(".v-buy-amt")!.textContent = activeCard.querySelector(".v-amt")!.textContent;
      const bb = box.querySelector<HTMLElement>(".v-buy-bottle")!;
      bb.style.filter = `hue-rotate(${(hues.get(activeCard) ?? 0) + sw}deg)`;
      cards.forEach((c, i) => c.classList.toggle("is-pick", i === idx));
    };
    const applySwatch = (off: number) => {
      sw = off;
      const img = activeCard.querySelector<HTMLElement>(".v-card-photo img");
      if (img) img.style.filter = `hue-rotate(${(hues.get(activeCard) ?? 0) + off}deg)`;
      tint.shelf = activeCard.querySelector("[data-anchor]") ? off : 0;
      paintBox();
    };
    cards.forEach((c) => {
      const pickIt = () => {
        if (c === activeCard) return;
        activeCard = c;
        sw = 0;
        $(".v-sw").forEach((x, j) => x.classList.toggle("is-on", j === 0));
        tint.shelf = 0;
        paintBox();
      };
      on(c, "mouseenter", pickIt);
      const mo2 = new MutationObserver(() => c.classList.contains("is-hover") && pickIt());
      mo2.observe(c, { attributes: true, attributeFilter: ["class"] });
      cleanups.push(() => mo2.disconnect());
      on(c, "click", pickIt);
      c.querySelectorAll(".v-size").forEach((z) => on(z, "click", () => setTimeout(paintBox, 0)));
    });
    $<HTMLButtonElement>(".v-sw").forEach((b) => on(b, "click", () => {
      $(".v-sw").forEach((x) => x.classList.toggle("is-on", x === b));
      applySwatch(Number(b.dataset.off));
    }));
    $<HTMLButtonElement>(".v-buy-add").forEach((b) => on(b, "click", () => activeCard.querySelector<HTMLButtonElement>(".v-add")?.click()));
    if (box) { const mo3 = new MutationObserver(paintBox); cards.forEach((c) => mo3.observe(c.querySelector(".v-amt")!, { childList: true, characterData: true, subtree: true })); cleanups.push(() => mo3.disconnect()); }
    paintBox();

    const bag = $("b", $(".v-bag")[0] ?? document.body)[0];
    $<HTMLButtonElement>(".v-card .v-add").forEach((btn) => {
      let t = 0;
      on(btn, "click", () => {
        const card = btn.closest(".v-card")!;
        card.classList.remove("is-added");
        void (card as HTMLElement).offsetWidth;
        card.classList.add("is-added");
        btn.textContent = "Added ✓";
        if (bag && !btn.dataset.done) {
          btn.dataset.done = "1";
          bag.textContent = String(Number(bag.textContent) + 1);
          if (!still) gsap.fromTo(bag, { y: -10, scale: 1.5 }, { y: 0, scale: 1, duration: 0.6, ease: "back.out(2)", clearProps: "transform" });
        }
        clearTimeout(t);
        t = window.setTimeout(() => {
          card.classList.remove("is-added");
          btn.textContent = "Add";
          delete btn.dataset.done;
          if (bag) bag.textContent = String(Math.max(0, Number(bag.textContent) - 1));
        }, 2600);
      });
    });

    /* ---------- consult: pick a day / slot ---------- */
    const pick = (sel: string) =>
      $(sel).forEach((b) => {
        if (b.classList.contains("is-off")) return;
        on(b, "click", () => {
          $(sel).forEach((x) => x.classList.toggle("is-on", x === b));
        });
      });
    pick(".v-day");
    pick(".v-slot");

    /* ---------- faq (M172): squeeze accordion, one item open ---------- */
    const items = $<HTMLDetailsElement>(".v-acc-item");
    const body = (d: HTMLDetailsElement) => d.querySelector<HTMLElement>("p")!;
    const closeIt = (d: HTMLDetailsElement) => {
      if (!d.open) return;
      gsap.killTweensOf(body(d));
      gsap.to(body(d), {
        height: 0,
        paddingBottom: 0,
        duration: 0.8,
        ease: "power3.inOut",
        onComplete: () => {
          d.open = false;
          gsap.set(body(d), { clearProps: "height,paddingBottom" });
        },
      });
    };
    const openIt = (d: HTMLDetailsElement) => {
      if (d.open && !gsap.isTweening(body(d))) return;
      d.open = true;
      gsap.killTweensOf(body(d));
      gsap.fromTo(body(d), { height: 0, paddingBottom: 0 }, { height: "auto", paddingBottom: 28, duration: 0.8, ease: "power3.inOut", clearProps: "height,paddingBottom" });
    };
    if (!still) {
      items.forEach((d) => {
        const sm = d.querySelector("summary")!;
        on(sm, "click", (e) => {
          e.preventDefault();
          if (d.open) closeIt(d);
          else {
            items.forEach((o) => o !== d && closeIt(o));
            openIt(d);
          }
        });
      });
    }

    if (still) return () => cleanups.forEach((f) => f());

    /* ---------- scroll motion ---------- */
    const ctx = gsap.context(() => {
      // atelier · M107 focus-blur resolve
      const big = $(".v-atelier .v-big")[0];
      if (big) gsap.fromTo(big, { filter: "blur(12px)" }, { filter: "blur(0px)", ease: "none", clearProps: "filter", scrollTrigger: { trigger: big, start: "top 88%", end: "top 48%", scrub: true } });

      // finder · M421 the active family follows the scroll
      if (finder)
        ScrollTrigger.create({
          trigger: finder,
          start: "top 62%",
          end: "bottom 45%",
          onUpdate: (st) => {
            if (performance.now() > manualUntil) setFamily(Math.min(3, Math.floor(st.progress * 4)));
          },
        });
      gsap.from(".v-tile", { y: 60, scale: 0.94, duration: 1, stagger: 0.1, ease: "power3.out", clearProps: "transform", scrollTrigger: { trigger: ".v-tiles", start: "top 85%", once: true } });

      // process · M126 per-word blur dissolve
      $(".v-led").forEach((li) => {
        const w = li.querySelector("[data-word-dissolve]");
        if (!w) return;
        const sp = SplitText.create(w, { type: "words" });
        gsap.fromTo(sp.words, { opacity: 0.12, filter: "blur(7px)" }, { opacity: 1, filter: "blur(0px)", stagger: 0.12, ease: "none", clearProps: "filter,opacity", scrollTrigger: { trigger: li, start: "top 86%", end: "top 52%", scrub: true } });
      });

      // shelf · M489 cards open top-down (clip only, so the landing slot never moves)
      gsap.fromTo(".v-card", { clipPath: "inset(0 0 100% 0 round 26px)" }, { clipPath: "inset(0 0 0% 0 round 26px)", duration: 1.1, stagger: 0.14, ease: "power3.out", clearProps: "clipPath", scrollTrigger: { trigger: ".v-cards", start: "top 85%", once: true } });

      // sizes · M286 title letters from both edges inward, captions rise from the edges
      const h2 = $(".v-sizes-copy h2")[0];
      if (h2) {
        const sp = SplitText.create(h2, { type: "words,chars" });
        const n = sp.chars.length;
        gsap.from(sp.chars, { yPercent: 70, opacity: 0, filter: "blur(8px)", duration: 0.8, ease: "power3.out", delay: (i: number) => Math.min(i, n - 1 - i) * 0.05, clearProps: "filter", scrollTrigger: { trigger: h2, start: "top 82%", once: true } });
      }
      gsap.from(".v-size-item figcaption", { y: 36, opacity: 0, duration: 0.9, ease: "power3.out", stagger: { each: 0.12, from: "edges" }, scrollTrigger: { trigger: ".v-lineup", start: "top 75%", once: true } });
      gsap.from(".v-shelf-line", { scaleX: 0, transformOrigin: "50% 50%", duration: 1.2, ease: "power3.inOut", scrollTrigger: { trigger: ".v-lineup", start: "top 75%", once: true } });

      // consult · M220 gradual blur edge bands while the section is on screen; days pop in from the first
      const edges = $(".v-edge");
      ScrollTrigger.create({
        trigger: "#blend",
        start: "top 30%",
        end: "bottom 70%",
        onToggle: (st) => gsap.to(edges, { opacity: st.isActive ? 1 : 0, duration: 0.6, overwrite: true }),
      });
      gsap.from(".v-day", { scale: 0.6, opacity: 0, duration: 0.5, stagger: { each: 0.018, from: "start" }, ease: "back.out(2)", clearProps: "transform", scrollTrigger: { trigger: ".v-cal", start: "top 85%", once: true } });

      // reviews · M216 group blur-slide
      gsap.from(".v-quote", { y: 36, filter: "blur(6px)", opacity: 0, duration: 1, stagger: 0.07, ease: "power3.out", clearProps: "transform,filter", scrollTrigger: { trigger: ".v-quotes", start: "top 85%", once: true } });

      // faq · M172 the second answer squeezes open by itself
      if (items[1])
        ScrollTrigger.create({
          trigger: "#faq",
          start: "top 45%",
          once: true,
          onEnter: () => gsap.delayedCall(0.5, () => { items.forEach((o) => o !== items[1] && closeIt(o)); openIt(items[1]); }),
        });

      // newsletter · M268 ink highlight sweeps across the title, then the gradient breathes
      const nt = $(".v-news-title")[0];
      if (nt) {
        const hl = { v: 0 };
        const paint = () => nt.style.setProperty("--hl", `${hl.v.toFixed(1)}%`);
        paint();
        gsap.to(hl, { v: 100, ease: "none", onUpdate: paint, scrollTrigger: { trigger: nt, start: "top 82%", end: "top 38%", scrub: true } });
        const bp = { v: 0 };
        gsap.to(bp, { v: 100, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: () => nt.style.setProperty("--bp", `${bp.v.toFixed(1)}%`) });
      }

      // footer · M700 reflection floor: the wordmark stands up from the floor
      const wm = $(".v-wm-in")[0];
      if (wm) gsap.fromTo(wm, { rotateX: 64, opacity: 0.2 }, { rotateX: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: ".v-wm", start: "top 98%", end: "bottom bottom", scrub: true } });
    });

    // the traveller wears the chosen family's tint while the finder is on screen
    const tk = () => {
      const r = finder?.getBoundingClientRect();
      const live = !!r && r.top < 650 && r.bottom > 250;
      const sr = document.getElementById("shelf")?.getBoundingClientRect();
      const shelfLive = !!sr && sr.top < 650 && sr.bottom > 250;
      const goal = live ? tint.target : shelfLive ? tint.shelf : 0;
      tint.hue += (goal - tint.hue) * 0.08;
    };
    gsap.ticker.add(tk);

    return () => {
      gsap.ticker.remove(tk);
      ctx.revert();
      cleanups.forEach((f) => f());
    };
  }, []);

  return (
    <>
      <div className="v-edge v-edge-top" aria-hidden><i /><i /><i /></div>
      <div className="v-edge v-edge-bot" aria-hidden><i /><i /><i /></div>
    </>
  );
}

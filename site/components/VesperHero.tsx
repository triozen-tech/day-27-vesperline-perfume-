import { hero } from "../content";
import Bottle from "./Bottle";
import HeroMotion from "./HeroMotion";

// HR30: note-chip cloud around the bottle (top 60%), title and line below. Chips never enter the title zone.
export default function VesperHero() {
  return (
    <section id="top" className="v-hero" data-hero data-record-time="2">
      <div className="v-hero-glow" aria-hidden />
      <div className="v-cloud" data-chip-cloud>
        {hero.chips.map((c) => (
          <span key={c.t} className="v-chip" data-depth={c.d} style={{ left: `${c.x}%`, top: `${c.y}%`, fontSize: c.s }}>
            {c.t}
          </span>
        ))}
      </div>
      <div className="v-hero-bottle">
        <Bottle h={420} anchor="hero" alt="A pale glass perfume bottle with a lilac cap" />
      </div>
      <h1 className="font-display v-hero-title" aria-label={hero.title}>
        {hero.title.split("").map((ch, i) => (
          <span key={i} className="v-ch" aria-hidden>
            {ch}
          </span>
        ))}
      </h1>
      <p className="v-hero-sub">{hero.sub}</p>
      <HeroMotion />
    </section>
  );
}

import { atelier } from "../content";
import Bottle from "./Bottle";

// SY05: one big sentence with the bottle as a glass chip inside it. The right half stays empty on purpose.
export default function Atelier() {
  return (
    <section id="atelier" className="v-atelier" data-record-time="1.6">
      <p className="font-display v-big" data-focus-resolve>
        {atelier.before}{" "}
        <span className="v-inline-chip" data-anchor="atelier">
          <Bottle h={74} />
        </span>{" "}
        {atelier.after}
      </p>
      <ul className="v-stats">
        {atelier.stats.map((s) => (
          <li key={s.l}>
            <b className="font-display">{s.n}</b>
            <span>{s.l}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

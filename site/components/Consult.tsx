import { consult } from "../content";
import Bottle from "./Bottle";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// BK06: a bespoke-sitting booking card (calendar + slots). The bottle stands to the right of it.
export default function Consult() {
  return (
    <section id="blend" className="v-consult" data-record-time="2" data-record-hold="1.7">
      <div className="v-consult-copy">
        <h2 className="font-display v-h2">{consult.title}</h2>
        <p className="v-lede">{consult.sub}</p>
        <ul className="v-points">
          {consult.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="v-price v-consult-price">{consult.price}</p>
      </div>
      <div className="v-cal-card">
        <div className="v-cal-head">
          <b className="font-display">{consult.month}</b>
        </div>
        <div className="v-cal">
          {DOW.map((d) => (
            <span key={d} className="v-dow">
              {d}
            </span>
          ))}
          {Array.from({ length: consult.offset }).map((_, i) => (
            <span key={`o${i}`} />
          ))}
          {Array.from({ length: consult.days }).map((_, i) => {
            const d = i + 1;
            const cls = d === consult.picked ? "is-on" : consult.taken.includes(d) ? "is-off" : "";
            return (
              <button key={d} type="button" className={`v-day ${cls}`} disabled={cls === "is-off"}>
                {d}
              </button>
            );
          })}
        </div>
        <div className="v-slots">
          {consult.slots.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`v-slot ${i === consult.slotPicked ? "is-on" : ""}`}
              data-hover-demo={i === 1 ? "click" : undefined}
            >
              {s}
            </button>
          ))}
        </div>
        <button type="button" className="v-btn v-btn-solid" data-nav-cta>
          {consult.cta}
        </button>
      </div>
      <div className="v-consult-bottle">
        <Bottle h={330} anchor="consult" />
      </div>
    </section>
  );
}

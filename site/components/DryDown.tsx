import { dryDown } from "../content";
import Bottle from "./Bottle";
import DryMotion from "./DryMotion";

// ST07 · the signature. Dark band #2A2440 on purpose. A tall track holds a sticky 900px stage (M456, DryMotion scrubs
// it); static = the 8 h state, one screen tall.
export default function DryDown() {
  return (
    <div id="drydown-track" className="v-dry-track" data-record-time="1" data-record-label="Dry-down">
      <section id="drydown" className="v-dry" data-signature>
        <div className="v-dry-glow" aria-hidden />
        <header className="v-dry-head">
          <h2 className="font-display v-h2">{dryDown.title}</h2>
          <p className="v-lede">{dryDown.sub}</p>
        </header>
        <div className="v-dry-stage">
          <div className="v-dry-left">
            <div className="v-dry-bottle" data-anchor="drydown" data-hide>
              <Bottle h={330} />
            </div>
            <div className="v-blotter" aria-hidden>
              <i className="v-blotter-stain" />
            </div>
          </div>
          <div className="v-clock-wrap">
            <div className="v-beam" aria-hidden>
              <i className="v-beam-fill" />
              <i className="v-beam-head" />
            </div>
            <ol className="v-clock">
              {dryDown.steps.map((s, i) => (
                <li key={s.time} className={i === dryDown.active ? "is-on" : ""} data-step={i}>
                  <b>{s.time}</b>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="v-bars" aria-label="Note strength at 8 hours">
            {dryDown.bars.map((b) => (
              <div key={b.l} className="v-bar">
                <i style={{ height: `${b.v}%` }} />
                <span>{b.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <i className="v-dry-end" data-record-time="4.6" data-record-label="Dry-down end" aria-hidden />
      <DryMotion />
    </div>
  );
}

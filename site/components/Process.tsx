import { process } from "../content";
import Bottle from "./Bottle";

// PD07: a five-step ledger, the bottle small in the right margin.
export default function Process() {
  return (
    <section id="process" className="v-process" data-record-time="2.5">
      <div className="v-process-list">
        <h2 className="font-display v-h2">{process.title}</h2>
        <ol>
          {process.steps.map((s) => (
            <li key={s.n} className="v-led">
              <em className="font-display">{s.n}</em>
              <b>{s.name}</b>
              <span data-word-dissolve>{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="v-process-side">
        <Bottle h={280} anchor="process" />
      </div>
    </section>
  );
}

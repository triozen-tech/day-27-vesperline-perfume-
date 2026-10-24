import { families } from "../content";
import Bottle from "./Bottle";

// PS09: four family tiles, the first one active; the bottle rests beside them and takes the active tint.
export default function Finder() {
  const active = families[0];
  return (
    <section id="finder" className="v-finder" data-record-time="1.8" data-record-hold="1.2">
      <div className="v-finder-side">
        <h2 className="font-display v-h2">Find your family</h2>
        <p className="v-lede">Four families cover almost every scent we blend. Pick the one you reach for.</p>
        <div className="v-finder-bottle" style={{ ["--t1" as string]: active.tint, ["--t2" as string]: active.tint2 }}>
          <Bottle h={300} anchor="finder" />
        </div>
      </div>
      <div className="v-tiles">
        {families.map((f, i) => (
          <button
            key={f.name}
            type="button"
            className={`v-tile ${i === 0 ? "is-on" : ""}`}
            data-hover-demo={i === 1 ? "click" : undefined}
            data-cursor="Pick"
            data-hue={[0, 38, 92, -118][i]}
            style={{ ["--tint" as string]: f.tint, ["--tint2" as string]: f.tint2 }}
          >
            <i className="v-tile-swatch" />
            <b className="font-display">{f.name}</b>
            <span>{f.notes}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

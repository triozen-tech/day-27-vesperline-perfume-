import { sizes } from "../content";
import Bottle from "./Bottle";

// CP02: three scales of the same bottle on one shelf line.
export default function Sizes() {
  return (
    <section id="sizes" className="v-sizes" data-record-time="2">
      <div className="v-sizes-copy">
        <h2 className="font-display v-h2">{sizes.title}</h2>
        <p className="v-lede">{sizes.sub}</p>
      </div>
      <div className="v-lineup">
        {sizes.items.map((s) => (
          <figure key={s.ml} className="v-size-item" data-hover-demo={s.ml === "30 ml" ? "" : undefined}>
            <div className="v-size-bottle" data-anchor={s.ml === "30 ml" ? "sizes" : undefined}>
              <Bottle h={Math.round(380 * s.scale)} />
            </div>
            <figcaption>
              <b className="font-display">{s.ml}</b>
              <span>{s.note}</span>
              <span className="v-price">
                ₹{s.price} <small>sample</small>
              </span>
            </figcaption>
          </figure>
        ))}
        <i className="v-shelf-line" aria-hidden />
      </div>
    </section>
  );
}

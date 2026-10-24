import { shelf } from "../content";
import Bottle from "./Bottle";

// PS16: four glass product cards (size chips, sample price, add to bag). "Noor Glass" holds the F8 landing slot.
// sample price for another size: scaled from the 30 ml price, rounded to 50
const p = (price: string, k: number) => {
  const n = Number(price.replace(/,/g, "")) * k;
  return (Math.round(n / 50) * 50).toLocaleString("en-IN");
};

export default function Shelf() {
  return (
    <section id="shelf" className="v-shelf" data-record-time="2.8" data-record-hold="3" data-record-offset="90">
      <header className="v-shelf-head">
        <h2 className="font-display v-h2">{shelf.title}</h2>
        <p className="v-lede">{shelf.sub}</p>
        <p className="v-bag" aria-live="polite">
          Bag <b>0</b>
        </p>
      </header>
      <div className="v-cards">
        {shelf.items.map((it, i) => (
          <article key={it.name} className="v-card" data-hover-demo={i === 1 ? "" : undefined} data-p10={p(it.price, 0.45)} data-p30={p(it.price, 1)} data-p50={p(it.price, 1.6)} data-cursor="View">
            <div className="v-card-glare" aria-hidden />
            <div className="v-card-photo" data-slot={it.slot || undefined}>
              {it.slot ? <Bottle h={250} hue={it.hue} anchor="shelf" /> : <Bottle h={250} hue={it.hue} />}
            </div>
            <h3 className="font-display">{it.name}</h3>
            <p className="v-card-notes">{it.notes}</p>
            <div className="v-chips" role="group" aria-label="Size" style={{ ["--k" as string]: 1 }}>
              <i className="v-chip-pill" aria-hidden />
              {shelf.sizes.map((s, k) => (
                <button key={s} type="button" className={`v-size ${k === 1 ? "is-on" : ""}`} data-k={k}>
                  {s}
                </button>
              ))}
            </div>
            <div className="v-card-foot">
              <span className="v-price">
                ₹<span className="v-amt">{it.price}</span> <small>sample</small>
              </span>
              <button type="button" className="v-add" data-hover-demo={i === 2 ? "click" : undefined} data-hover-hold="0.9" data-cursor="Add">
                Add
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="v-buybox" aria-label="Selected scent">
        <Bottle h={64} className="v-buy-bottle" />
        <div className="v-buy-id">
          <b className="font-display v-buy-name">{shelf.items[1].name}</b>
          <span className="v-buy-meta">
            <span className="v-buy-size">30 ml</span> · ₹<span className="v-buy-amt">{shelf.items[1].price}</span> <small>sample</small>
          </span>
        </div>
        <div className="v-swatches" role="group" aria-label="Tint">
          {[
            ["Clear", "#e9e5f4", 0],
            ["Rose", "#e8b8d0", 60],
            ["Smoke", "#9a8fc0", -30],
          ].map(([n, c, h], k) => (
            <button key={n as string} type="button" className={`v-sw ${k === 0 ? "is-on" : ""}`} data-off={h} aria-label={n as string} style={{ background: c as string }} />
          ))}
        </div>
        <button type="button" className="v-add v-buy-add">
          Add
        </button>
      </aside>
    </section>
  );
}

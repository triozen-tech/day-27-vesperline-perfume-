import { nav } from "../content";

// NV16: floating glass pill, 24px from the top (ends at 80px, hero content starts below 96px).
export default function VesperNav() {
  return (
    <header className="v-nav" data-nav>
      <nav className="v-nav-pill" aria-label="Main">
        <a href="#top" className="v-nav-brand">
          Vesperline
        </a>
        {nav.links.map((l) => (
          <a key={l.href} href={l.href} className="v-nav-link" data-cursor="Go">
            {l.label}
          </a>
        ))}
        <a href="#blend" className="v-nav-cta" data-nav-cta data-cursor="Book">
          {nav.cta}
        </a>
      </nav>
    </header>
  );
}

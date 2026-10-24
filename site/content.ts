// All text and data for the Vesperline concept site. Prices are samples (₹).

export const BOTTLE = "/images/vesperline/a2-bottle.png";

export const nav = {
  links: [
    { label: "Scents", href: "#shelf" },
    { label: "Atelier", href: "#atelier" },
    { label: "Blend", href: "#blend" },
  ],
  cta: "Visit",
};

export const hero = {
  title: "Vesperline",
  sub: "Small-batch perfume, blended by hand.",
  // left/top in % of the chip ring, size in px, depth 0 = in focus, 3 = far
  chips: [
    { t: "bergamot", x: 7, y: 6, s: 22, d: 0 },
    { t: "pink pepper", x: 27, y: 22, s: 17, d: 2 },
    { t: "jasmine", x: 1, y: 40, s: 18, d: 1 },
    { t: "cedar", x: 19, y: 64, s: 20, d: 2 },
    { t: "neroli", x: 29, y: 90, s: 16, d: 3 },
    { t: "iris", x: 70, y: 8, s: 18, d: 2 },
    { t: "vetiver", x: 86, y: 27, s: 20, d: 0 },
    { t: "amber", x: 72, y: 50, s: 24, d: 1 },
    { t: "musk", x: 60, y: 80, s: 17, d: 3 },
    { t: "sandalwood", x: 87, y: 74, s: 18, d: 2 },
  ],
};

export const atelier = {
  before: "A house of",
  after: "thirty vials, one nose, and a window that faces north.",
  stats: [
    { n: "30", l: "vials on the bench" },
    { n: "1", l: "nose, one pair of hands" },
    { n: "4", l: "families, no shortcuts" },
  ],
};

export const families = [
  { name: "Floral", notes: "peony · rose · iris", tint: "#E7C9E4", tint2: "#F7E9F4" },
  { name: "Amber", notes: "resin · vanilla · fig", tint: "#F0D6B4", tint2: "#FAEEDB" },
  { name: "Woody", notes: "cedar · vetiver · moss", tint: "#CFD9C2", tint2: "#EBF0E3" },
  { name: "Fresh", notes: "citrus · tea · salt", tint: "#C8E2EC", tint2: "#E6F3F8" },
];

export const dryDown = {
  title: "The Dry-down",
  sub: "One scent, four moments on the same blotter.",
  steps: [
    { time: "0 min", text: "Bergamot and pink pepper. Bright, gone fast." },
    { time: "15 min", text: "Iris and jasmine step forward." },
    { time: "3 h", text: "Cedar rises under the flowers." },
    { time: "8 h", text: "Amber, musk and vetiver. What stays." },
  ],
  active: 3,
  bars: [
    { l: "top", v: 12 },
    { l: "heart", v: 38 },
    { l: "base", v: 92 },
  ],
};

export const process = {
  title: "Nose to bottle",
  steps: [
    { n: "01", name: "Compound", text: "Drops weighed on a scale, one note at a time." },
    { n: "02", name: "Dilute", text: "Into perfumer's ethanol, never rushed." },
    { n: "03", name: "Rest", text: "Days to weeks in the dark, to settle." },
    { n: "04", name: "Chill and filter", text: "Cloudy goes clear, nothing is left behind." },
    { n: "05", name: "Bottle", text: "Filled, capped and labelled by hand." },
  ],
};

export const shelf = {
  title: "The shelf",
  sub: "Four scents, all sample prices.",
  items: [
    { name: "Aurel", notes: "citrus · iris · white tea", price: "2,400", hue: -40, slot: "" },
    { name: "Noor Glass", notes: "jasmine · musk · pear skin", price: "3,100", hue: 0, slot: "noor" },
    { name: "Cedar Hour", notes: "cedar · amber · dry fig", price: "2,900", hue: 60, slot: "" },
    { name: "Pale Ember", notes: "pink pepper · vanilla · smoke", price: "3,400", hue: -110, slot: "" },
  ],
  sizes: ["10 ml", "30 ml", "50 ml"],
};

export const sizes = {
  title: "Three sizes",
  sub: "The same bottle, three weights. Start small, stay long.",
  items: [
    { ml: "10 ml", price: "1,200", note: "pocket vial", scale: 0.52 },
    { ml: "30 ml", price: "2,400", note: "the everyday", scale: 0.75 },
    { ml: "50 ml", price: "3,400", note: "the long one", scale: 1 },
  ],
};

export const consult = {
  title: "Blend a bespoke one",
  sub: "A 45-minute sitting with our nose. Leave with three trial vials.",
  points: ["Talk through what you wear and what you miss", "Smell twelve raw notes on strips", "Take three trial vials home"],
  price: "₹1,500 sample",
  month: "November 2026",
  // Nov 2026 starts on a Sunday; the grid starts on Monday
  offset: 6,
  days: 30,
  picked: 12,
  taken: [3, 4, 5, 10, 11, 17, 18, 24, 25],
  slots: ["11:00", "12:30", "15:00", "17:30"],
  slotPicked: 2,
  cta: "Reserve this slot",
};

export const reviews = {
  title: "On the skin",
  note: "Sample reviews, written for this concept.",
  items: [
    { q: "It opens bright and ends up smelling like me.", who: "Sample review · Anika R." },
    { q: "Three hours later the cedar finally arrived.", who: "Sample review · Dev M." },
    { q: "I booked the sitting for a gift and kept a vial.", who: "Sample review · Meera S." },
  ],
};

export const faq = {
  title: "Good to know",
  items: [
    { q: "How long does it last?", a: "Between six and eight hours on skin. The base notes stay longest, so the scent changes as the day goes." },
    { q: "What is dry-down?", a: "The way a scent changes after you spray it: top notes first, then the heart, then the base that stays." },
    { q: "Can I return an opened bottle?", a: "Trial vials can be swapped within 14 days. Full bottles are blended to order, so they are final." },
    { q: "Do you ship outside the city?", a: "Yes, in padded glass-safe boxes, two to four days. Concept shop: nothing is really shipped." },
  ],
  card: { title: "Ask the nose", text: "Not sure where to start? Describe what you wear now.", ph: "A scent you love", cta: "Send" },
};

export const newsletter = {
  title: "Notes, by post.",
  text: "One letter a month: a new blend, a sample strip, nothing else.",
  ph: "your email",
  cta: "Subscribe",
  fine: "Sample form: nothing is sent.",
};

export const footer = {
  formula: { title: "Formula 0412", status: "archived", rows: [["top", "bergamot, pink pepper", "14%"], ["heart", "iris, jasmine, cedar", "36%"], ["base", "amber, musk, vetiver", "50%"]] },
  cols: [
    { h: "Shop", l: ["Scents", "Sizes", "Gift sets"] },
    { h: "Atelier", l: ["The studio", "Blend a bespoke one", "Journal"] },
    { h: "Help", l: ["Shipping", "Returns", "Contact"] },
  ],
  note: "Concept website by Triozen. Sample prices.",
};

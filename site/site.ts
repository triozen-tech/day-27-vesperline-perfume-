import type { SiteMeta, Theme } from "@/lib/site";

export const meta: SiteMeta = {
  name: "Vesperline",
  title: "Vesperline Perfume Atelier · concept website",
  description: "A small-batch perfume house, blended by hand. Concept website by Triozen.",
  loaderText: "Vesperline",
  loader: false, // Vesperline has its own loader (VesperLoader, I50)
  cursor: true,
  record: { duration: 34 },
};

export const theme: Theme = {
  bg: "#F4F3F8",
  surface: "#FFFFFF",
  text: "#1F1B2E",
  muted: "#5C5870",
  accent: "#5B4B9A",
  accentText: "#FFFFFF",
  line: "#D9D4EA",
  fontDisplay: "'Gloock', Georgia, serif",
  fontBody: "'Urbanist Variable', system-ui, sans-serif",
  radius: 22,
};

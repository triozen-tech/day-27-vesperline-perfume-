import type { CSSProperties } from "react";
import { BOTTLE } from "../content";

// The one cut-out bottle (673×1203, trimmed). Height sets the size; `hue` tints it per scent.
export default function Bottle({
  h,
  hue = 0,
  anchor,
  className = "",
  style,
  alt = "",
}: {
  h: number;
  hue?: number;
  anchor?: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BOTTLE}
      alt={alt}
      data-anchor={anchor}
      draggable={false}
      className={`v-bottle ${className}`}
      style={{ height: h, width: (h * 673) / 1203, filter: hue ? `hue-rotate(${hue}deg)` : undefined, ...style }}
    />
  );
}

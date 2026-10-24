import type { Metadata } from "next";
import SmoothScroll from "@/components/engine/SmoothScroll";
import FrameScrub from "@/components/video/FrameScrub";

// Hidden test page for the video-first engine: two clips chained along one scroll, crossfade on the join.
// Frames: npm run film-frames -- --src raw/<clip>.mp4 --name _test-v1   (and _test-v2). Docs: docs/VIDEO-FIRST.md
export const metadata: Metadata = { title: "Scrub lab", robots: { index: false, follow: false } };

export default function ScrubLab() {
  return (
    <>
      <SmoothScroll />
      <section className="relative" style={{ height: "500vh" }}>
        <div className="sticky top-0 h-screen overflow-hidden bg-bg">
          <FrameScrub frames={["/frames/_test-v1", "/frames/_test-v2"]} hoverNudge={0.01} />
        </div>
      </section>
    </>
  );
}

# Video-first engine

Scroll plays video. Frames are images, the picture is a pure function of scroll (any speed, back and forward).

1. **Frames**: `npm run film-frames -- --src raw/v1.mp4 --name <slug>-v1 --fps 24 --fmt webp --width 1600`
   (`--count N` for an exact frame count, `--fmt jpg`, `--start/--end`, `--quality` (default 90), `--delogo ""` to skip the Flow mark paint-out).
   Output: `public/frames/<name>/frame_0001.webp …` + `manifest.json` `{count, ext, width, height, pad, prefix, fps, times}`.
   Config-driven mode (`site/frames.json`, video time, phone sets) still works: `npm run film-frames [clip]`.
2. **One clip**: `<FrameScrub frames="/frames/<slug>-v1" />` inside a tall section with a sticky stage.
3. **Chain V1..Vn**: `<FrameScrub frames={["/frames/s-v1","/frames/s-v2"]} fade={0.04} />`; each clip gets a share of the scroll
   proportional to its frame count, with a crossfade on the join. `chainAt(counts, p, fade)` in `lib/chain.ts` is the pure helper.
4. Props: `section` / `start`+`end` (scroll range), `ease` (damping), `breath` (idle drift, 0 = off), `stillAt`, `hoverNudge`, `onHover`.
5. `?static=1` = one still frame, no motion. The OS reduce-motion setting is never read.
6. Test page: `/lab/scrub` (needs frames named `_test-v1`, `_test-v2`).
7. Size: no limit. Keep full-resolution stills, WebP q90+ and full-quality frames; performance comes from lazy loading and releasing frames, not from smaller files.

## Timeline mode: clips + stills on one scroll (from Day 21)

`<FrameScrub segs={[...]} />` (no `frames` prop) plays a row of clips AND stills along one pinned section. Helpers in `lib/chain.ts` (`timeline`, `layersAt`, `joinZone`, `joinMap`, `smooth`, `ramp`), shared loader store in `lib/frames.ts` (`ensureClip`, `clipProgress`, `viewClip`, `setClipOrder`, `getStill`).

- `segs`: `{ clip: "/frames/x-v1", w?, join? }` or `{ img, w, fade?, start? }`. A clip plays over `w` scroll units (default its frame count); every segment after the first crossfades in over 8 units centred on its start.
- **Veo dissolve joins**: `join: [firstFrame, length]` (0-based) makes the scroll skip the baked dissolve; the picture jumps A to B inside 3 px and a scroll that stops there for 150 ms hops (<= 4 px) to the clean side. Test with `node scripts/join-test.mjs [port]` (must report 0 resting stops). The test only fits clips with a baked dissolve; clips cut hard (Day 19) need no `join` and the test has nothing to find.
- `lead` / `hold` (px pinned before / after), `onProgress(p, still, holdPx)`, `children` inside the breathing layer, `stillAt` for `?static=1`.
- Preload: first clip within 1.6 screens (or call `ensureClip` from a loader and read `clipProgress`), next clip at 50 %, only the clip on screen and its neighbours (`clipOrder`) stay decoded.
- **One film, not stacked stages** (Day 19): chain every clip in ONE sticky section; a `{ img, w }` still between two clips is a hold (e.g. ~6 % of the scroll for price cards to be read).
- **Brand word behind the subject** (a transparent cut-out over a big word): only matches while the subject is still (hero start, final frame); fade it out once the clip moves.
- **Card timing from clip content**: time card windows against the frames actually on screen (a `CARD` table in `site/clips.ts`), not the planned clip length.
- Keep a small data-only `site/clips.ts` (folders, joins) and never copy the scrub code into the site.

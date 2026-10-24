**Mode: Pro**

# Day 27 · Vesperline Perfume Atelier (concept site)

Fictional small-batch perfume house, ₹ sample prices, desktop 1440×900. Direction = layout **A "Vesper Glass"** (recommended; the final pick is the user's, this file is updated after it). Layout mockups: `day27/refs/layouts/`, moments: `day27/refs/moments.md`. 8 of 8 choices different from Days 24, 25 and 26, see the sites log.

## Choices
| Choice | Pick | Why |
|---|---|---|
| Look | L16 glass & chrome, light | pale frosted glass, soft light |
| Palette | bg `#F4F3F8`, surface `#FFFFFF`, text `#1F1B2E`, muted `#5C5870`, accent violet `#5B4B9A`; signature band `#2A2440` | pale lilac-white, no aqua/sand, no cream/brass |
| Type pair | Gloock + Urbanist | new pair, not Calistoga/Work Sans |
| Nav | NV16 floating glass pill that hides on scroll | calm, premium |
| Hero | HR30 note-chip cloud + bottle, M50 rack focus | not a portal opening; traveller starts here |
| Signature | The Dry-down (moments 4, 13), M456 | visible change over four time steps |
| Card style | frosted glass cards, 22px radius | glass look |
| Loader | I50 Drops on a scale: lilac drops fill the empty bottle, scale readout 0→30 g, cap drops on, note words become the hero chips | the bottle hands over to the hero with no jump; new loader code, not a wordmark fill |
| Traveller | F1 waypoint + F8 land-in-UI | every 3rd site |

## Section plan and Motion map
Layout codes and motion codes each used once (none repeats Days 24–26). Page order: Hero, Find your family, The shelf, Three sizes, then Blend a bespoke one, The atelier, Dry-down, Nose to bottle, Reviews, Good to know, Newsletter, Footer.

| # | Section | Layout | Moments | Motion | Record mode |
|---|---|---|---|---|---|
| 0 | Loader | — | 14 | I50 | ≤ 3.5 s (measured 3.4 s), then the curtain lifts onto the hero |
| 1 | Nav | NV16 | — | M64 shimmer border on Visit button | pill stays visible |
| 2 | Hero | HR30 | 15, 4 | M50 rack focus through chips | chips pull focus on their own |
| 3 | Find your family | PS09 | 3, 2 | M421 active word at centre; bottle tint cross-fades (0.7 s, `@property` colours) | auto-steps through 4 families |
| 4 | The shelf (shop) | PS16 | 12, 3 | M489 glare sweep on hover; size-chip sliding pill; Add → "Added ✓" + bag counter; sticky buy box | hover demos (card 2, Add click on card 3) |
| 5 | Three sizes | CP02 | 12, 10 | M286 stagger from edges | on scroll |
| 6 | Blend a bespoke one | BK06 | 9, 11 | M220 gradual blur edge band | slot auto-picks |
| 7 | The atelier | SY05 | 1, 15 | M107 focus-blur resolve | on scroll |
| 8 | **The Dry-down** (signature) | ST07 | 4, 13, 2 | M456 tracing beam, pinned | pure function of scroll; alive when stopped |
| 9 | Nose to bottle | PD07 | 5–8, 10 | M126 per-word blur dissolve | on scroll |
| 10 | Reviews (sample names) | SP04 | — | M216 group blur-slide stagger | on scroll |
| 11 | Good to know | FQ04 | 6, 7 | M172 squeeze accordion | first item opens by itself |
| 12 | Newsletter | NL01 | — | M268 gradient reveal highlight | on scroll |
| 13 | Footer | FO15 | 11 | M700 reflection floor | on scroll |

Transitions: X6 circle iris into the Dry-down band, X15 vignette spotlight out of it.

## Traveller path (F1 + F8)
One pale glass bottle, smooth simple shape, no text or logo. It floats in the middle of the screen (x 720, 520 px tall, soft, slightly blurred) BEHIND the text, riding a tall page-length glass strip. Pure function of scroll, idle bob, hidden under `?static=1`, never pauses in record mode.
Hand-over between screens (460 px of scroll each): the bottle leaves the centre, sharpens, tilts and glows (brightness + light bloom on the strip), lands in the section's `data-anchor` slot, and a ring ripples out as it arrives. It lifts off again when the section has passed.
| Section | Where it lands |
|---|---|
| Hero | starts in the chip cloud |
| Atelier | the small chip inside the sentence |
| Finder | beside the family tiles, tint follows the family |
| Dry-down | fades out in the centre (blotter strip bottle takes over) |
| Nose to bottle | right of the ledger |
| Shelf | F8: pop-in landing in the "Noor Glass" card slot |
| Sizes | the 30 ml bottle in the line-up |
| Consultation | right of the calendar card |
| Reviews / FAQ | fades out, floats behind in the centre |
| Newsletter | beside the form |
| Footer | beside the formula card |

## Hover map
| Element | Hover | `data-hover-demo` |
|---|---|---|
| Shelf cards | glare sweep + lift (M489); the buy box follows the pointed card | yes (card 2; Add `click` on card 3) |
| Family tiles | tint swaps the bottle | yes (`click`) |
| Size bottles (30 ml) | rise 6px, label shows | yes |
| Swatches (buy box) | ring grows, bottle tint changes | no (click only) |
| Slot buttons | fill violet | yes (`click`) |
| Nav links, buttons | underline grow, shimmer | no |

Total ≥ 3 demos; each section with a demo gets `data-record-hold`.

## Product detail plan
Shelf section, all built: sticky buy box (glass pill, bottom 28px, follows the card being pointed at, shows name, size, sample price) · swatch row Clear / Rose / Smoke (hue-rotates that card's bottle, the traveller in its slot and the box thumbnail) · size chips with a sliding pill (10 / 30 / 50 ml, peek on hover) · Add with "Added ✓" and the bag counter. The F8 slot is a scrubbed pop-in (no literal Flip), so the anchor stays still. No reference picks yet.

## Reel time table (measured 34.5 s, page load to footer; `record.duration` 34)
Loader ~3.4 · hero 2 · atelier 1.6 · finder 1.8 + 1.2 hold · Dry-down pin 2800 px (four time steps, releases exactly at its end) · process 2.5 · shelf 2.8 + 3 hold (2 hover stops) · sizes 2 · consult 1.7 hold · reviews, FAQ, newsletter 1 each · footer 1.7.

## Assets
| ID | What | Use | Size / type | Flow edit attaches | Source | Code fallback |
|---|---|---|---|---|---|---|
| A1 | Pale glass perfume bottle, plain smooth shape, no text or logo, on plain mid-grey (lesson 42) | master still | 2048 px jpg | none (master) | Flow: only Flow gives real glass | SVG bottle |
| A2 | Cut-out of A1 (checked on light and dark) | traveller, hero, shop, sizes | transparent png | — | `npm run cutout` from A1 (no second Flow image; angles are rotated in code) | SVG bottle |

Everything else (chips, strips, bars, wheel, calendar, vials) is code. No faces, hands or people. No Blender: the bottle is a Flow job and a 3D turntable is not the signature.

## Notes for the build
- The Dry-down band is dark purple `#2A2440` on purpose: text `#F4F3F8` (contrast ≥ 12:1), note bars `#C9BDF2`; small text ≥ 14px; check the clock labels, which sit at 35% opacity when inactive (raise to ≥ 4.5:1).
- The nav pill is a floating glass pill with 24px top margin and hides on scroll down; it must never cover the hero title or bottle (hero content starts below 96px).
- Floating note chips live in a ring around the bottle and never cross the title or subtitle zone (bottom 40% of the hero); rack focus blurs chips only, never the title.
- The traveller never covers text, is hidden in `?static=1`, and never pauses in record mode.
- No phone UI, no media queries; motion always on except `?static=1`.

## Brand check and no-gos
"Vesperline": no business found in 3 web searches (closest: Atelier Vesper, Netherlands; VESPER and VESPERA word marks exist). Different enough as a concept name; check the trademark register before any real use.
No-gos: no real perfume-house look or copy, no real logo, no visible text on bottles, no faces/hands, no mist videos (lesson 90), no splash or strip signature (Day 6), no beams hero (Day 6).

## Prompts (as run)

Empty. When the user pastes back the prompts that were run: asset ID · date · prompt (word for word) · attachments.

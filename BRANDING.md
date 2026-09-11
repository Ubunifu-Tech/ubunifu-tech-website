# Ubunifu Technologies — Brand System

This is the concise source of truth for Ubunifu’s visual identity. Keep it aligned with the implemented tokens in [`src/app/globals.css`](src/app/globals.css), the logo component in [`src/components/BrandMark.tsx`](src/components/BrandMark.tsx), and the live brand kit at [`/brand`](https://ubunifutech.com/brand).

Last updated: 8 September 2026.

## Brand idea

Ubunifu Technologies is an Arusha-based technology consultancy that also builds and operates products. The identity should feel technically credible, practical, warm, and built close to the work.

The canonical tagline is:

> Consulting + products, built in Tanzania.

Use the tagline as supporting copy, never inside the navigation or logo lockup.

## The Ubunifu Ligature

The canonical mark is the original **Ubunifu Ligature**: a custom orange U and violet T that interlock as one engineered glyph. The open strokes keep the symbol energetic and recognizable, while the angled T crown introduces forward motion. Ink Navy anchors the wordmark, typography, rules, and dark fields around it.

The full horizontal lockup always spells **Ubunifu Technologies** on one baseline. Neither word is a descriptor or optional subline: both use the same size and cap height, with only a subtle weight change.

The master identity uses three crisp solid colors:

- Signal Orange U: `#FF6B2C`
- Digital Violet T: `#6D3FE8`
- Ink Navy wordmark and structure: `#1F1A36`

The orange-to-violet gradient is a separate signature device for large paths, progress treatments, and atmospheric backgrounds. Do not apply a gradient to the master Ligature.

### Canonical assets

Downloadable vector masters live in [`public/brand/`](public/brand/):

| Asset | Use |
|---|---|
| [`ubunifu-mark.svg`](public/brand/ubunifu-mark.svg) | Default orange-and-violet Ligature on light backgrounds |
| [`ubunifu-lockup.svg`](public/brand/ubunifu-lockup.svg) | Full-color “Ubunifu Technologies” horizontal lockup on light backgrounds |
| [`ubunifu-mark-inverse.svg`](public/brand/ubunifu-mark-inverse.svg) | Orange-and-violet Ligature prepared for dark backgrounds |
| [`ubunifu-mark-navy.svg`](public/brand/ubunifu-mark-navy.svg) | Single-color mark where a restrained treatment is needed |
| [`ubunifu-mark-white.svg`](public/brand/ubunifu-mark-white.svg) | Single-colour white mark for purple or image fields |
| [`ubunifu-lockup-white.svg`](public/brand/ubunifu-lockup-white.svg) | Full-color Ligature with a white wordmark on dark backgrounds |

Raster delivery assets:

- [`public/logo-v2.png`](public/logo-v2.png) — 512 × 512 navy avatar tile with the orange-and-violet Ligature

The [`/brand`](https://ubunifutech.com/brand) page is the shareable reference and download surface. The six SVG files are the canonical logo masters; raster artwork is derived delivery media. Social-preview artwork is a separate campaign asset and must use the same master geometry when it is next deliberately refreshed.

### Logo rules

- Preserve the Ligature’s open U/T geometry, square stroke ends, angled crown, and interlock.
- Use orange-and-violet on light surfaces and at display size on navy. Use all-white where a dark or image field needs maximum clarity, all-navy on orange, and the navy master for one-colour applications.
- Keep generous clear space around the mark; do not crowd it with copy or other symbols.
- Do not stretch, rotate, crop, outline, shadow, box in, recolor, or redraw the mark.
- Do not add a tagline inside the navigation or lockup, or use the Ligature as a decorative letter inside another word.
- Use the mark alone for favicons, avatars, and compact product signatures; use the full “Ubunifu Technologies” lockup whenever the company name should be explicit.

## Canonical palette

Use CSS tokens in product code. Hex values are for exported assets and external tools.

| Role | Token | Hex | Primary use |
|---|---|---|---|
| Page background | `--background` | `#FFFFFF` | White canvas |
| Surface | `--surface` | `#FFFFFF` | Cards, forms, navigation |
| Alternate surface | `--surface-2` | 3% navy mixed with white | Neutral section contrast |
| Subtle surface | `--surface-3` | 6% navy mixed with white | Quiet grouping and hover states |
| Primary text | `--text-primary` | `#1F1A36` | Headings and body copy |
| Secondary text | `--text-secondary` | 75% navy mixed with white | Supporting copy |
| Tertiary text | `--text-tertiary` | 65% navy mixed with white | Labels and helper text |
| Brand orange | `--brand` | `#FF6B2C` | Ligature U, large accents, paths |
| Orange hover | `--brand-hover` | `#E8581E` | Decorative interaction state |
| Deep orange | `--brand-deep` | `#BF4314` | Accessible orange button fill and small text |
| Purple | `--primary` | `#6D3FE8` | Ligature T, links, intelligence, interaction |
| Purple hover | `--primary-hover` | `#5A2DD0` | Purple interaction state |
| Deep purple | `--primary-deep` | `#3D1FA0` | Strong text and pressed states |
| Data blue | `--accent` | `#2E5BFF` | Data and infrastructure illustration only |
| Clay | `--clay` | `#C2693B` | Restrained editorial warmth |

Orange and violet form the Ligature; navy anchors the company name and the wider system. These three are the core identity. Blue is reserved for data and infrastructure illustration, while clay is a controlled editorial note. Neither is a fourth primary.
White and navy-derived neutrals now cover the large reading surfaces. Violet stays in the original logo and selective interactions; avoid violet page washes, ambient glows, and large purple gradients. Do not reintroduce the old lavender canvas.
The interactive aliases deliberately use `--cta: var(--brand-deep)` and `--cta-hover: var(--text-primary)` so white CTA text retains contrast.

### Contrast rules

- Use navy, secondary, tertiary, purple, or deep purple for normal text on light surfaces.
- Bright orange `#FF6B2C` is for the Ligature U and large decoration, not small text or essential control boundaries on light backgrounds.
- For white text on an orange CTA, use deep orange `#BF4314`, not bright orange. It clears AA on both white and the lavender page canvas.
- Clay is decorative on light surfaces; do not use it for normal-size body text.
- Body text and interactive text must meet WCAG AA contrast: at least `4.5:1` for normal text and `3:1` for large text. Essential non-text controls and focus indicators need at least `3:1` against adjacent colors.
- Never communicate status, errors, or selection through color alone. Pair color with text, shape, iconography, or another visible state.
- Keep visible keyboard focus. Motion and smooth scrolling must respect `prefers-reduced-motion`.

## Typography

Fonts are loaded through `next/font` in [`src/app/layout.tsx`](src/app/layout.tsx).

| Role | Family | Weights | Guidance |
|---|---|---|---|
| Display and headings | Poppins | 500 | Calm, open line height, restrained tracking |
| Body, labels, and interface | Inter | 400 | Regular weight and normal tracking, including controls |
| Code | System monospace | 400 | Body size, reserved for actual code |
| Original wordmark | Poppins | 600, 700 | Preserve the established lockup weights |

Use Poppins for headings, Inter for reading and controls, and monospace only for code. Labels use sentence case and normal letter spacing. There is no serif in the core system.

The live site has exactly three shared text-size roles, defined once in `src/app/globals.css`:

| Role | Token | Size | Use |
|---|---|---|---|
| Display | `--font-size-display` | `clamp(2.5rem, 5.6vw, 5.5rem)` | Page titles |
| Heading | `--font-size-heading` | `clamp(1.5rem, 2.2vw, 2.25rem)` | Section and feature headings |
| Body | `--font-size-body` | `1rem` | Paragraphs, labels, captions, navigation, controls, small subheadings |

Do not add component-specific size overrides at breakpoints. Build hierarchy with whitespace, alignment, colour, and regular/medium weights (400/500). Body-size text stays regular, including controls, table headings, and semantic emphasis; the original logo retains its own weights. Keep semantic HTML without making every emphasized phrase visually bold. Adjust narrow layouts to fit readable text instead of shrinking labels. Social-card artwork is a separate image composition. `npm run check:typography` checks size tokens, regular body weights, and normal tracking.

## Editorial image system

Editorial imagery explains the subject beside it. Choose a recognisable scene, object, or diagram before choosing a style. A smaller number of specific images is stronger than repeating a generic technology metaphor.

### Visual language

- Prefer flat editorial illustrations, real brand assets, legible HTML diagrams, and natural-looking scenes. 3D is not the default and needs a clear explanatory reason.
- Hosting imagery should show infrastructure, domains, or email; data imagery should show records and charts; AI imagery should show reasoning, source material, or review. Do not reuse unrelated learning or landscape art for those subjects.
- Landscapes should evoke the relevant place rather than a fantasy terrain model. Usambara is represented by forested highlands, cultivated slopes, and a walking trail—not snow peaks, funnels, or abstract machinery.
- Keep illustrations inside the orange, violet, navy, and white palette. Photographic scenes may retain natural skin tones and material colours; clothing and stationery accents can carry the brand without recolouring people or their surroundings.
- People may represent contemporary Tanzanian working life without stereotyped dress or staged corporate gestures. Generated people are fictional and must not be described as staff, clients, or testimonial subjects.
- Avoid glowing processors, glass machinery, fake dashboards, fake metrics, watermarks, decorative pseudo-text, and ornamental networks. One clear subject is enough.
- Do not put readable copy inside generated images. Titles and captions belong in accessible HTML.

### Composition and delivery

- Standard editorial source canvas: **16:9 or 3:2 landscape**, chosen for the placement.
- Keep the focal idea inside a centered safe area so the image can crop to 4:3 and square without losing meaning.
- Store editorial concepts in [`public/editorial/`](public/editorial/). Prefer WebP at runtime when a paired WebP exists; retain PNG only when it is the required source or delivery format.
- Keep product names, statuses, client domains, capabilities, and destination links in accessible HTML rather than baking them into imagery.
- Products use individual wordless editorial illustrations in open image-and-text rows: documents for Insight, stock and sales records for Sifa, and website modules for Rafiki. These are explanatory paper metaphors, not screenshots. Keep the homepage preview text-led rather than repeating the full collection. Exact prompts and asset paths are in [PRODUCT_ARTWORK.md](PRODUCT_ARTWORK.md).
- Client project visuals are text-free SVG relationship diagrams, not generated landscape scenes. Safari King shows an operations hub; Usambara shows enquiry-to-email branching. `EditorialVisual` selects the project, and `SystemDiagram` supplies the shared vector system across previews, work pages, and related article views. Descriptions remain available to screen readers; visible project names and explanations stay outside the artwork. The legacy rasters remain only for existing social metadata and recoverability.
- The same SVG system covers web, hosting, data, and AI services. Use trusted Lucide symbols, consistent navy strokes, one orange focal subject, and only connections that explain the service. No visible words, fake interface text, arbitrary numbers, decorative nodes, gradients, or looping animation. Branding and strategy use their dedicated light editorial illustrations. Whole SVG compositions scale proportionally rather than stretching or cropping.
- Main page heroes use the distinct generated backgrounds in [HERO_ARTWORK.md](HERO_ARTWORK.md), with broad centered HTML copy over navy. These are decorative editorial illustrations, not office photographs, client evidence, or product interfaces. Preserve the original logo and avoid embedded words. Keep the image behind the heading, rather than adding a second image panel below it. Use one optimized image per hero; no autoplay, parallax listeners, or duplicate layers are needed.
- Do not use photorealistic synthetic people as implied team/client evidence. The planning and business scenes are retained unused; their removal must not be replaced by hiding a necessary disclosure on a misleading photograph.
- Give each image one primary subject. Reuse is appropriate for a link into the same project or article; do not repeat the same image as both a decorative page hero and a section below it. The homepage selects an editorial lead whose cover is different from its project artwork.
- Preserve original assets in version history or as unreferenced files until a separate cleanup. New artwork uses new paths; see `EDITORIAL_ASSETS.md` for subjects, usage, and generation prompts.
- Do not publish raw interface captures that expose personal names, account data, saved prompts, or operational context. Any future evidence image requires sanitisation and publication approval.
- Write alt text for the idea and meaningful objects, not for every decorative texture or the generation style.

## Motion and dimensional systems

Motion should explain a relationship or a change in state: inputs gathering into a working system, an active capability following the reader, a rule establishing sequence, or evidence moving into focus. It is not a decorative layer added to every component.

- Use the existing Framer Motion dependency for orchestration, shared-layout transitions, masks, and restrained scroll-linked depth.
- The homepage has a navy editorial-image hero without the four-stage diagram, location strapline, or replay control. `SystemsField` is retained unused, not rendered. All main page hero images use the static `HeroBackdrop`; existing text and preview transitions remain restrained and respect reduced motion. Services uses in-flow illustrations and ordinary anchor targets.
- Shader decision: no WebGL layer for this diagram. HTML/SVG already expresses the relationships; shaders would add GPU, context, and fallback responsibilities without a clearer message. Consider one only for a specific material/light effect that cannot be expressed simply. References: [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [Motion SVG animation](https://motion.dev/docs/react-svg-animation).
- Keep content in accessible HTML. Canvas and ambient motion remain decorative and `aria-hidden`.
- Add a simulation only when it explains something visitors need to understand. Avoid generic WebGL orbs, autoplay video, cursor followers, and motion that makes a visitor wait for information.
- Use the established orange, purple, blue, navy, white, and clay palette; motion does not introduce additional colours.

## Voice and usage

The visual system and writing voice should agree: confident, warm, specific, and honest. Favor concrete outcomes over adjectives. Do not invent customer counts, ratings, performance metrics, sector experience, or product usage.

Remove repeated positioning, arbitrary counters, dashed eyebrow ornaments, multicolour side rails, and copy that describes how carefully the copy was written. Retain meaningful dates, product statuses, input labels, focus indicators, and qualifications that prevent a misleading claim. Use open sections and spacing; a border or container should clarify grouping or interaction, not act as a default decoration.

For company positioning and claim boundaries, use [`POSITIONING.md`](POSITIONING.md). For implementation details, use the live tokens and components; if the implementation and this guide diverge, resolve both rather than creating a third variant.

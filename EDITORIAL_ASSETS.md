# Ubunifu editorial image prompts — 2026-09-08

The first nine assets documented below were generated with the built-in image_gen tool using the imagegen skill. One generation per requested asset; no variants or regeneration. Original PNGs remain in the local generation output. All nine were visually reviewed and exported as optimized 1536 × 1024 WebP files. The fictional people scenes are now unused; neither is a staff, client, or office photograph. Keep this provenance even when an asset is not rendered. The later collection of eleven hero backgrounds and two service illustrations is documented, with exact prompts and saved paths, in [HERO_ARTWORK.md](HERO_ARTWORK.md).


## Usage and reuse

- Product illustrations are documented with exact prompts and saved paths in [PRODUCT_ARTWORK.md](PRODUCT_ARTWORK.md). Each product has its own wordless subject; the homepage preview remains text-led.
- Main page heroes: eleven distinct editorial backgrounds using navy, orange and restrained violet, with centered HTML copy and no generated wording. `HeroBackdrop` is static and loads only the route's image. The retired four-stage diagram and fictional people scenes remain unused.
- Services chapters use `SystemDiagram` SVGs for web, hosting, data, and AI, plus dedicated generated illustrations for branding and strategy. Their old raster replacements remain retained. The redundant brand specimen and generic priority matrix stay removed.
- Usambara and Safari King landscapes are retired from in-page rendering. `src/content/project-visuals.ts` maps their retained asset identifiers to text-free `EditorialVisual` / `SystemDiagram` SVGs everywhere the projects appear. Accessible descriptions remain, but visible wording belongs outside the artwork. Existing article social-image metadata remains unchanged; do not delete the legacy files while those references exist.
- The Safari King article extends its named case study. The homepage features another article cover to avoid showing that same project image twice.
- Usage-pricing belongs to the usage-based pricing article. All seven journal covers use distinct paths.
- Landscapes are illustrations, not factual location photography. Usambara art direction was checked against descriptions of forested hills and fertile slopes from [Tanzania Tourism](https://www.tanzaniatourism.com/destination/usambara-mountains).
- Do not recolour the logo, invent metrics, or represent these images as product interfaces. Existing public assets were retained, not overwritten or deleted.

## usambara-landscape

Runtime asset: [usambara-landscape-v3.webp](public/editorial/usambara-landscape-v3.webp)

Exact final prompt:

```text
Use case: stylized-concept
Asset type: website editorial illustration, landscape 3:2 composition, approximately 1536 x 1024 pixels.
Primary request: Create a sophisticated flat editorial landscape print inspired by the Usambara highlands of Tanzania: layered rounded forested ridges, modest fertile cultivated slopes, and one walking trail. Quiet, believable East African Eastern Arc hills near Lushoto, interpreted as a stylized illustration rather than a factual travel photograph.
Style/medium: flat screenprint-like editorial illustration, crisp shapes and restrained very subtle printed texture, no simulated depth effects.
Composition/framing: strong simple landscape composition, all essential subject matter comfortably inside a centered 4:3 crop; generous white negative space, several rounded ridge layers, one restrained orange earth path.
Color palette: white background, deep navy #1F1A36 and violet #6D3FE8 silhouettes, restrained orange #FF6B2C earth/path.
Text: none.
Avoid: snowy pointed Alps, fantasy mountains, three-dimensional contour model, funnels, interface motifs, 3D, glass, clay, glow, circuits, decorative arrows, floating dashboards, readable UI, logos, watermark, typography, clutter.
```

## website-planning

Runtime asset: [web-responsive-design.webp](public/editorial/web-responsive-design.webp)

Exact final prompt:

```text
Use case: ui-mockup
Asset type: flat editorial website service illustration, landscape 3:2, approximately 1536 x 1024 pixels.
Primary request: A desktop browser wireframe alongside a single mobile layout, with clearly aligned matching content regions expressing responsive web design. Two recognizable flat screens on white, minimal objects.
Style/medium: sophisticated flat editorial spot illustration with crisp navy linework, violet content blocks, and one orange interaction accent. Low fidelity conceptual wireframes with blank geometric content placeholders only.
Composition/framing: strong simple balanced composition; both screens and essential content comfortably inside a centered 4:3 crop, generous surrounding white negative space; legible at thumbnail size.
Color palette: white background, navy #1F1A36 outlines, violet #6D3FE8 regions, one restrained orange #FF6B2C interaction.
Text: none; no letters, words, numbers, or invented readable UI.
Avoid: graphs, icons collage, extra objects, 3D, isometric perspective, glass, clay, shadows suggesting volume, glowing circuits, decorative arrows, floating dashboards, logos, watermark.
```

## hosting-infrastructure

Runtime asset: [hosting-domains-email.webp](public/editorial/hosting-domains-email.webp)

Exact final prompt:

```text
Use case: infographic-diagram
Asset type: flat editorial website service illustration, landscape 3:2, approximately 1536 x 1024 pixels.
Primary request: One small server rack visibly connected with a simple clean line to a globe/domain ring and one email envelope. Exactly three focal objects. Clear conceptual relationship, elegant and readable at thumbnail size.
Style/medium: sophisticated flat technical editorial illustration, crisp simple geometry, flat solid navy server and delicate clear connector line on a white ground.
Composition/framing: simple balanced arrangement with generous whitespace. Keep all three subjects and connections comfortably inside a centered 4:3 crop.
Color palette: white background, deep navy #1F1A36 server and linework, restrained violet #6D3FE8 and orange #FF6B2C accents.
Text: none; no lettering, numbers, domains, logos, labels, or watermark.
Avoid: clutter, extra servers, cloud ecosystem, 3D, isometric objects, glass, clay, glow, circuits, decorative arrows, floating dashboards, made-up readable UI, volumetric shading.
```

## business-reporting

Runtime asset: [business-reporting.webp](public/editorial/business-reporting.webp)

Exact final prompt:

```text
Use case: productivity-visual
Asset type: flat editorial website service illustration, landscape 3:2, approximately 1536 x 1024 pixels.
Primary request: One report sheet showing a clean column chart and a single rising line chart. Beside it, one small source-records element consisting of three rows visibly feeds the report with a single simple connector. Only two main elements: the compact three-row source records and the report sheet. Communicate records becoming reporting.
Style/medium: sophisticated flat editorial illustration; conceptual diagram, not a product screenshot. Crisp navy strokes and flat purposeful orange and violet chart series on white. Source records use simple short geometric strokes, never text.
Composition/framing: strong simple composition, abundant white space; both main elements and connector comfortably inside a centered 4:3 crop; charts remain readable at thumbnail size.
Color palette: white, navy #1F1A36, purposeful orange #FF6B2C and violet #6D3FE8 chart series.
Text: none. No numbers, words, fake metrics, logo or watermark.
Avoid: additional sheets, dashboards, ornamental networks, decorative arrows, 3D, glass, clay, volumetric effects, glow, circuits, made-up readable UI.
```

## grounded-ai

Runtime asset: [grounded-ai-review.webp](public/editorial/grounded-ai-review.webp)

Exact final prompt:

```text
Use case: infographic-diagram
Asset type: flat editorial website service illustration, landscape 3:2, approximately 1536 x 1024 pixels.
Primary request: A source document passes through one small, simple branching decision diagram into a drafted answer sheet bearing a human review check mark. Exactly three main elements: source document, compact branching reasoning diagram, answer sheet with review check. The image represents grounded reasoning and human review.
Style/medium: sophisticated flat editorial illustration, simple confident navy lines, violet geometric document content blocks, one orange review check accent on the answer sheet; white background. Documents have abstract blank content bars only, not text.
Composition/framing: a clear simple flow with short unobtrusive connecting lines. Generous white space and all three subjects comfortably inside a centered 4:3 crop, readable at thumbnail size.
Color palette: navy #1F1A36 linework, violet #6D3FE8 document blocks, orange #FF6B2C review accent, white ground.
Text: none; no labels, letters, words, numbers, logos, or watermark.
Avoid: brain, robot, neon circuitry, laptop collage, magic sparkles, 3D, glass, clay, glow, floating dashboards, decorative arrows everywhere, excessive branching or clutter, readable UI.
```

## tanzania-workshop

Runtime asset: [tanzania-planning-workshop.webp](public/editorial/tanzania-planning-workshop.webp)

Exact final prompt:

```text
Use case: photorealistic-natural
Asset type: consulting services website hero; AI-generated illustrative scene of fictional professionals, not a staff or client photograph. Landscape 3:2, approximately 1536 x 1024 pixels. No caption inside the image.
Primary request: A photorealistic natural editorial scene of TWO fictional Tanzanian adult professionals, one woman and one man, in contemporary smart-casual navy clothing. They sit at a modest daylight worktable, candidly reviewing a paper project plan together.
Scene/backdrop: understated contemporary Tanzanian workplace with soft natural daylight, modest and believable surroundings. Table holds the paper project plan, a notebook and one closed laptop only, with subtle violet and orange stationery accents.
Composition/framing: candid side or three-quarter view, showing both people and their real hands naturally interacting with the paper. Wider composition with moderate negative space. Keep both people, hands, and the plan comfortably within a centered 4:3 crop.
Lighting/mood: soft natural window light, comfortable thoughtful collaboration, unposed, calm.
Materials/textures: realistic skin pores and natural skin texture, believable fabric, ordinary paper, natural table surface; no polished stock-photo sheen.
Color palette: navy #1F1A36 clothing, white and neutral setting, subtle violet #6D3FE8 and orange #FF6B2C stationery accents only.
Text: no readable writing on the plan, notebook, laptop, clothing, or background; no logos or watermark.
Avoid: posing, handshake, stereotyped dress, fake staff identity, extra people, extra devices or objects, dramatic cinematic lighting, overly smooth skin, artificial hands, 3D, glass effects, glowing circuits, decorative arrows, floating dashboards, made-up readable UI.
```

## tanzania-business-day

Runtime asset: [tanzania-business-day.webp](public/editorial/tanzania-business-day.webp)

Exact final prompt:

```text
Use case: photorealistic-natural
Asset type: website home hero; AI-generated illustrative scene featuring a fictional business owner, not a real team member or client. Landscape 3:2 composition, approximately 1536 x 1024 pixels. No caption in the image.
Primary request: One fictional Tanzanian woman business owner in modern navy smart-casual dress checks an ordinary open paper order book while holding a smartphone at a simple small-business office desk.
Style/medium: photorealistic natural editorial photograph, side-on mid-shot, candid unposed moment. Realistic skin pores, fabric texture and lived-in desk materials.
Scene/backdrop: quiet modest modern small-business office, window daylight, ordinary open paper order book, subtle orange pen and violet file, little clutter.
Composition/framing: wide balanced frame with moderate negative space; woman, hands, phone and order book comfortably within a centered 4:3 crop. Natural hand positions, gaze directed at the order book.
Color palette: navy #1F1A36 smart-casual clothing, natural white and neutral surroundings, subtle orange #FF6B2C pen and violet #6D3FE8 file.
Text: no readable text, numbers, logos or watermark anywhere; phone screen unreadable, order book has only indistinct non-legible marks.
Avoid: extra people, staged smile, posing, handshake, stereotyped dress, glossy stock-photo sheen, overly smooth skin, 3D, tech overlays, glow, circuits, floating dashboards, decorative arrows.
```

## usage-pricing

Runtime asset: [usage-based-pricing.webp](public/editorial/usage-based-pricing.webp)

Exact final prompt:

```text
Use case: infographic-diagram
Asset type: usage-based pricing article editorial illustration, landscape 3:2 composition, approximately 1536 x 1024 pixels.
Primary request: A small navy metering dial linked to one short receipt containing three purple usage bars and one orange total mark. A single clear visual idea: paying for measured use. Two main objects only: metering dial and receipt, joined by one simple unobtrusive line.
Style/medium: sophisticated simple flat editorial illustration, crisp navy outlines, flat violet usage bars, restrained orange total mark, clean white background.
Composition/framing: strong simple balanced composition with generous negative space; dial, link and receipt comfortably inside a centered 4:3 crop; instantly readable at thumbnail size.
Color palette: white ground, navy #1F1A36 dial and linework, violet #6D3FE8 usage bars, orange #FF6B2C total mark.
Text: none. No numerical metrics, currency symbols, words, labels, logos, or watermark.
Avoid: extra charts, dashboards, 3D, glass, clay, isometric objects, volumetric shadows, glow, circuits, decorative arrows, clutter, fake readable UI.
```

## safari-field-v3

Runtime asset: [safari-field-v3.webp](public/editorial/safari-field-v3.webp)

Exact final prompt:

```text
Use case: stylized-concept
Asset type: travel case-study website editorial illustration; conceptual travel illustration, not a photograph of the client's actual tour. Landscape 3:2 composition, approximately 1536 x 1024 pixels.
Primary request: A single safari vehicle seen at middle distance on an orange earth track crossing open Tanzanian savannah, one navy acacia tree, and a low distant violet horizon.
Style/medium: sophisticated flat editorial landscape print, simple crisp silhouettes with very subtle restrained screenprint texture, stylistically related to a flat Usambara highland landscape print in the same palette.
Composition/framing: quiet grounded composition, strong readable silhouettes, generous white negative space, all essential subjects comfortably inside a centered 4:3 crop. The safari vehicle is visibly a believable vehicle traveling on the earth track.
Color palette: white ground and sky, deep navy #1F1A36 tree and vehicle, violet #6D3FE8 low distant horizon, restrained orange #FF6B2C earth track.
Text: none; no letters, numbers, logos, labels, readable UI, or watermark.
Avoid: wildlife collage, additional animals or vehicles, snow, fantasy geography, abstract machines, UI, floating dashboards, decorative arrows, 3D, isometric objects, glass, clay, glowing circuits, volumetric effects, clutter.
```

## Case-study visuals — three rules

**1. Screenshots are additive, never substitutive.** `scripts/check-project-visuals.mjs`
requires `data-project-diagram="operations"` on `/work` and `/work/safari-king`, and
`"enquiry"` on `/work` and `/work/usambara-destination`. Deleting a diagram to make room
for a capture fails the build. Real captures go in `Project.shots[]` and render *below*
the diagram plate; `public/work/` is the drop. `EditorialVisual` falls through to
`next/image` for any src outside the two-entry `projectDiagrams` map, so
`/work/safari-king-admin.png` is already legal.

**2. Diagram geometry in SVG, every word in HTML outside it.** `check-project-visuals`
rejects any text node inside a diagram, and `check-typography.mjs` blocks inline
`fontSize` in `.tsx` — so labels drawn into the SVG could never reach the seven-step
type scale anyway. Labels belong in the `figcaption`.

**3. `entries[]` live on client-controlled sites.** Re-verify with `npm run
check:live-links` before shipping any row. That checker must use GET, not HEAD —
usambaradestination.com answers HEAD with 405/404 and GET with 200. It is deliberately
not in `npm run check` or `next build`: a client's outage must never block a deploy.

# Art direction — image generation

Source of truth for every illustration on the site. Version-controlled here, next to
the code that renders the files, so it cannot drift the way a doc outside the repo does.

**How to use this with ChatGPT:** ChatGPT cannot browse this file or the artifact — you
paste. For each image, paste the **style block** first, then the **subject prompt** for
the one image you want, as a single message. Generate, export to WebP, and overwrite the
existing filename. The paths are already wired up, so no code changes are needed.

Do not paraphrase the style block between images. Repeating it verbatim is what keeps
twenty-four separate generations looking like one set.

---

## Why the current art is being replaced

Measured, not a taste judgement. The home hero is a 3:2 image cropped into a 2.4:1 frame
with `object-position: center 58%`. On that crop, **74.6% of pixels sit within 2 L\* of
flat navy before any overlay is applied**. The detail is in the bottom corners; the middle
and top are empty sky — which is exactly where the headline sits.

Three faults, all fixed in the prompt rather than the CSS:

- **No focal subject.** Landscapes with scattered props read as wallpaper.
- **Detail in the wrong third.** Nothing was composed for text overlay.
- **Nothing technological.** Acacias say Tanzania. They do not say *systems*. Both are needed.

---

## The style block

Paste this first, every time.

```
STYLE — follow this exactly.

Medium: editorial vector illustration. Flat shapes with restrained depth. Not
photorealistic, not 3D render, not painterly.

Palette — use ONLY these six values, no other hues:
  #1F1A36  deep ink navy — the ground, edge to edge
  #FF6B2C  signal orange — ONE focal accent per image, used sparingly
  #6D3FE8  digital violet — secondary accent, rarer than the orange
  #3A3357  cool slate — mid-tone structure
  #4A4368  cool slate light — mid-tone structure
  #EDE7DD  warm bone — highlights, paper and lit surfaces only

Construction: crisp geometric forms built from rectangles, circles and straight
routed lines. Consistent thin stroke weight throughout. Generous negative space.
Isometric projection or straight-on elevation — no dramatic perspective.

Light: one soft directional source from the upper right. Long, very soft shadows.
One or two focal elements carry a wide, low-intensity ambient glow; nothing else does.

Surface: very fine film grain across the entire frame, roughly 3% strength.

Mood: engineered, calm, deliberate, quietly confident. This is infrastructure that
works, drawn by someone who respects it. Not futuristic, not playful, not corporate.

NEVER include: text, letters, numerals, logos, watermarks, UI chrome or screenshots,
glassmorphism, 3D bevels, chrome or metallic gradients, lens flare, drop shadows on
every object, people, faces, hands, brains, glowing humanoid AI figures, circuit-board
traces, binary digits, neon cyberpunk, holograms, rainbow or multi-stop gradients,
vignettes, borders, frames.
```

---

## Sizes and destinations

| Group | Generate at | Ratio | Quiet zone | Destination |
| --- | --- | --- | --- | --- |
| Home hero | 2400 × 1080 | 2.22:1 | Left 55% | `public/editorial/` |
| Page heroes | 2400 × 1000 | 2.4:1 | Centre 60% | `public/editorial/` |
| Products | 1600 × 1200 | 4:3 | none | `public/editorial/` |
| Services | 1600 × 1200 | 4:3 | none | `public/editorial/` |
| Article covers | 1600 × 900 | 16:9 | none | `public/editorial/` |

Convert with `cwebp -q 82 in.png -o out.webp`. Keep every hero under 150 KB — the
audience is mid-range Android on metered data.

**The quiet zone is the part people get wrong.** It is not a margin. The illustration
must still look composed when that region is covered by large white type: the subject
sits outside it, and inside it there is ground, atmosphere, and nothing that asks to be
looked at.

---

## Home hero — `hero-home-v1.webp`

The only image with copy on one side rather than the middle, and the most important on
the site.

```
SUBJECT: A working system assembling itself out of scattered inputs.

On the left, drawn small, dim and low-contrast: loose paper forms, a slim stack of
receipts, a simple handset, a ruled ledger book — the unstructured raw material of
a business, rendered almost as silhouettes in #3A3357 with no highlights.

Thin routed orange lines (#FF6B2C) leave these objects, travel rightward across the
frame with clean right-angle turns, and converge into the focal subject in the right
third: one coherent modular structure standing on a low isometric plinth. Stacked
flat planes locked together, a panel of simple bar forms, a slotted server block,
a rounded node — all in #4A4368 and #EDE7DD, precisely aligned, clearly ONE object
built from many parts. A wide soft orange glow sits behind it. A single violet
(#6D3FE8) element — one node or one routed line — for accent.

The frame reads left to right as: scattered inputs become one working system.

COMPOSITION — CRITICAL: This is a website hero and the LEFT 55% OF THE FRAME IS
COVERED BY LARGE WHITE HEADLINE TEXT. Keep the left 55% dark, quiet and nearly
empty: ground tone, faint atmosphere, and only the dim silhouette inputs described
above, low in the frame. No bright areas, no focal point, no detail clusters in the
left 55%. ALL brightness, detail and focus belongs in the RIGHT 45%. Verify the
composition still reads as deliberate when the left half is fully obscured.

FORMAT: 2400 × 1080px. Deep navy #1F1A36 ground, full bleed to all four edges.
No border, no frame, no vignette.
```

---

## Page heroes

Ten images, all behind **centred** copy — so the quiet zone is the middle. Paste the
style block, then the subject, then this shared rule.

```
COMPOSITION — CRITICAL: This is a website page header and THE CENTRE 60% OF THE
FRAME IS COVERED BY LARGE CENTRED WHITE TEXT — an eyebrow, a big headline and a
sentence of body copy. Keep the centre 60% dark, quiet and free of detail: ground
tone and faint atmosphere only. Place the subject matter in the LEFT and RIGHT
thirds, weighted toward the lower half of the frame, so the two sides balance each
other across the empty centre. No focal point, no bright area and no detail cluster
in the centre. Verify the composition still reads as deliberate when the middle is
fully obscured.

FORMAT: 2400 × 1000px. Deep navy #1F1A36 ground, full bleed to all four edges.
No border, no frame, no vignette.
```

### `hero-services-v1.webp` — Services

```
SUBJECT: Six distinct capabilities standing as one workshop.

Six different modular forms, each clearly a different kind of object but all built to
the same construction logic and the same stroke weight: a layered browser-window
slab (websites), a slotted server tower (hosting), a set of stacked colour plates
(brand), a panel of simple bar and line forms (data), a routed junction node with
inputs resolving to one output (AI), and an open drafting compass over a folded plan
(strategy). Arrange them as a workshop shelf or bench — three at the left edge, three
at the right — all resting on a common baseline rule that runs the width of the frame.
Thin orange routed lines connect them along that baseline, showing they are one
practice rather than six services. One violet node where two lines cross.
```

### `hero-work-v1.webp` — Work

```
SUBJECT: Finished systems, seen as built structures.

Two substantial completed assemblies, one in the left third and one in the right
third, each an isometric stack of locked-together planes and panels standing on its
own plinth — clearly finished, clearly solid, clearly in service. Warm bone (#EDE7DD)
lit faces catch the light from upper right. Faint orange routed lines run from each
assembly down into the baseline, as if connected and running. Between and behind them,
much dimmer and smaller, the ghosted outline of a third assembly still under
construction. The frame should feel like a yard of completed work.
```

### `hero-products-v1.webp` — Products

```
SUBJECT: Three products from one workbench.

Three related but visibly distinct modular objects: one built around a stack of
document planes, one built around a ledger-and-crate arrangement, one built as a set
of small interlocking blocks not yet fully assembled. Place two in the left third and
one in the right third, all on a shared surface. The two complete ones are lit in
warm bone with orange accents; the third is dimmer, outlined, fewer highlights — it
is still being made. A thin orange line runs beneath all three, connecting them to a
single point off the lower edge: one maker, three things.
```

### `hero-about-v1.webp` — About

```
SUBJECT: A technology workshop, rooted in its place.

In the left third: a working bench in isometric — a layered panel assembly mid-build,
a drafting square, a routed junction node, a small stack of plates. Warm bone
highlights, lit from the upper right. In the right third: a wide, low, flat-topped
horizon line drawn as clean geometry in #3A3357, with one thin bone-coloured contour
rule tracing it, and two or three flat-crowned acacia forms along it — small, dark
and restrained, present but not the subject. A single thin orange line runs from the
bench across the lower frame toward the horizon, tying the work to the land. This is
a place where things are engineered, that happens to be in Tanzania.
```

### `hero-industries-v1.webp` — Industries

```
SUBJECT: Different sectors, one underlying system.

Along the left and right thirds, a row of small distinct sector forms, each reduced to
one clean geometric emblem: a safari vehicle profile, a market stall canopy, a bank
column form, a clinic cross block, a seedling in a furrow, a school roof. All drawn at
the same scale, same stroke weight, same slate tones. Beneath all of them, running the
full width of the frame across the empty centre, a single continuous orange routed
line with a small node under each emblem — the shared infrastructure underneath
different businesses. One violet node marks the safari vehicle: the sector already
served.
```

### `hero-journal-v1.webp` — Insights

```
SUBJECT: Thinking worked out on paper.

In the left third: a loose fan of overlapping flat paper planes in warm bone, tilted
in isometric, with faint ruled lines — drafts and notes, no readable text, just the
rhythm of ruled lines. In the right third: those same planes resolved into one neat
squared stack with a thin orange rule across its top edge, and a single simple pen
form resting on it. Between them, crossing the empty centre low in the frame, three
thin orange guide lines showing the movement from scatter to conclusion. Calm,
studious, uncluttered.
```

### `hero-careers-v1.webp` — Careers

```
SUBJECT: A bench with room at it.

An isometric workbench running along the lower frame. In the left third: a workstation
in use — a layered panel assembly part-built, tools squared away, a small warm bone
lamp glow, orange routed lines active and running. In the right third: an identical
workstation, empty and waiting — same bench, same tools laid out ready, but unlit,
drawn in outline, its routed lines dim and unconnected. The invitation is structural,
not written: a place set, waiting for someone. Quiet, warm, not corporate.
```

### `hero-contact-v1.webp` — Contact

```
SUBJECT: A message finding its way to a person.

In the left third: a single flat paper plane form, warm bone, tilted as if just
released, with a soft orange glow behind it. A thin orange routed line leaves it and
travels rightward across the lower frame with clean right-angle turns, passing through
two small slate relay nodes. In the right third the line arrives at a simple lit
receiver — an open tray or a panel with one warm bone lamp above it, glowing softly, a
seat pulled up to it. Clearly received, clearly by someone. Unhurried and direct.
```

### `hero-privacy-v1.webp` — Privacy

```
SUBJECT: One message, one destination, nothing branching off.

In the left third: a single sealed flat envelope form in warm bone, closed, with one
orange seal mark. A single thin orange line leaves it and runs straight across the
lower frame — no branches, no forks, no copies, no relay taps — arriving in the right
third at one closed slate container with a simple clasp. Around the straight line,
drawn very faintly in outline only, several alternative routes that are visibly cut:
short dead-end stubs that stop and go nowhere. Restraint is the subject: the data goes
one place and nowhere else.
```

### `hero-brand-v1.webp` — Brand kit

```
SUBJECT: A mark being constructed, not decorated.

In the left third: a construction grid — faint slate baselines, a circle-and-square
scaffold, thin measurement rules with tick marks — the geometric armature a logotype
is built on. No letters, no glyphs, no readable forms: only the underlying scaffold.
In the right third: a neat column of flat colour plates in warm bone, orange, violet
and slate, squared and stacked like a paint chip set, each with a thin registration
mark on its edge. One orange rule runs across the lower frame linking the grid to the
plates. Precise, technical, a spec sheet rather than a poster.
```

---

## Products

No text overlays — these can carry full detail edge to edge.

### `product-insight-v1.webp` — Ubunifu Insight

```
SUBJECT: Many documents becoming one answer.

Lower left: a deep untidy stack of flat paper planes in slate and warm bone, tilted in
isometric, visibly varied — contracts, reports, ruled invoice sheets, a lesson plan
grid. No readable text; represent writing as fine horizontal rules only.

Thin orange routed lines rise from the stack and converge into a single slate
processing node in the centre — a clean geometric block, not a brain, not a chip, not
a face. From its far side ONE line continues upward to the upper right, where a single
crisp sheet in warm bone rests lit and squared, carrying three short orange rules and
one small violet highlighted row: the extracted answer.

The read is: unstructured many in, one clear answer out. A wide soft orange glow sits
behind the answer sheet only.

FORMAT: 1600 × 1200px. Navy #1F1A36 ground, full bleed. No border, no vignette.
```

### `product-sifa-v1.webp` — Ubunifu Sifa

```
SUBJECT: A trading business held together in one ledger.

Three grouped elements on a shared isometric surface, connected in a triangle by thin
orange routed lines:

Left — stock: a neat arrangement of flat-sided crates and cartons in slate, stacked on
a low pallet, one carton open and lit in warm bone.
Right — the counter: a simple slab counter form with a small receipt roll curling from
it in warm bone, marked with fine horizontal rules, no readable text.
Top centre — the ledger: an open double-page book in warm bone, ruled into two columns,
with a short orange bar on one side and a shorter violet bar on the other — money owed
and money paid, shown as proportion, not numerals.

Everything sits on one surface and connects back to the ledger: the whole shop,
accounted for. Warm bone highlights, lit from the upper right.

FORMAT: 1600 × 1200px. Navy #1F1A36 ground, full bleed. No border, no vignette.
```

### `product-rafiki-v1.webp` — Ubunifu Rafiki

```
SUBJECT: Small tools slotting into a site that already exists.

Centre: a large flat slab standing in isometric, representing an existing website —
plain, slate, with three empty recessed sockets cut into its face, each socket a clean
geometric cavity with a thin orange rim.

Approaching from the upper right, three small modular blocks in warm bone float in,
each shaped to match one socket and each carrying one simple emblem cut into it: a
speech-bubble notch (contact form), a calendar grid of squares (booking), a set of
ruled lines (blog). One block is already seated in its socket and lit, with a soft
orange glow. One hovers just above its socket, casting a soft shadow. The third is
further out and drawn in outline only, dimmer — still in development.

The read is: parts that fit something you already own. Nothing is being rebuilt.

FORMAT: 1600 × 1200px. Navy #1F1A36 ground, full bleed. No border, no vignette.
```

---

## Services

Only two service slots take a raster image. `web`, `hosting`, `data` and `ai` are drawn
in code by `SystemDiagram.tsx` as wordless SVG, and `scripts/check-project-visuals.mjs`
enforces that. **Do not replace those with images** — they are sharper, lighter and
already consistent.

### `service-branding-v1.webp` — Brand Identity & Design

```
SUBJECT: An identity being specified.

An isometric desk surface. Laid out on it with deliberate spacing: a column of flat
colour plates in navy, orange, violet and warm bone, squared and slightly overlapping
like a chip deck; a blank warm bone card and a blank folded letterhead, both unmarked;
a simple pen form and a drafting square resting at a clean angle; and a faint
construction grid drawn on the desk surface itself, with tick rules along two edges.

Lit from upper right with long soft shadows. One short orange rule runs along the base
of the colour column. Nothing on the stationery — it is blank, waiting, specified but
not yet printed.

FORMAT: 1600 × 1200px. Navy #1F1A36 ground, full bleed. No border, no vignette.
```

### `service-strategy-v1.webp` — Technology Strategy & Advisory

```
SUBJECT: A deliberate route chosen between several possible ones.

An isometric planning sheet laid flat, warm bone, with a faint slate grid and contour
rules across it. An open drafting compass stands over it, one leg planted at a marked
origin point.

Across the sheet, four or five candidate routes are drawn faintly in slate outline —
wandering, branching, some doubling back, one stopping dead. Over them, ONE route is
drawn confidently in solid orange: fewer turns, clean right angles, passing through
three small marked waypoint nodes, arriving at a single squared destination block in
warm bone that is lit and slightly raised off the sheet.

The read is: the alternatives were considered, and one was chosen. Precise and calm.

FORMAT: 1600 × 1200px. Navy #1F1A36 ground, full bleed. No border, no vignette.
```

---

## Article covers

Paste the style block, then this wrapper with `[SUBJECT]` replaced from the table below.

```
SUBJECT: [SUBJECT]

Treat this as a single clear diagrammatic scene with ONE focal element, not a
collection of icons. Build it from the same modular vocabulary as the rest of the set:
flat planes, slotted blocks, routed orange lines with right-angle turns, small slate
nodes, warm bone lit faces. Isometric projection, lit from the upper right. Composition
centred with generous air around the subject — this one is not overlaid with text.

FORMAT: 1600 × 900px. Navy #1F1A36 ground, full bleed. No border, no vignette.
```

| File | `[SUBJECT]` |
| --- | --- |
| `build-or-buy.webp` | A single fork in one routed orange line. The left branch leads to a stack of identical pre-made boxes, uniform and sealed. The right branch leads to one assembly being fitted together from distinct parts, lit and open. Both branches drawn with equal weight — the image poses the choice, it does not answer it. |
| `credit-ledger.webp` | An open ledger book in warm bone, ruled into two columns, standing in isometric. From the left column a short orange bar extends outward; from the right a shorter violet bar. A thin routed line runs from the ledger out to a small slate shop-counter form and loops back, showing credit going out and returning. Balance shown as proportion, never as numerals. |
| `software-tanzania-learning.webp` | A modular assembly being built on an isometric plinth, with a wide flat-topped horizon line and two small acacia forms behind it, dark and distant. Some parts are seated and lit in warm bone, others still hover in outline awaiting placement. Orange routed lines connect the seated parts. Building, in a specific place. |
| `swahili-learning.webp` | Two identical slate node blocks facing each other, connected by a thick orange routed line that passes through a central translation module — a slotted block where the line enters as one pattern of short rules and leaves as a different pattern. No letters or words; language shown purely as differing rhythms of fine rules. Equal weight on both sides. |
| `tourism-systems.webp` | A safari vehicle reduced to one clean geometric profile in slate, parked at the left. An orange routed line runs from it rightward through three small waypoint nodes — enquiry, booking, record — into a squared warm bone panel of stacked rules that sits lit on a plinth. The trip and the system behind it, drawn as one continuous run. |
| `usage-based-pricing.webp` | A simple isometric metering block with a single orange indicator bar filled partway along its length. A routed line enters one side and leaves the other; beneath the filled portion only, a row of small warm bone tick marks. Unfilled portion left dark and empty. You pay for the part that is lit. |
| `safari-field-v3.webp` | **Do not regenerate** — retired, rendered as an SVG diagram in code. |

---

## Icons — do not generate as images

The icon system is already the healthiest part of the design: Lucide, 33 icons, one grid,
one stroke weight. Raster icons cannot inherit `currentColor`, will not stay crisp at
24px, cannot be recoloured per theme, and drift in optical weight.

If you want something ownable, scope it to **six custom SVGs for the six service pillars**,
drawn to Lucide's grid. Ask for SVG source, not a picture:

```
Produce six icons as raw inline SVG code — not images, not a description.

Constraints, applied identically to all six:
- viewBox="0 0 24 24", fill="none", stroke="currentColor"
- stroke-width="1.75", stroke-linecap="round", stroke-linejoin="round"
- Geometry snapped to a 24px grid; keep a 2px clear margin on all sides
- Maximum 5 path or shape elements per icon; no fills, no gradients, no text
- Match the visual weight and optical density of the Lucide icon set

The six, each reduced to one structural idea rather than a literal picture:
1. Websites & Custom Platforms — layered planes in a browser frame
2. Hosting, Domains & Email — a slotted tower with one signal arc
3. Brand Identity & Design — three overlapping plates with a registration mark
4. Data & Business Intelligence — records resolving into a single trend rule
5. AI & Automation — several inputs converging through one node to one output
6. Technology Strategy & Advisory — branching routes with one marked and chosen

Return six code blocks, each with a comment naming the icon. No commentary.
```

---

## People

Worth being deliberate here, because this is where competitors beat us and where
generated imagery is most likely to backfire.

**Kiliweb's warmth comes from real photographs of real Tanzanian people.** That is
their strongest asset and it is not something a generated image can substitute for.

### Rule 1 — do not generate photorealistic people

No AI-generated faces presented as staff, founders, clients or customers. It is the
same credibility failure as the anonymous paraphrased testimonial already flagged in
the review: a prospect who senses it, or reverse-image-searches it, stops trusting
everything else on the page. A consultancy selling judgement cannot afford that.

### Rule 2 — the two real photographs are worth more than twenty generated ones

`src/content/team.tsx` already has an optional `photo` field on both founders, wired
and rendering — and **neither is set**, so the About page shows initials. Two honest
headshots is the single highest-value people asset available, and it costs a phone
camera and good window light. Save as `public/team/richard.webp` and
`public/team/happygod.webp`, then set `photo` on each member.

### Rule 3 — illustrated figures are fine, and useful

Figures drawn in the house style read as diagram, not as a claim about real people.
Use them where a human is part of the *mechanism* — a person reviewing AI output, a
shopkeeper at a counter. Add this block after the style block. It deliberately
**overrides** the `people, faces, hands` exclusion in the style block, so paste both
and let this one win:

```
FIGURES: This overrides the "no people, faces, hands" exclusion above.
 Any person in this image is a simplified geometric figure, built from the
same vocabulary as everything else: flat shapes, consistent stroke weight, no
outlines around the body. NO facial features at all — no eyes, nose, mouth or
expression. The head is a plain rounded form. Skin is rendered as a flat mid-tone
that sits in the palette, never as a rendered skin colour. Posture carries the
meaning: leaning in, reaching, seated at work. Figures are never the focal point —
they are shown at the scale of the equipment they are using, as part of the system
rather than in front of it. No crowds, no groups posed at a camera, no handshakes,
no pointing at charts, no headsets.
```

### Where figures earn their place

| File | Subject |
| --- | --- |
| `grounded-ai-review.webp` | A seated figure at a simple desk, turned toward a warm bone panel that shows three ruled rows, one marked with a small orange check and one with a violet query mark. The figure's hand rests near the panel — the judgement is theirs. Behind the panel, a routed orange line runs back to a slate document stack. The read is: the machine proposed, the person decided. |
| `product-sifa-v1.webp` (variant) | A figure standing behind the slab counter, one hand on a receipt roll, the other on the open ledger. Stock crates to one side, the ledger lit. The figure is the same height as the counter equipment and set back from it. Shopkeeping as a working system. |
| `hero-careers-v1.webp` (variant) | At the occupied workstation, one seated figure leaning slightly into the work, lit by the warm bone lamp. The second workstation stays empty and unlit. Reads as an invitation without writing one. |
| `tanzania-planning-workshop.webp` | Three figures seated around an isometric table with a large planning sheet between them, all leaning toward it rather than toward each other. Routed orange lines on the sheet resolve into one marked route. Nobody presents; everyone works. |

Keep the count low. Two or three illustrations with figures across the whole site is
plenty — the moment figures appear everywhere, the set stops reading as engineering
diagrams and starts reading as stock illustration.

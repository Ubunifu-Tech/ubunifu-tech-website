# Ubunifu Technologies — Brand System

This is the concise source of truth for Ubunifu’s visual identity. Keep it aligned with the implemented tokens in [`src/app/globals.css`](src/app/globals.css), the logo component in [`src/components/BrandMark.tsx`](src/components/BrandMark.tsx), and the live brand kit at [`/brand`](https://ubunifutech.com/brand).

Last updated: 23 August 2026.

## Brand idea

Ubunifu is an Arusha-based consulting company and product studio. The identity should feel technically credible, practical, warm, and built close to the work.

The canonical tagline is:

> Consulting + products, built in Tanzania.

Use the tagline as supporting copy, never inside the navigation or logo lockup.

## The Ubunifu Ligature

The canonical mark is the **Ubunifu Ligature**: an interlocking U/T glyph built specifically for **Ubunifu Technologies**. The orange U supplies an open, grounded base; the purple T crosses and continues through it, with a rising angled crown that gives the symbol momentum. Together the two letters read as one connected piece of craft rather than a generic technology icon.

The full horizontal lockup always spells **Ubunifu Technologies** on one baseline. Neither word is a descriptor or optional subline: both carry the company name at a clear, readable scale.

The master mark uses two crisp solid colors:

- Orange U: `#FF6B2C`
- Purple T: `#6D3FE8`

The orange-to-purple gradient is a separate signature device for large headlines, paths, progress treatments, and atmospheric backgrounds. Do not apply a gradient to the master Ligature.

### Canonical assets

Downloadable vector masters live in [`public/brand/`](public/brand/):

| Asset | Use |
|---|---|
| [`ubunifu-mark.svg`](public/brand/ubunifu-mark.svg) | Default two-color Ligature on light backgrounds |
| [`ubunifu-lockup.svg`](public/brand/ubunifu-lockup.svg) | Full-color “Ubunifu Technologies” horizontal lockup on light backgrounds |
| [`ubunifu-mark-navy.svg`](public/brand/ubunifu-mark-navy.svg) | Single-color mark where a restrained treatment is needed |
| [`ubunifu-mark-white.svg`](public/brand/ubunifu-mark-white.svg) | Reversed mark on dark backgrounds |
| [`ubunifu-lockup-white.svg`](public/brand/ubunifu-lockup-white.svg) | Reversed horizontal lockup on dark backgrounds |

Raster delivery assets:

- [`public/logo-v2.png`](public/logo-v2.png) — 512 × 512 social avatar
- [`public/og.png`](public/og.png) — 1672 × 941 default social preview; a dimensional campaign rendering, not a replacement logo master

The [`/brand`](https://ubunifutech.com/brand) page is the shareable reference and download surface. The five SVG files are the canonical logo masters; raster artwork is derived delivery media.

### Logo rules

- Preserve the Ligature’s interlocking U/T geometry, rising angled T crown, rounded joins, and clear silhouette.
- Use the default mark on light surfaces and the white or navy alternatives when contrast requires them.
- Keep generous clear space around the mark; do not crowd it with copy or other symbols.
- Do not stretch, rotate, crop, outline, shadow, box in, recolor, or redraw the mark.
- Do not add a tagline inside the navigation or lockup, or use the Ligature as a decorative letter inside another word.
- Use the mark alone for favicons, avatars, and compact product signatures; use the full “Ubunifu Technologies” lockup whenever the company name should be explicit.

## Canonical palette

Use CSS tokens in product code. Hex values are for exported assets and external tools.

| Role | Token | Hex | Primary use |
|---|---|---|---|
| Page background | `--background` | `#F4F2FB` | Default soft-lavender canvas |
| Surface | `--surface` | `#FFFFFF` | Cards, forms, navigation |
| Alternate surface | `--surface-2` | `#FAF8FE` | Section contrast |
| Subtle surface | `--surface-3` | `#F0EDF9` | Panels and quiet dividers |
| Primary text | `--text-primary` | `#1F1A36` | Headings and body copy |
| Secondary text | `--text-secondary` | `#5A5170` | Supporting copy |
| Tertiary text | `--text-tertiary` | `#6B6385` | Labels and helper text |
| Brand orange | `--brand` | `#FF6B2C` | Ligature U, large accents, paths |
| Orange hover | `--brand-hover` | `#E8581E` | Decorative interaction state |
| Deep orange | `--brand-deep` | `#C44615` | Accessible orange button fill |
| Purple | `--primary` | `#6D3FE8` | Ligature T, links, secondary accent |
| Purple hover | `--primary-hover` | `#5A2DD0` | Purple interaction state |
| Deep purple | `--primary-deep` | `#3D1FA0` | Strong text and pressed states |
| Blue | `--accent` | `#2E5BFF` | Rare decorative emphasis |
| Clay | `--clay` | `#C2693B` | Restrained editorial warmth |

Orange and purple are the identity pair. Navy carries the message. Blue and clay are supporting notes, never competing primaries.
The interactive aliases deliberately use `--cta: var(--brand-deep)` and `--cta-hover: var(--text-primary)` so white CTA text retains contrast.

### Contrast rules

- Use navy, secondary, tertiary, purple, or deep purple for normal text on light surfaces.
- Bright orange `#FF6B2C` is for the Ligature and large decoration, not small text or essential control boundaries on light backgrounds.
- For white text on an orange CTA, use deep orange `#C44615`, not bright orange.
- Clay is decorative on light surfaces; do not use it for normal-size body text.
- Body text and interactive text must meet WCAG AA contrast: at least `4.5:1` for normal text and `3:1` for large text. Essential non-text controls and focus indicators need at least `3:1` against adjacent colors.
- Never communicate status, errors, or selection through color alone. Pair color with text, shape, iconography, or another visible state.
- Keep visible keyboard focus. Motion and smooth scrolling must respect `prefers-reduced-motion`.

## Typography

Fonts are loaded through `next/font` in [`src/app/layout.tsx`](src/app/layout.tsx).

| Role | Family | Weights | Guidance |
|---|---|---|---|
| Display and headings | Poppins | 600, 700, 800 | Compact, confident, tight tracking |
| Body and interface | Inter | 400–700 | Clear, neutral, generous line height |
| Labels and kickers | System monospace | 500–700 | Uppercase, short, widely tracked |

Use Poppins for hierarchy, not paragraphs. Use Inter for all sustained reading and controls. Monospace is a small editorial device for labels and process language, not a body face. There is no serif in the core system.

## Editorial image system

Editorial imagery explains an idea instead of decorating a page. It should feel like a premium adult learning object: precise, tactile, calm, and recognizably part of Ubunifu.

### Visual language

- Start with one clear conceptual metaphor or part-to-whole relationship.
- Prefer top-down or carefully staged compositions with strong geometry and generous breathing room.
- Use matte paper, unglazed ceramic, textile, subtle topographic embossing, and restrained real-world texture.
- Light with a warm directional source and soft, controlled shadows. Keep depth of field restrained enough that the idea remains legible.
- Use one orange-to-purple path or progression when connection, reasoning, or the delivery loop is part of the story.
- Keep the image inside the canonical palette above. Natural materials may use closely controlled clay and warm neutral values.
- Avoid generic technology stock imagery, glowing screens, fake dashboards, fake metrics, logos, watermarks, cartoon styling, decorative pseudo-text, flags, and stereotyped regional patterns.
- Do not put readable copy inside generated images. Titles and captions belong in accessible HTML.

### Composition and delivery

- Standard editorial canvas: **1672 × 941, 16:9**.
- Keep the focal idea inside a centered safe area so the image can crop to 4:3 and square without losing meaning.
- Store editorial concepts in [`public/editorial/`](public/editorial/). Prefer WebP at runtime when a paired WebP exists; retain PNG only when it is the required source or delivery format.
- Store real client and product evidence in [`public/work/`](public/work/). Do not present a generated concept image as proof of shipped work.
- Write alt text for the idea and meaningful objects, not for every decorative texture or the generation style.

## Voice and usage

The visual system and writing voice should agree: confident, warm, specific, and honest. Favor concrete outcomes over adjectives. Do not invent customer counts, ratings, performance metrics, sector experience, or product usage.

For company positioning and claim boundaries, use [`POSITIONING.md`](POSITIONING.md). For implementation details, use the live tokens and components; if the implementation and this guide diverge, resolve both rather than creating a third variant.

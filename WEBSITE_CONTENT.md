# Ubunifu Technologies — Website Reference

A maintenance reference for ubunifutech.com — the site **as it is actually
built**: pages, where each piece of content lives, and the data files to edit.
For positioning/voice see `POSITIONING.md`; for the visual system see
`BRANDING.md`; for the change log see `SITE_IMPROVEMENTS.md`.

Last refreshed: May 2026.

---

## Company facts

- **Name:** Ubunifu Technologies
- **What we are:** a Tanzania-based digital-solutions agency
- **Tagline:** Digital solutions for Tanzania.
- **HQ:** Arusha, Tanzania (serving nationwide)
- **Email:** info@ubunifutech.com
- **Phone / WhatsApp:** +255 748 548 816

Single source of truth: `src/content/site.ts`.

---

## Page map

| Route | Page | File |
|---|---|---|
| `/` | Home — agency overview | `src/app/page.tsx` |
| `/build` | Services — five capability spotlights | `src/app/build/page.tsx` |
| `/industries` | Industries — who we serve | `src/app/industries/page.tsx` |
| `/work` | Our Work — client projects | `src/app/work/page.tsx` |
| `/work/[slug]` | Case study | `src/app/work/[slug]/page.tsx` |
| `/about` | About — vision, mission, story, team | `src/app/about/page.tsx` |
| `/blog` | Blog index (category filter) | `src/app/blog/page.tsx` |
| `/blog/[slug]` | Blog post | `src/app/blog/[slug]/page.tsx` |
| `/careers` | Careers (footer link only) | `src/app/careers/page.tsx` |
| `/contact` | Contact — the only form | `src/app/contact/page.tsx` |
| `/products` | Products (proof page; not in nav) | `src/app/products/page.tsx` |

**Nav order:** Home · Services · Industries · Work · About · Blog · Contact.
"Products" and "Careers" are intentionally not headline nav items (products
appear as proof; Careers lives in the footer).

Branded `not-found.tsx`, dynamic OG cards (`opengraph-image.tsx` at root +
per blog post + per case study), and `sitemap.ts` round out the app routes.

---

## Home page (`/`) — section order

```
Navbar          — floating, contained glass bar (sits above the page)
Hero            — "Digital solutions, built for Tanzania." + client-build proof
ProblemStrip    — "Why Ubunifu": 4 differentiators (icons)
ServicesPreview — 5 service icon cards + gradient CTA tile → /build
SectorsStrip    — sectors we serve (icon tiles) → /industries
WorkPreview     — client case-study cards
ProductsProof   — Insight + Sifa as "products we've built"
Testimonial     — Isaac, Usambara
Insights        — three most recent blog posts → /blog
TechMarquee     — scrolling tech logos
AboutPreview    — short about + link
CtaBand         — "Got something to build?" (its own section, not the footer)
Footer          — dark, self-contained columns block
```

---

## Services (`/build`)

Five pillars, defined in `src/content/services.tsx` (icon, title, summary,
description, items): **Digital Presence & Web · Branding & Visual
Communication · Data Analytics & BI · Intelligent Automation & AI · Digital
Strategy & Consulting.** Rendered as alternating **`Spotlight`** rows (real
proof screenshot or a branded panel, with an overlapping card), a jump-chip
sub-nav, then a three-step process and the Work preview. Hero carries the
animated `CodeWindow`. Copy is outcome-framed ("We help you harness AI…").

## Industries (`/industries`)

`src/content/sectors.tsx` — per-sector `summary` + `offerings`. Tourism leads
as a proven `Spotlight` (real Safari King site + overlapping "Proven" card);
the other seven sectors (SMEs/Retail, Finance, NGOs, Healthcare, Agriculture,
Education, Government) are substantive cards. Framed as capability, not claimed
clients. The homepage `SectorsStrip` links here.

## Work (`/work`)

`src/content/portfolio.tsx` — **Safari King Africa** (booking platform + CRM +
AI assistant) and **Usambara Destination** (eco-tourism site). Each has a full
case study at `/work/[slug]` with overview, highlights, gallery, stack, and a
"next project" link.

## Products (proof)

`src/content/products.tsx` — **Insight** (live, document AI), **Sifa** (live,
business management), **Rafiki** (coming soon). Shown as proof of capability,
not the site's headline. The `/products` page still renders the full uniform
grid for anyone who wants the detail.

## About (`/about`)

An editorial story (`src/content/about.tsx` holds the narrative): PageHeader →
**Vision & Mission** statement cards → **Why we exist** (narrative + a
brand-tinted photo with an overlapping card) → **Objectives** → values (4,
`src/content/values.tsx`) → **How we work** (numbered four-step approach) → team.

Team (`src/content/team.tsx`):
- **Richard Pallangyo — Data, Software & AI Engineer.** GitHub + LinkedIn.
- **HappyGod Pallangyo — IT, Design & Support.**

## Blog (`/blog`)

Markdown in `_posts/` via `src/lib/blog.ts`. Featured latest post, category
filter (`BlogIndex`), reading time, numbered editorial grid. Posts carry a
reading-progress bar and per-post metadata + OG cards. Seven posts published.

## Contact (`/contact`)

The single contact form (`Contact` with `hideIntro`) under a PageHeader, with a
"what happens next" micro-timeline. The `CtaBand` on every other page links here.

---

## Content data files

| File | Controls |
|---|---|
| `src/content/site.ts` | Company info, nav links, footer columns |
| `src/content/services.tsx` | The five service pillars |
| `src/content/sectors.tsx` | Sectors / Industries (summary + offerings) |
| `src/content/pillars.tsx` | Home "Why Ubunifu" strip |
| `src/content/values.tsx` | About values |
| `src/content/about.tsx` | About vision / mission / objectives / approach |
| `src/content/products.tsx` | Products (proof) |
| `src/content/portfolio.tsx` | Client projects + case studies |
| `src/content/team.tsx` | Team members |
| `src/content/testimonials.tsx` | Client testimonials |
| `_posts/*.md` | Blog posts |

---

## Design tokens & components

Visual system lives in `BRANDING.md` and `src/app/globals.css` (warm-orange
brand `#FF6B2C`, purple accent `#6D3FE8`, lavender background `#F4F2FB`; Outfit
+ Inter; topography + grain + aurora signature). Icons via `lucide-react`
(UI) and `react-icons` (tech logos). Animations via `framer-motion`, smooth
scroll via Lenis (`SmoothScroll`), all reduced-motion-gated.

**Chrome:** the `Navbar` is a floating, contained glass bar (sits above the
page); the `Footer` is a dark, self-contained columns block; the closing CTA is
its own `CtaBand` section (a contained dark card), never inside the footer.

Notable components: `Hero`, `ProblemStrip`, `HomePreviews` (Services / Sectors
/ Work / ProductsProof / About previews), `Spotlight` (alternating feature
rows, reused on Services + Industries), `CtaBand`, `Insights`, `Products`,
`Portfolio`, `Testimonial`, `CodeWindow`, `Topography`, `PageHeader`, `Contact`,
`BlogIndex`, `ReadingProgress`, `TechMarquee`, `Navbar`, `Footer`,
`WhatsAppButton`.

---

## Known follow-ups

- Add real outcome metrics to case studies once measured.
- Real team headshots (currently branded initials).
- Capture more Sifa / Insight screenshots (and recapture Insight with
  populated data); the Education Tutor Swahili screen is the strongest asset.
- Keep publishing blog posts (Swahili + English).
- Consider dark mode and a newsletter capture.

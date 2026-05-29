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
| `/build` | Services — the five pillars | `src/app/build/page.tsx` |
| `/work` | Our Work — client projects | `src/app/work/page.tsx` |
| `/work/[slug]` | Case study | `src/app/work/[slug]/page.tsx` |
| `/about` | About — vision, values, team | `src/app/about/page.tsx` |
| `/blog` | Blog index (category filter) | `src/app/blog/page.tsx` |
| `/blog/[slug]` | Blog post | `src/app/blog/[slug]/page.tsx` |
| `/careers` | Careers | `src/app/careers/page.tsx` |
| `/contact` | Contact — the only form | `src/app/contact/page.tsx` |
| `/products` | Products (proof page; not in nav) | `src/app/products/page.tsx` |

**Nav order:** Home · Services · Work · About · Blog · Careers · Contact.
"Products" is intentionally not a headline nav item — products appear as
proof on the home page and in the footer.

Branded `not-found.tsx`, dynamic OG cards (`opengraph-image.tsx` at root +
per blog post + per case study), and `sitemap.ts` round out the app routes.

---

## Home page (`/`) — section order

```
Navbar
Hero            — "Digital solutions, built for Tanzania." + client-build proof
ProblemStrip    — "Why Ubunifu": 4 differentiators (icons)
ServicesPreview — 5 service icon cards + gradient CTA tile
SectorsStrip    — sectors we serve (icon tiles)
WorkPreview     — client case-study cards
ProductsProof   — Insight + Sifa as "products we've built"
Testimonial     — Isaac, Usambara
TechMarquee     — scrolling tech logos
AboutPreview    — short about + link
Footer          — CTA band + link columns
```

---

## Services (`/build`)

Five pillars, defined in `src/content/services.tsx` (icon, title, summary,
description, items): **Digital Presence & Web · Branding & Visual
Communication · Data Analytics & BI · Intelligent Automation & AI · Digital
Strategy & Consulting.** Rendered as icon cards with checklists, then a
three-step process and the Work preview. Hero carries the animated
`CodeWindow`.

## Sectors

`src/content/sectors.tsx` — Tourism (proven) plus SMEs/Retail, Finance, NGOs,
Healthcare, Agriculture, Education, Government (targeted). Presented as focus
areas, not as claimed clients.

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

PageHeader → values (4, `src/content/values.tsx`: Built for Tanzania · We
build it then run it · Pragmatic not flashy · One team no handoffs) → team.

Team (`src/content/team.tsx`):
- **Richard Pallangyo — Data, Software & AI Engineer.** GitHub + LinkedIn.
- **HappyGod Pallangyo — IT, Design & Support.**

## Blog (`/blog`)

Markdown in `_posts/` via `src/lib/blog.ts`. Featured latest post, category
filter (`BlogIndex`), reading time, numbered editorial grid. Posts carry a
reading-progress bar and per-post metadata + OG cards. Seven posts published.

## Contact (`/contact`)

The single contact form (`Contact` with `hideIntro`) under a PageHeader, with a
"what happens next" micro-timeline. Every page's footer CTA links here.

---

## Content data files

| File | Controls |
|---|---|
| `src/content/site.ts` | Company info, nav links, footer columns |
| `src/content/services.tsx` | The five service pillars |
| `src/content/sectors.tsx` | Sectors we serve |
| `src/content/pillars.tsx` | Home "Why Ubunifu" strip |
| `src/content/values.tsx` | About values |
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

Notable components: `Hero`, `ProblemStrip`, `HomePreviews` (Services / Sectors
/ Work / ProductsProof / About previews), `Products`, `Portfolio`, `Testimonial`,
`CodeWindow`, `Topography`, `PageHeader`, `Contact`, `BlogIndex`,
`ReadingProgress`, `TechMarquee`, `Footer`, `WhatsAppButton`.

---

## Known follow-ups

- Add real outcome metrics to case studies once measured.
- Real team headshots (currently branded initials).
- Capture more Sifa / Insight screenshots (and recapture Insight with
  populated data); the Education Tutor Swahili screen is the strongest asset.
- Keep publishing blog posts (Swahili + English).
- Consider dark mode and a newsletter capture.

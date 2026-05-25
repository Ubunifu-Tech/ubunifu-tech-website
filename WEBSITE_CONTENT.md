# Ubunifu Technologies — Website Reference

A maintenance reference for ubunifutech.com. This describes the site **as it is
actually built** — pages, where each piece of content lives, and the design
tokens in use. Edit content in the data files noted below, not in components.

Last refreshed: May 2026.

---

## Company facts

- **Name:** Ubunifu Technologies
- **Tagline:** Building software for Africa.
- **Location:** Arusha, Tanzania
- **Email:** info@ubunifutech.com
- **Phone / WhatsApp:** +255 748 548 816

These live in `src/content/site.ts` — the single source of truth for company
info, navigation, and footer links.

---

## Page map

The site is multi-page. Routes:

| Route | Page | File |
|---|---|---|
| `/` | Home — overview of everything | `src/app/page.tsx` |
| `/products` | Products — the four-product lineup | `src/app/products/page.tsx` |
| `/build` | Services — custom software & consulting | `src/app/build/page.tsx` |
| `/work` | Our Work — client projects | `src/app/work/page.tsx` |
| `/about` | About — mission, values, team | `src/app/about/page.tsx` |
| `/blog` | Blog — post listing | `src/app/blog/page.tsx` |
| `/blog/[slug]` | Individual blog post | `src/app/blog/[slug]/page.tsx` |
| `/careers` | Careers | `src/app/careers/page.tsx` |

Navigation order (nav bar): Services, Products, Work, About, Blog, Careers.
Contact is a section (`#contact`) included on the Home, Products, and Work
pages rather than a standalone route.

---

## Home page (`/`) — section order

```
Navbar
Hero            — "We build software for Africa."
ProblemStrip    — 3 columns: Products / Consulting / Our approach
Products        — the 4-product grid
About           — "Why we exist" + 4 values cards
Portfolio       — client project showcase
Clients         — logo strip (Safari King, Usambara)
Contact         — info + message form
Footer          — CTA band + link columns
```

---

## Products

Four products. Content lives in `src/content/products.tsx`.

1. **Ubunifu Insight** — *Live.* Document AI for teams: upload documents, ask
   questions in plain language, get cited answers, extract data, generate
   reports. `insight.ubunifutech.com`
2. **Ubunifu Sifa** — *Live.* Business management for Tanzanian SMBs: sales/POS,
   inventory, employees, reporting. Works offline. `sifa.ubunifutech.com`
3. **Ubunifu Rafiki** — *Coming soon.* Embeddable website widgets — contact
   forms, booking systems, blog tools. `rafiki.ubunifutech.com`
4. **Ubunifu Build** — *Available.* Custom software, websites, data, and
   consulting. Lives at `/build`.

---

## Services (`/build`)

Five service areas (defined in `src/app/build/page.tsx`): Web Development, Data
Analytics, Brand Design, AI & Automation, Digital Strategy. Followed by a
three-step process (Tell us what you need → We scope and plan → We build and
deliver) and the Portfolio showcase.

---

## Work (`/work`)

Client projects, defined in `src/content/portfolio.tsx`:

- **Safari King Africa** — safari booking platform. `safarikingafrica.com`
- **Usambara Destination** — eco-tourism website. `usambaradestination.com`

The same two clients appear as a logo strip via the `Clients` component on the
Home, Products, and About pages.

---

## About (`/about`)

Page header → values cards → team → client logos → CTA.

Values (`src/content/values.tsx`): Built for Africa from the start · No
unnecessary complexity · Pricing that matches the market · Tanzania-first,
Africa-wide.

Team (`src/content/team.tsx`):

- **Richard Pallangyo** — Data & AI Builder. AI/ML, data engineering, Python/FastAPI, product.
- **HappyGod Pallangyo** — Creative Director. Brand identity, UI/UX, visual direction, video.

Team photos are currently branded initials avatars. To use real headshots,
drop image files into `public/images/` and set the `photo` field in
`src/content/team.tsx`.

---

## Blog (`/blog`)

The listing page reads markdown files from the `_posts/` directory via
`src/lib/blog.ts`. Two posts are published:

- *Building Software for Africa: Where the Real Opportunity Is*
- *Why We Chose Pay-as-You-Go Pricing*

To add a post, create a new `.md` file in `_posts/` with frontmatter
(`title`, `date`, `author`, `excerpt`, `tags`). Draft outlines for upcoming
posts are tracked separately in `BLOG_OUTLINES.md`.

---

## Content data files

All editable content is separated from components:

| File | Controls |
|---|---|
| `src/content/site.ts` | Company info, nav links, footer columns |
| `src/content/products.tsx` | The four products |
| `src/content/values.tsx` | About-page values cards |
| `src/content/pillars.tsx` | Home ProblemStrip (3 columns) |
| `src/content/portfolio.tsx` | Client projects / Work page |
| `src/content/team.tsx` | Team members |
| `_posts/*.md` | Blog posts |

---

## Design tokens (`src/app/globals.css`)

The site uses a warm-orange brand with a deep-purple accent on a light
lavender background.

| Token | Value | Usage |
|---|---|---|
| `--background` | `#F4F2FB` | Page background (light lavender) |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--brand` | `#FF6B2C` | Primary brand — CTAs, buttons, eyebrows |
| `--brand-hover` | `#E8581E` | CTA hover |
| `--primary` | `#6D3FE8` | Purple accent — gradients, hover states |
| `--accent` | `#2E5BFF` | Blue accent — used sparingly |
| `--text-primary` | `#1F1A36` | Headings, body |
| `--text-secondary` | `#5A5170` | Supporting text |
| `--text-tertiary` | `#8B82A0` | Captions, meta |
| `--border` | `rgba(31,26,54,0.08)` | Card borders |

**Type:** Outfit for headings (`--font-heading`), Inter for body
(`--font-body`).

**Layout:** max content width `1280px`; nav height `72px`; standard section
padding `120px` vertical.

---

## Shared components

`Navbar`, `Footer`, `PageHeader` (clean page intro for sub-pages), `Hero`,
`ProblemStrip`, `Products`, `About`, `Team`, `Portfolio`, `Clients`, `Contact`,
`WhatsAppButton`, plus animation helpers (`ScrollReveal`, `MotionCard`,
`BuildCards`, `SmoothScroll`).

---

## Known follow-ups

- Replace team initials avatars with real headshots.
- Replace the Portfolio "browser mockup" logo treatment with real project
  screenshots when available.
- Add real testimonials / client quotes once collected.
- Consider a standalone `/contact` page if the contact section outgrows
  being a shared section.
- Publish the blog posts outlined in `BLOG_OUTLINES.md` once the facts in
  each `[NEEDS INPUT]` marker are confirmed.

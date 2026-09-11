# Ubunifu Technologies — Site as Built

This is the maintenance map for `ubunifutech.com`: current routes, rendered narratives, content sources, and operational behavior. Use [`POSITIONING.md`](POSITIONING.md) for company claims and voice, [`BRANDING.md`](BRANDING.md) for the visual system, and [`SITE_IMPROVEMENTS.md`](SITE_IMPROVEMENTS.md) for change history.

Last refreshed: 8 September 2026.

## Company frame

- **Category:** Arusha-based technology consultancy that also builds and operates products
- **Tagline:** Consulting + products, built in Tanzania.
- **Location:** Arusha, Tanzania
- **Contact:** `info@ubunifutech.com` · `+255 748 548 816`

Company details, primary navigation, footer columns, and product/service URLs are centralized in [`src/content/site.ts`](src/content/site.ts). The Footer component owns its Privacy and Brand-kit legal links.

## Navigation and shared chrome

The full **Ubunifu Technologies** lockup links home. Its original Ubunifu Ligature interlocks an orange U and violet T, while dark navy anchors the wordmark; both words sit at one readable size on one baseline. Primary navigation is:

> Services · Work · Products · Insights · About

“Start a project” links to `/contact` as the desktop and mobile CTA. The positioning line “Consulting + products, built in Tanzania.” is supporting copy and never appears inside the navigation or logo lockup. The footer adds product links, all service anchors, Industries, Careers, Contact, Privacy, and the Brand kit.

[`src/app/layout.tsx`](src/app/layout.tsx) renders the skip link, Navbar, page content, Footer, and WhatsApp button. Lenis smooth scrolling is disabled for reduced-motion users. Most marketing pages render their own closing `CtaBand`; Contact, Careers, Privacy, Brand, and the 404 do not.

Typography uses three shared sizes only: display, heading, and 1rem body. Poppins headings use medium 500; Inter body text, labels, and controls use regular 400. Tracking is normal outside the original logo, which preserves its established weights. Labels and captions have no extra microtext tiers. The navigation switches to its scrollable mobile layout at 1050px. See `BRANDING.md`; `npm run check:typography` prevents drift.

## Route map

| Route | Current purpose | Primary source |
|---|---|---|
| `/` | Consulting + products homepage | `src/app/page.tsx` |
| `/build` | Six consulting service capabilities and delivery process | `src/app/build/page.tsx` |
| `/work` | Named client work and testimonial | `src/app/work/page.tsx` |
| `/work/[slug]` | Full client case study | `src/app/work/[slug]/page.tsx` |
| `/products` | Insight, Sifa, and Rafiki product family | `src/app/products/page.tsx` |
| `/blog` | “The journal” index | `src/app/blog/page.tsx` |
| `/blog/[slug]` | Markdown journal article | `src/app/blog/[slug]/page.tsx` |
| `/about` | Studio story, principles, and team | `src/app/about/page.tsx` |
| `/industries` | Proven tourism work and potential sector fits | `src/app/industries/page.tsx` |
| `/contact` | Project, product, support, partnership, and general enquiries | `src/app/contact/page.tsx` |
| `/careers` | No-current-vacancies notice and informal enquiry guidance | `src/app/careers/page.tsx` |
| `/privacy` | Contact-form and careers-enquiry privacy notice | `src/app/privacy/page.tsx` |
| `/brand` | Ubunifu Ligature kit, palette, type, rules, and downloads | `src/app/brand/page.tsx` |
| `/api/contact` | Validated contact-form email endpoint | `src/app/api/contact/route.ts` |

[`src/app/sitemap.ts`](src/app/sitemap.ts) publishes static routes plus every case study and journal article. [`src/app/not-found.tsx`](src/app/not-found.tsx) owns the branded 404. Shared page metadata uses [`src/lib/metadata.ts`](src/lib/metadata.ts) and `/og.png`; case studies have generated route-level cards, while journal articles use their own cover images for social metadata.

## Homepage narrative

The homepage tells one story: Ubunifu can build a specific system with a client or offer a product it already operates.

1. **Hero** — “Build the system your organisation needs.” A broad, centred heading, short description, and two links over a navy editorial background. The four-stage system diagram, replay control, and repeated location strapline remain removed. The static backdrop has no animation runtime or scroll listeners.
2. **CapabilitiesIndex** — all six consulting disciplines in one open, linked register.
3. **WorkPreview** — Safari King Africa and Usambara Destination, with native icon diagrams of the delivered operations and enquiry systems.
4. **Testimonial** — sourced from `src/content/testimonials.tsx`, reinforcing the client work before products are introduced.
5. **ProductsProof** — a text-led register of Insight, Sifa, and Rafiki, with status stated once per product.
6. **Insights** — the three newest journal posts; the visual lead avoids repeating a cover already used in selected work.
7. **CtaBand** — one closing contact action.

The exact order lives in [`src/app/page.tsx`](src/app/page.tsx). `EngagementPaths` and `ProblemStrip` are no longer mounted on the homepage; the detailed delivery process lives on Services.

## Consulting, work, products, and sectors

### Services (`/build`)

Six service records in [`src/content/services.tsx`](src/content/services.tsx):

1. Websites & Custom Platforms
2. Hosting, Domains & Email
3. Brand Identity & Design
4. Data & Business Intelligence
5. AI & Automation
6. Technology Strategy & Advisory

The page opens with “Technology for your business.” over its dedicated editorial background. `CapabilityJourney` renders six ordinary in-flow sections with stable anchors. Web, hosting, data, and AI use text-free `SystemDiagram` SVG compositions: responsive devices, domain-linked hosting/email, records feeding reporting, and document-grounded AI with human review. Branding and strategy have dedicated generated illustrations of identity materials and planning tools. The fictional planning photograph, brand specimen, priority matrix, sticky stage, and counters remain removed. The Understand → Shape → Build → Operate process describes delivery, followed by selected work. No service requires autoplay, a cycle, or a special scrolling layout to read.

### Work (`/work`)

[`src/content/portfolio.tsx`](src/content/portfolio.tsx) owns the two named client projects:

- **Safari King Africa** — booking platform + operations system
- **Usambara Destination** — eco-tourism site + enquiry engine

Each record supplies the Work narrative, `/work/[slug]` case study, visual identifier, factual overview, capabilities, highlights, technology list, and live-site link. `EditorialVisual` renders text-free SVG diagrams: an operations hub for Safari King and enquiry-to-email branching for Usambara. Each has one accessible description, with no visible labels inside the artwork. The same renderer covers related article views and next-project links, so the retired landscapes cannot reappear as in-page images. Existing social images remain unchanged. Run `npm run check:project-visuals` after the build to verify project and service SVGs across eight rendered routes.

### Products (`/products`)

[`src/content/products.tsx`](src/content/products.tsx) is the status and copy authority:

| Product | Code status | Current presentation |
|---|---|---|
| Ubunifu Insight | `live` | Document AI; links to `insight.ubunifutech.com` |
| Ubunifu Sifa | `live` | Business operations and credit-ledger workflows; links to `sifa.ubunifutech.com` |
| Ubunifu Rafiki | `soon` | Embeddable website tools; shown as in development |

Custom consulting belongs under `/build`; it is not a fourth product. Product availability is not evidence of customer counts or usage. The product page pairs its editorial hero with open image-and-text rows: source documents for Insight, stock and sales records for Sifa, and website modules for Rafiki. `src/content/product-artwork.ts` maps the individual illustrations by stable product ID. Names, features, live links and Rafiki’s in-development status remain in HTML. The homepage product preview stays text-led, and the ambiguous 3D product-family illustration remains unused. Exact prompts and saved paths are in [PRODUCT_ARTWORK.md](PRODUCT_ARTWORK.md).

### Industries (`/industries`)

[`src/content/sectors.tsx`](src/content/sectors.tsx) carries a `proven` flag plus summaries and possible offerings. Tourism & Hospitality is the only proven sector and opens as cinematic named evidence. SMEs/Retail, Finance, NGOs, Healthcare, Agriculture, Education, and Government follow in an open ledger as potential workflow fits, with specialist and regulatory caveats where needed.

## About and careers

[`src/content/about.tsx`](src/content/about.tsx) owns the studio story. [`src/content/values.tsx`](src/content/values.tsx) owns operating principles, and [`src/content/team.tsx`](src/content/team.tsx) owns team bios and links. `/about` uses those sources without generic hero/story images or a second delivery-process section. About, Work, Products, Industries, Careers, and Contact use compact mastheads so their primary content appears sooner.

`/careers` currently advertises no jobs, internships, or contracts. The speculative capability-area listing is removed. Informal introductions link to `/privacy` for data-handling guidance; there is no unrelated project-sales CTA.

## Journal and cover images

Journal articles are Markdown files in [`_posts/`](_posts/) parsed by [`src/lib/blog.ts`](src/lib/blog.ts). The index derives its published count and post order at render time; do not hard-code either in documentation.

Standard frontmatter (`coverImage` and `coverAlt` are an optional pair):

```yaml
---
title: "Article title"
date: "YYYY-MM-DD"
author: "Author name"
excerpt: "One concise summary"
tags: ["Topic", "Another topic"]
coverImage: "/editorial/example.webp"
coverAlt: "Meaningful description of the cover"
---
```

Rules enforced by `src/lib/blog.ts`:

- filename is a lowercase, hyphen-separated slug;
- `title`, `date`, `author`, `excerpt`, and `tags` are required and validated;
- `coverImage` and `coverAlt` are optional but must appear together;
- cover paths must be safe site-relative AVIF, JPEG, PNG, or WebP paths;
- duplicate or empty tags are rejected;
- posts sort by newest date, then slug; reading time is estimated from Markdown at roughly 200 words per minute.

If no cover pair is supplied, the fallback is `/editorial/build-or-buy.webp` with its default alt text. The resolved cover appears in the Journal grid, article hero, Open Graph/Twitter metadata, and `BlogPosting` JSON-LD. Store journal concepts in [`public/editorial/`](public/editorial/); use 16:9 or 3:2 sources with crop-safe compositions. The seven current articles have distinct cover paths. See [`EDITORIAL_ASSETS.md`](EDITORIAL_ASSETS.md) for new asset roles, provenance, and exact generation prompts.

## Brand kit and assets

`/brand` is a public footer route and sitemap entry, not a primary-navigation item. It previews the orange-and-violet Ubunifu Ligature with its dark-navy foundation, full “Ubunifu Technologies” one-line lockup, primary and reversed treatments, canonical color roles, typography, voice, and basic usage rules.

Canonical downloads live in [`public/brand/`](public/brand/):

- `ubunifu-mark.svg`
- `ubunifu-lockup.svg`
- `ubunifu-mark-inverse.svg`
- `ubunifu-mark-navy.svg`
- `ubunifu-mark-white.svg`
- `ubunifu-lockup-white.svg`

`public/logo-v2.png` is the 512 × 512 social avatar. `public/og.png` remains the current campaign social preview rather than a canonical logo master; refresh it only as a deliberate social-card pass. Use `public/editorial/` for conceptual imagery. Product and project artwork must remain plainly illustrative, never presented as interfaces or customer proof; live links and factual HTML carry the evidence. Full logo, palette, contrast, and image rules live in [`BRANDING.md`](BRANDING.md).

## Contact and privacy behavior

The `/contact` form collects name, email, enquiry type, and a 20–5,000 character message. The client also sends a generated submission ID and an empty honeypot field.

`POST /api/contact`:

- accepts JSON only and caps the body at 16 KB;
- validates field lengths, email shape, subject allowlist, message length, and submission ID;
- quietly accepts honeypot submissions without sending mail;
- applies a bounded process-local limit of five attempts per Vercel-provided client address, with email as the non-Vercel development fallback; production should also enforce a distributed Vercel WAF rule for `/api/contact`;
- requires the server-only `RESEND_API_KEY`;
- sends the team notification first, then attempts an acknowledgement to the sender; acknowledgement errors and exceptions are logged without failing the successful team notification;
- returns `503` with the direct email address when Resend is not configured.

The form warns against sending passwords or sensitive records and links to `/privacy`. The privacy page explains contact and careers data, limited anti-abuse information, Resend delivery, retention, external services, and correction/deletion requests. Email templates live in [`src/lib/emails.ts`](src/lib/emails.ts); environment setup lives in [`.env.example`](.env.example) and [`README.md`](README.md).

## Source map

| Source | Controls |
|---|---|
| `src/content/site.ts` | Company facts, primary nav, footer, product/service URLs |
| `src/content/services.tsx` | Six consulting capabilities |
| `src/content/portfolio.tsx` | Client listing and case-study evidence |
| `src/content/products.tsx` | Product status, descriptions, capabilities, and links |
| `src/content/sectors.tsx` | Proven sector flag, potential fits, caveats |
| `src/content/pillars.tsx` | Homepage differentiators |
| `src/content/about.tsx` | Studio story and approach |
| `src/content/values.tsx` | Operating principles |
| `src/content/team.tsx` | Team bios and profile links |
| `src/content/testimonials.tsx` | Published testimonial content |
| `_posts/*.md` | Journal frontmatter and article bodies |
| `src/lib/blog.ts` | Journal validation, sorting, fallback cover, reading time |
| `src/lib/metadata.ts` | Shared canonical, Open Graph, and Twitter metadata |
| `src/lib/emails.ts` | Contact notification and acknowledgement HTML |
| `src/app/globals.css` | Design tokens, global accessibility, visual utilities |
| `src/components/BrandMark.tsx` | Runtime Ubunifu Ligature mark and full-name lockups |
| `public/brand/` | Canonical vector logo assets |
| `public/editorial/` | Conceptual editorial imagery |

When facts change, edit the owning source first. Keep this map descriptive; do not use it to introduce claims that are absent from the rendered site or content records.

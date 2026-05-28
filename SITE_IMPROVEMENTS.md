# Site Improvements — Tracker

Single source of truth for the site redesign / quality pass. Maintained as work progresses. Anything we can ship with current materials goes under **Shipped** with a brief note. Anything that needs new content, real data, or further design work goes under **Deferred** with a clear owner and unblock condition.

**Rule we follow:** never invent metrics, testimonials, client logos, or capabilities. If a claim isn't backed by something true (a shipping product, a real screenshot, a verifiable fact), it doesn't go on the site. Where the strongest version of a claim isn't yet provable, we ship a weaker truthful version and flag the better version under Deferred.

---

## Shipped (this pass)

### 1. Bug fixes
- **Blog post mobile edge-cutoff** — `BlogSlug.module.css` used `padding: 8rem 0 5rem` which overrode the global `.container` horizontal padding, so blog posts went edge-to-edge on every screen. Split into `padding-top` / `padding-bottom` only.
- **Home link missing from nav** — Added `{ label: 'Home', href: '/' }` to `navLinks` in `src/content/site.ts`.

### 2. Logo stack
- "Technologies" now stacks below "Ubunifu" in both navbar and footer logo blocks (per design direction).

### 3. Real screenshots integrated
Replaced fake browser-mockup animations with real product/work screenshots:
- **Portfolio (Work)** — Safari King and Usambara cards now display actual site/admin screenshots in a Chrome-style browser frame.
- **Products** — Insight and Sifa cards now show actual product UI (Document Generator gallery, Intelligence Dashboard).

See `public/work/` for the asset library and `src/content/portfolio.tsx` / `products.tsx` for the wiring.

### 4. Copy tightening
Truthful, specific rewrites — kept only claims backed by shipping product or visible screenshots:
- **Hero subtitle** — removed the repeated "designed for how this market actually works" phrasing.
- **Insight tagline** — now references the proven differentiators (Swahili AI agents, Tanzania-specific templates like the Tax Invoice).
- **Sifa tagline** — now references credit-based selling and offline-first (both visible in product UI).
- **Safari King case study description** — now reflects what we actually built: booking platform + custom CRM admin + AI marketing assistant powered by Claude Sonnet 4.6.

---

## Deferred (need more before shipping)

### Content / data we don't yet have

| Item | What's missing | How to unblock |
|---|---|---|
| **Quantified case study outcomes** | No real metrics for Safari King or Usambara (bookings/month, conversion lift, performance scores). | Pull real numbers from the products. Even rough ranges ("dozens of monthly bookings") are better than nothing — once verified. |
| **Client testimonials** | No quotes from Safari King or Usambara owners on record. | Ask both clients for a 1–2 sentence quote we can attribute by name. Until then, no testimonials on the site. |
| **Insight screenshots show empty state** | Dashboard counters read 0 documents / 0 extractions / 0 generated. Undersells the product in marketing context. | Re-screenshot Insight from a workspace with realistic populated data (12+ docs, recent activity, etc.). Replace `public/work/insight-dashboard.png`. |
| **Sifa needs more screenshots** | Only one screen captured (Intelligence Dashboard). Need POS/Sales view, Inventory, Credit Ledger detail, Offline mode indicator. | Capture 3–4 additional Sifa screens from a populated demo workspace. |
| **Usambara proof is visual-only** | Current screenshots show a generic-looking marketing site. The real value was SEO + performance + schema.org — none of which is visible. | Capture Lighthouse 100/100 score, schema.org rich-result, Google Search Console ranking, or 3G load time. Replace primary Usambara visual. |
| **Education Tutor screenshot is cropped** | Best single asset on the site (Swahili "Karibu sana!" chapati fractions response) is captured mid-scroll. | Re-screenshot scrolled to the top, showing prompt + opening response in one clean frame. |
| **Team bios are thin** | "Richard enjoys building and innovating" is too soft for a serious-builders positioning. Need credentials, links to public work, specific past projects. | Richard + HappyGod to provide expanded bios (~80 words each) with verifiable credentials, GitHub/portfolio links, talks given, etc. |
| **Client logos / "Trusted by" strip** | `Clients.tsx` component exists but no real client logos in use beyond Safari King + Usambara. | Either populate with real logos of past clients or remove the component entirely. No fake logos. |

### Design / layout work

| Item | Note |
|---|---|
| **Homepage hero redesign with screenshot** | Current hero is text-only. The Education Tutor Swahili screenshot (or a rotating gallery) would dramatically increase impact. Deferred because we want the screenshot recaptured first (see above). |
| **Product demo videos** | A 20–40s loop of Insight chat or Sifa POS would outperform any screenshot. Needs screen recording + editing pass. |
| **Case study detail pages** | Each portfolio project should have a deep `/work/[slug]` page with the full story (problem, approach, screenshots, tech, outcome). Currently it's just card-level summaries. |
| **Pricing page** | Pay-as-you-go is a differentiator. Deserves a dedicated page showing the model + sample math. |
| **Dark mode** | Most developer-adjacent buyers default to dark. Skipped for now to focus on content first. |
| **Newsletter signup** | Blog has substance but no capture. Add when we have 2–3 more posts to justify the ask. |
| **More blog posts** | Currently 3 posts. Aim for 6–8 over the next quarter. Suggested topics: Sifa offline-first architecture, Safari King AI assistant case study, Swahili RAG technical post. |
| **Insight & Sifa multi-screenshot galleries** | Single hero screenshot per product is the v1. A click-to-expand lightbox or in-card carousel would let us show 3–5 angles per product. Deferred to v2. |
| **Visual signature** | Site is clean but conventional. A distinctive design element (interactive Tanzania map, terminal motif, animated data viz tied to a real product) would lift it from "polished SaaS" to "memorable." Needs design exploration. |

### Operational

| Item | Note |
|---|---|
| **Privacy policy / Terms** | Standard SaaS expectation. Especially relevant for Insight (handles uploaded documents). |
| **Security notes for Insight** | What happens to uploaded docs? Where is data stored? Encryption? Buyer due diligence will ask. |
| **Status page / SLA mention** | Not urgent at current scale but signals operational seriousness as we grow. |

---

## Duplication audit

Sections that currently appear in more than one place. Most are intentional (landing-page previews → deep page). Flagged here so we don't accidentally let copy drift between them.

| Component | Where it's used | Action |
|---|---|---|
| `Products` | `/` (via `ProductsPreview` in HomePreviews) + `/products` page | OK — preview vs. full. Both pull from `src/content/products.tsx`, so copy stays in sync. |
| `Portfolio` | `/work` page + `/build` page | OK — both intentional, but verify the Build page version isn't drifting. |
| `About` (values cards) | `/` (via `AboutPreview`) + `/about` page | OK — both pull from `src/content/values.tsx`. |
| `Contact` | `/`, `/products`, `/build` | Kept on all for conversion. Single source: `Contact.tsx`. |
| Phrase **"designed for how this market actually works"** | Was in Hero, Products, several other places | Removed duplicates this pass — kept once in About so it's a thesis, not a slogan. |

---

## Layout / IA changes made this pass

- **Portfolio**: stripped the fake browser-mockup-with-logo animation. Replaced with a real screenshot in a clean browser frame.
- **Products**: each product card now has a visual region above the text content showing a real screenshot for Live products (Insight, Sifa). Coming-Soon / Available products without screenshots keep the text-only layout.
- **`public/work/` directory** created to hold the screenshot assets, separated from the legacy `public/images/` (used for logos). Originals retained in `work-screenshots/` at repo root (not tracked).

---

## Conventions established

- **No fake data on the site.** If a fact isn't true, it doesn't ship. If we want to make a claim, we either find a true version of it or defer.
- **Screenshots live in `public/work/<project>-<screen>.png`** with descriptive kebab-case names.
- **Real-world copy beats clever copy.** Specific > general (e.g., "Swahili AI agents that teach fractions with chapati examples" > "AI built for Africa").
- **All cross-page content reads from `src/content/*`** — never hardcode marketing copy inside components.

# Ubunifu Technologies — Project Roadmap

This roadmap starts from the site as it is now: a Next.js website for an Arusha-based technology consultancy that also builds and operates products. [`POSITIONING.md`](POSITIONING.md) owns company claims, [`WEBSITE_CONTENT.md`](WEBSITE_CONTENT.md) maps the implemented site, and [`SITE_IMPROVEMENTS.md`](SITE_IMPROVEMENTS.md) records completed redesign work.

Last refreshed: 5 September 2026.

## Current baseline

### Positioning and information architecture

- [x] Two connected engines are represented throughout: consulting services and Ubunifu software products.
- [x] Primary navigation is **Services · Work · Products · Insights · About**, with a **Start a project** contact action.
- [x] `/build` owns consulting capabilities; `/products` owns Insight, Sifa, and Rafiki; `/work` contains named client evidence rather than the product catalogue.
- [x] Tourism and hospitality is the only proven sector. Other industry pages describe potential capability fits with appropriate caveats.

### Homepage and public proof

- [x] Homepage sequence: full-width consulting hero, two engagement paths, scannable capabilities, named client work, attributed testimonial, product family, delivery method, latest Journal articles, and closing contact band.
- [x] Safari King Africa and Usambara Destination have dedicated client case studies with conceptual workflow art, documented functionality, and direct links to the live work.
- [x] Insight and Sifa are presented as available products; Rafiki is clearly marked as in development.
- [x] Product availability is kept separate from customer-count, adoption, revenue, conversion, and performance claims.

### Brand, content, and platform

- [x] The original Ubunifu Ligature is implemented across the site: an orange U and violet T interlock as one mark, with dark navy anchoring the full “Ubunifu Technologies” wordmark and wider system; canonical SVG assets live in `public/brand/` and a public `/brand` kit.
- [x] Poppins, Inter, the canonical palette, reduced-motion behavior, and the tactile editorial-cover system are documented in `BRANDING.md`.
- [x] Navy, orange, purple, and blue have distinct roles; inverse treatments, shared control geometry, responsive navigation height, footer gutters, and conceptual-art disclosures now follow one system.
- [x] Journal articles are Markdown files in `_posts/`, with validated frontmatter, route-level metadata, and editorial cover images.
- [x] The contact route uses strict validation, a honeypot, streaming body limits, bounded Vercel-aware throttling, Resend delivery, and best-effort acknowledgements.
- [x] Contact and careers privacy language, security headers, sitemap coverage, metadata, and the branded 404 are implemented.

## Next priorities

### 1. Verify and strengthen evidence

- [ ] Recheck volatile product copy against the current Insight and Sifa interfaces before each release.
- [ ] Replace broad case-study outcome language with measured results only when analytics or operational records support it and the client approves publication.
- [ ] Add client testimonials only with clear attribution and retained source approval.
- [ ] Add approved client evidence only when it is sanitised, meaningfully demonstrates a workflow, and is stronger than the live-site link already provided.

### 2. Production operations

- [ ] Confirm the production environment has `RESEND_API_KEY`, verified sending-domain records, and delivery monitoring.
- [ ] Add a distributed edge or WAF rate limit for `/api/contact`; the in-process throttle is only a bounded fallback and is not shared across instances.
- [ ] Add privacy-respecting analytics only with a defined measurement purpose and corresponding privacy-notice update.
- [ ] Document product-specific privacy, security, support, and status information on the product surfaces that own those facts.

### 3. Brand delivery

- [ ] Refresh social-preview messaging around the approved Ubunifu Ligature when a social-card pass is explicitly commissioned; existing preview files remain campaign media rather than logo masters.

### 3. Content workflow

- [ ] Keep Markdown as the default Journal workflow while it remains reliable and easy to review.
- [ ] Consider a CMS or internal editor only when a real publishing bottleneck justifies authentication, storage, backup, and maintenance overhead.
- [ ] Use [`BLOG_OUTLINES.md`](BLOG_OUTLINES.md) for optional topics, and require factual review before publication.

### 4. Internal tools, if justified

- [ ] Consider a lead-management or project-content tool only after documenting the current workflow, users, permissions, retention needs, and operational owner.
- [ ] Choose the smallest architecture that solves the confirmed need. A separate FastAPI service, PostgreSQL database, or admin dashboard is not a default requirement for the marketing site.

## Roadmap guardrails

- Do not invent metrics, customer activity, ratings, partnerships, testimonials, or client outcomes.
- Do not claim offline support, a permanent AI model/provider, or regulated-sector expertise without current verification.
- Keep consulting and products equally visible; custom consulting under `/build` is not a fourth product.
- Treat hosting, maintenance, monitoring, and ongoing operation as agreed engagement options, not automatic promises.
- Prefer current source files over historical redesign notes when navigation, layouts, or claims have changed.

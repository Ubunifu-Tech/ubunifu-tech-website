# Ubunifu Technologies — Project Roadmap

This roadmap starts from the site as it is now: a Next.js website for an Arusha-based consulting company and product studio. [`POSITIONING.md`](POSITIONING.md) owns company claims, [`WEBSITE_CONTENT.md`](WEBSITE_CONTENT.md) maps the implemented site, and [`SITE_IMPROVEMENTS.md`](SITE_IMPROVEMENTS.md) records completed redesign work.

Last refreshed: 23 August 2026.

## Current baseline

### Positioning and information architecture

- [x] Two connected engines are represented throughout: consulting services and Ubunifu software products.
- [x] Primary navigation is **Services · Work · Products · Insights · About**, with a **Start a project** contact action.
- [x] `/build` owns consulting capabilities; `/products` owns Insight, Sifa, and Rafiki; `/work` contains named client evidence rather than the product catalogue.
- [x] Tourism and hospitality is the only proven sector. Other industry pages describe potential capability fits with appropriate caveats.

### Homepage and public proof

- [x] Homepage sequence: full-width consulting hero, four grounded differentiators, named client work, attributed testimonial, product family, latest Journal articles, and closing contact band.
- [x] Safari King Africa and Usambara Destination have dedicated client case studies with real screenshots and documented functionality.
- [x] Insight and Sifa are presented as available products; Rafiki is clearly marked as in development.
- [x] Product availability is kept separate from customer-count, adoption, revenue, conversion, and performance claims.

### Brand, content, and platform

- [x] The solid two-color Ubunifu Ligature is implemented across the site: an interlocking orange U and purple T with a rising angled crown, paired with the full “Ubunifu Technologies” wordmark on one baseline; canonical SVG assets live in `public/brand/` and a public `/brand` kit.
- [x] Poppins, Inter, the canonical palette, reduced-motion behavior, and the tactile editorial-cover system are documented in `BRANDING.md`.
- [x] Journal articles are Markdown files in `_posts/`, with validated frontmatter, route-level metadata, and editorial cover images.
- [x] The contact route uses strict validation, a honeypot, streaming body limits, bounded Vercel-aware throttling, Resend delivery, and best-effort acknowledgements.
- [x] Contact and careers privacy language, security headers, sitemap coverage, metadata, and the branded 404 are implemented.

## Next priorities

### 1. Verify and strengthen evidence

- [ ] Recheck volatile product copy against the current Insight and Sifa interfaces before each release.
- [ ] Replace broad case-study outcome language with measured results only when analytics or operational records support it and the client approves publication.
- [ ] Add client testimonials only with clear attribution and retained source approval.
- [ ] Add more real product and client screenshots when they demonstrate a verified workflow rather than decorative sample metrics.

### 2. Production operations

- [ ] Confirm the production environment has `RESEND_API_KEY`, verified sending-domain records, and delivery monitoring.
- [ ] Add a distributed edge or WAF rate limit for `/api/contact`; the in-process throttle is only a bounded fallback and is not shared across instances.
- [ ] Add privacy-respecting analytics only with a defined measurement purpose and corresponding privacy-notice update.
- [ ] Document product-specific privacy, security, support, and status information on the product surfaces that own those facts.

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

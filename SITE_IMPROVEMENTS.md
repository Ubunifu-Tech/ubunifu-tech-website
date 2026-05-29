# Site Improvements — Tracker

Single source of truth for the site redesign / quality pass. Maintained as work progresses. Anything we can ship with current materials goes under **Shipped** with a brief note. Anything that needs new content, real data, or further design work goes under **Deferred** with a clear owner and unblock condition.

**Rule we follow:** never invent metrics, testimonials, client logos, or capabilities. If a claim isn't backed by something true (a shipping product, a real screenshot, a verifiable fact), it doesn't go on the site. Where the strongest version of a claim isn't yet provable, we ship a weaker truthful version and flag the better version under Deferred.

---

## Shipped (latest pass)

### 28. Contact form hardened

Reviewed the form end to end and fixed a real robustness bug in `src/app/api/contact/route.ts`:
- **Resend was instantiated outside the `try`** (`new Resend(process.env.RESEND_API_KEY)`), and the SDK throws when the key is missing — so the endpoint returned **500 for *every* request**, including spam-filtered (honeypot/timing) ones, with no graceful degradation. Moved instantiation to *after* validation, inside the try, with an explicit missing-key guard (clear 503 + logged error).
- **Acknowledgement email is now best-effort** (its own try/catch) so a failed confirmation to the sender never fails a successful team notification.
- Verified every branch against the running server: honeypot → 200 (silent), too-fast → 200 (silent), missing fields → 400, invalid email → 400, valid → reaches the email step (200 in prod with the key; clear 503 locally without it). The form UI, the accessible `SelectField`, and HTML-escaping in the emails were already clean.

> Reminder: `RESEND_API_KEY` must be set in the deployment env (it isn't in the repo, correctly). Without it the form returns the clear 503 above.

### 27. CTA out of the footer, mobile pass, cleanup

- **CTA extracted from the footer.** A CTA doesn't belong in a footer. Moved "Got something to build?" into its own `CtaBand` section (a contained dark card on a light band), rendered before the footer on content pages (not on `/contact` or the 404). The footer is now just the dark columns + legal.
- **Mobile audit.** Checked the redesigned pages at 375px — no horizontal overflow anywhere (home, services, industries, work, case study, about, contact, footer). Fixed the one real issue: the hero CTAs sat side-by-side and wrapped; they now stack full-width on phones. Verified the floating nav, spotlights, CtaBand, and dark footer all stack cleanly.
- **Cleanup.** Removed the unused `public/work/insight-dashboard.png`; confirmed no orphan components, no stale `styles.container` refs, all content files used. Lint + build clean (34 pages).
- **Docs refreshed** (`WEBSITE_CONTENT.md`) for the new chrome, the Industries page, the CtaBand, and the elevated Services/About.

### 26. Distinct chrome — floating navbar + dark footer

Made the nav and footer read as separate from the page (per the reference sites), and removed the proof band.
- **Navbar is now a floating, contained bar** — a glass/white pill with a gap from the top and sides, a hairline border, and a soft shadow, so it sits *above* the content instead of blending into the hero. Deepens its shadow on scroll. (Restructured markup: an inner `.shell` bar inside the container; mobile menu moved to a nav-level overlay.)
- **Footer is now one dark, self-contained block** — the CTA and link columns share a deep purple-navy gradient with aurora glows and faint topography; all text recoloured for the dark theme. Clearly delineates the bottom of every page.
- **Removed the proof band** (it wasn't pulling its weight).

### 25. Home page elevated to the new caliber

Two additions that lift the home toward the references without repeating assets:
- **Proof band** (`ProofBand`) right under the hero — a dark gradient panel with four *truthful* points (2 live SaaS products · 5.0★ TripAdvisor rating · Claude · 100% built in Arusha), gradient values, dividers, faint topography. Breaks the run of light card sections with a premium "impact" beat.
- **"Latest thinking" insights section** (`Insights`) — surfaces the blog on the home for the first time (a real gap; very McKinsey). Shows the three most recent posts as cards linking through to `/blog`. The home page reads posts via `getAllPosts()` and passes them in.

### 24. New Industries / "Who we serve" page

The per-sector depth that was missing — sectors were only a home teaser. New `/industries` page:
- **Tourism leads as a proven spotlight** (reuses the `Spotlight` component): the real Safari King site in a browser frame, a "Proven · Built for Safari King & Usambara" overlapping card, and a "See the work" link.
- **The other seven sectors** (SMEs/retail, finance, NGOs, healthcare, agriculture, education, government) as substantive cards — icon, what we'd build for them, and specific offerings — framed honestly as capability, not claimed clients (see POSITIONING.md). Education notes the real Swahili AI tutor.
- Closing "Don't see your sector?" line linking to contact.
- `content/sectors.tsx` extended with per-sector `summary` + `offerings`.
- Wired into the nav (replacing Careers, which moves to footer-only to keep the bar tight: Home · Services · Industries · Work · About · Blog · Contact), the footer, the sitemap, and the homepage Sectors strip now links here.

### 23. Services page rebuilt as capability spotlights

Took the elevated caliber to the Services page (the capability depth that was flagged):

- **New reusable `Spotlight` component** — an alternating image/text "feature row" with a checklist, an optional **overlapping card**, and a **branded fallback panel** (gradient icon + topography + chips) for capabilities without a screenshot. Designed to be reused on Industries / Home next.
- **Services page** now presents the five capabilities as five alternating spotlight rows, each with real proof: Web → the Usambara site, Data → the Sifa dashboard, AI → Insight's Swahili tutor ("Answers in Swahili"); Branding and Strategy use branded panels. Numbered, outcome-framed, with a jump-chip sub-nav at the top.
- Removed the old icon-card grid styles (dead code).

### 22. About page redesigned as an editorial story (flagship caliber)

A genuine *layout* redesign (not just content) to the standard of the reference/agency sites — the new home for vision, mission, and objectives, told as a story:

- **Header:** confident centred statement ("We make technology work for Tanzanian organisations.").
- **Vision & Mission:** two statement cards with gradient icon marks and large editorial type (`src/content/about.tsx`).
- **Why we exist:** a story split — narrative on the left, a **brand-tinted** photo on the right (`public/about/collaboration.jpg`, treated with a purple/orange multiply overlay so it reads as branded, not generic stock) with an **overlapping** "One team, no handoffs" card.
- **Objectives:** "Four things we hold ourselves to" — icon cards.
- **What we believe:** the four values (reused `About` component, now accepts heading overrides).
- **How we work:** a numbered four-step approach with a gradient connecting line.
- **Team** closes the page.
- `ScrollReveal` now accepts a `className` so sections can animate in while keeping their layout classes.
- **Capability messaging sharpened** in `src/content/services.tsx` to outcome framing ("We help you harness AI where it actually pays off…", "We help you turn raw data into decisions…").

This is the flagship for the elevated caliber; the same patterns (statement blocks, alternating image/text, numbered steps, treated imagery) can roll out to the other pages next.

### 21. Repositioned as a digital-solutions agency

Reframed the site from "product company + consulting" to a **Tanzania-based digital-solutions agency** (per `POSITIONING.md`), adopting the structure of strong agency sites while keeping our purple/orange + topography identity. Products are now **proof, not the headline**.

- **Five service pillars** (`src/content/services.tsx`): Digital Presence & Web, Branding & Visual Communication, Data Analytics & BI, Intelligent Automation & AI, Digital Strategy & Consulting. Each an icon-driven card.
- **Services page** (`/build`) rebuilt around the pillars: icon cards with brand-coloured summaries, checklists, "01–05" spec numbers, the code-window hero retitled "Everything your digital side needs."
- **Homepage rebuilt, agency-led:**
  - Hero → "Digital solutions, built for Tanzania." with Safari King client-build proof and trust chips.
  - "Why Ubunifu" strip (4 differentiators with icons): Local and technical · Proven in production · AI when it fits · We build and run it.
  - **Services preview** — five icon cards + a gradient "Explore all services" CTA tile.
  - **Sectors strip** (`src/content/sectors.tsx`) — icon tiles for the sectors we serve (tourism proven, the rest targeted; no fabricated clients).
  - **Products-as-proof** — Insight & Sifa shown as "we build our own products too," not a headline Products page.
- **Nav:** dropped "Products" as a headline destination (the `/products` page still exists as proof). Order: Home · Services · Work · About · Blog · Careers · Contact.
- **Copy refreshed** for the agency framing: tagline ("Digital solutions for Tanzania."), About vision/values, root + OG metadata, default OG card.
- New authoritative `POSITIONING.md`; `WEBSITE_CONTENT.md` refreshed to match.

### 20. Active nav state + branded 404

- **Active navigation indicator.** The current page now lights up in the navbar with a gradient underline (and the mobile menu marks it in brand colour). Nested routes resolve to their top-level link, e.g. `/work/safari-king` highlights "Work" and `/blog/[slug]` highlights "Blog". Uses `aria-current="page"` for accessibility.
- **Branded 404 page** (`not-found.tsx`). Replaces the default Next.js 404 with an on-brand page: a gradient "404" over the topography radar, a friendly message, and three escape routes (Home, Work, Contact), wrapped in the standard Navbar + Footer.

### 19. Cleanup pass — em dashes, dead code, role/skill accuracy

- **Roles shortened + HappyGod's full scope.** Richard is now `Data · Software · AI`; HappyGod is `IT · Design · Support`, with his bio and skills updated to include the creative / brand / design work he actually does (not just systems).
- **Em dashes reduced** across the visible copy — hero, product/portfolio data, page leads, footer, contact, testimonial, blog index, and all four recent blog posts. Replaced with periods, commas, colons, or parentheses. (Only the conventional quote-attribution dash remains.)
- **Dead code / assets removed:**
  - `products.tsx`: dropped the unused `size` / `ProductSize` (left over from the old bento).
  - Deleted the orphaned `src/app/about/About.module.css` (its CTA section was removed earlier).
  - Removed the dead CTA classes from `Build.module.css`.
  - Deleted the unreferenced logo images in `public/images/` (the `Clients` strip that used them is gone); removed the now-empty folder.
- Build, typecheck, and lint all clean (33 static pages).

### 18. Uniform product cards + bio accuracy

- **Products section rebuilt as a uniform grid.** The old bento mixed full-width split cards with smaller 2-up cards (different sizes) and crammed dense screenshots beside text. Now every product card is the **same size**: a 16:9 media panel on top (real screenshot for Insight/Sifa; a branded topography panel for Rafiki/Build) with a status badge overlay, then content below. Equal-height rows (`grid-auto-rows: 1fr`), generous spacing — no longer crammed. Homepage product preview cards are equal-height too.
- **Bio correction.** Richard's bio is now present-tense and identity-first — "a data, software, and AI engineer" — with no past-tense career framing, no degree, no location, per his direction.

### 17. Fuller pages, real bios, code-window, fewer CTAs

**Page headers no longer feel empty.** The inner-page headers (products / work / about / careers / contact) were left-aligned text with a void on the right. Re-centred the `PageHeader` content over a symmetric topography "radar" + aurora backdrop — it now reads as a confident, full statement instead of text shoved to one side.

**Build hero — an animated code window.** The Build hero's empty right side now holds a small editor panel (`CodeWindow`) that "writes" a short, real snippet line by line — a grounded AI-agent tool, the kind of thing we actually build. Honours `prefers-reduced-motion` (renders complete, no cursor sweep). This is the "animate code" idea placed where it's genuinely true: the engineering page.

**Real team bios.** Rewrote both founders accurately from their own material:
- **Richard Pallangyo — Data & AI:** senior data engineer (led a 30-person Data & AI team), finishing an MS in Data Science at UW, builds the RAG / agentic-AI systems and pipelines. Added GitHub + LinkedIn links.
- **HappyGod Pallangyo — IT & Systems:** system/network administration, hosting, cPanel, domains, technical support; computer-engineering + accountancy background. (Corrected from the old placeholder "Creative Director" — his real focus is infrastructure/IT.)
Team cards now render skill chips + social-link icons (lucide `Github` / `Linkedin`).

**Removed repeating CTAs.** The Build and About pages each had a bespoke CTA section stacked right above the global footer CTA band. Removed both — every page now closes with the single footer CTA, no double-ask.

**Stock images — declined, on purpose.** The provided Unsplash photos (the famous Fotis dual-monitor code shot, the Growtika AI-brain render, etc.) are heavily-used stock. Using them would undercut the authenticity our real product screenshots give us, so they stay out of the live site (kept in the gitignored `work-screenshots/`). We fill "empty" space with authentic visuals instead — code window, centred headers, richer cards.

### 16. Consistency, de-duplication & full-site polish
A pass for consistency and to push the whole site to a professional bar. Verified in-browser page by page.

**Contact — one place instead of five.** The full contact form was rendering on the home, products, work, build, and case-study pages. Consolidated into a single dedicated `/contact` page (PageHeader + form + a "what happens next" timeline). Every CTA now points to `/contact`; added Contact to the nav, footer column, and sitemap. The global footer CTA band remains the consistent closing invite on every page.

**Homepage cards — real substance.** The Products and Work previews were thin (name + tagline; thumbnail + title). Rebuilt them to carry domain, status, tagline, a description, three features / capabilities, and a contextual CTA each — pulled from existing data, still lighter than the full `/products` and `/work` pages so they don't duplicate them.

**Consistent type hierarchy.** Section headings were defined five different ways across components (`clamp(2rem,4vw,3rem)`, `1.85rem…`, `1.75rem…`). Unified every section `h2` to one canonical scale (`clamp(1.9rem, 3.6vw, 2.6rem)`), aligned the blog title to the page-title tier, and **documented the four-tier scale + the specLabel-vs-eyebrow rule** in `globals.css` so it stays consistent.

**Every page reviewed and brought onto the system:**
- **Build** — its bespoke hero now carries the signature topography motif; CTAs point to `/contact`.
- **Careers** — switched from a one-off header to the shared `PageHeader` (signature backdrop), and removed the now-dead header CSS.
- **Blog post pages** — added a reading-progress bar, a category pill, and a richer meta line (author · date · reading time). Title bumped to the page-title weight/scale.
- **Products / Work / About / Contact** — all use `PageHeader` with the shared backdrop; section headings now match.

### 15. Design uplift — signature visual language + editorial home & blog
A proper design pass to make the site feel like the work of people who know what they're doing. Verified visually in-browser (screenshots), not just built.

**Signature visual system** (`src/components/Topography.tsx` + utilities in `globals.css`):
- **Topographic contour lines** — concentric elevation rings rendered as scaled copies of one organic path. Nods to Tanzanian terrain (the Rift, Kilimanjaro, the Usambara range) without being literal; reads as cartography/precision. Tintable, reused across hero, blog feature, page headers, footer.
- **Grain** overlay (`.grain`) over gradients so they never look flat-CSS; **drifting aurora** glows (`.aurora` + `auroraDrift` keyframes); a quiet **blueprint grid** (`.blueprint`); and a monospace **spec label** (`.specLabel`) for the "engineering spec-sheet" feel. New tokens: `--font-mono`, a restrained `--clay` warm-earth accent.

**Home hero — rebuilt** (`Hero.tsx` / `Hero.module.css`):
- Moved from the generic centered template to a confident **editorial split**: oversized left-aligned headline (with the signature animated underline preserved), human subtitle, two clear paths ("Start a project" / "Explore our products"), and a **trust row**.
- Added **live product proof** — a tilted, browser-framed Sifa dashboard with a "live" tag — over the aurora + contour backdrop. Capped hero height (`min(92vh, 900px)`) so it never floats on tall screens.

**Blog — rebuilt as a journal** (`BlogIndex.tsx`, `Blog.module.css`, `blog/page.tsx`):
- Fixed the "thoughtless uniform grid" problem with real **editorial hierarchy**: a warm human intro, a **featured latest post** (60/40 with a signature contour panel, "01", "Latest" kicker), **category filter pills** (animated grid via Framer Motion `layout`), **reading time** (added to `lib/blog.ts`), and a **numbered** asymmetric grid. Renamed to "the journal".

**Site-wide cohesion & invitation:**
- `PageHeader` (products / work / about) and the **footer CTA** now carry the same backdrop, so the whole site reads as one system.
- Contact gains a **"what happens next" 3-step micro-timeline** and doubt-removers ("no bots, no ticket queue", "reply within two business days").

**Copy** — humanised the surface: hero subtitle, contact, footer CTA ("Got something to build?"), blog intro ("Notes from the workshop … no content calendar, no filler"). Striped value-words, varied sentence length, gave it a point of view.

### 12. Dynamic branded OG images
Every page now generates an on-brand Open Graph card for social shares (WhatsApp / LinkedIn / X), instead of all links previewing the same logo.
- **Shared renderer** `src/lib/og.tsx` (`renderOgImage`) — one source of truth, used by every route. Renders the U logo mark, stacked wordmark, an eyebrow, the page title, an optional subtitle, and a gradient accent bar, all in brand colours.
- **Routes**: `src/app/opengraph-image.tsx` (site-wide default, inherited everywhere), `src/app/blog/[slug]/opengraph-image.tsx` (per-post title card), `src/app/work/[slug]/opengraph-image.tsx` (per-case-study card). All prerender statically at build via `generateStaticParams`.
- **Fonts** bundled at `src/lib/og-fonts/` (Outfit 400/700, OFL-licensed WOFF), read with `fs` at build — no fragile runtime font fetches.
- Removed the `logo.png` OG image overrides from `layout.tsx` and the screenshot OG override from the case study metadata so the generated card is the single `og:image` source (no duplicate tags).

### 13. Three more blog posts
Grew the blog from 4 to 7 posts. New posts (each a distinct angle, not a rehash of the case studies):
- **"When a Website Becomes an Operating System"** — the Safari King build, told as an insight about systems vs. brochures. Repo-backed.
- **"Why Our AI Answers in Swahili"** — principles post anchored to Insight's real Education Tutor (the chapati / fractions example). No invented implementation detail.
- **"Software That Understands Selling on Credit"** — principles post anchored to Sifa's real credit-aging UI. No invented implementation detail.

### 14. "Next project" navigation
Each case study now ends with a card linking to the other project's case study (before the contact section), so visitors flow between them instead of dead-ending.

### 9. Case study pages (`/work/[slug]`)
Built dynamic per-project case study pages, grounded entirely in the **actual project codebases** (Safari King and Usambara repos), which the team provided as ground truth. No invented metrics or briefs — everything is verified against the real code.

- **New route** `src/app/work/[slug]/page.tsx` + `CaseStudy.module.css`, with `generateStaticParams`, per-project `generateMetadata` (OpenGraph + Twitter using the project screenshot), and `CreativeWork` JSON-LD. Both pages statically prerender at build time.
- **Page structure**: hero (category, title, factual overview, "Visit live site"), browser-framed primary screenshot, "Inside the build" highlights grid, screenshot gallery with captions, full tech stack, testimonial (where one exists), and a contact CTA.
- **Portfolio data extended** (`src/content/portfolio.tsx`): added `slug`, `overview` paragraphs, detailed `highlights`, screenshot captions, and a `getProjectBySlug` helper.
- **Portfolio cards now link to case studies** — the screenshot and title link through to `/work/[slug]`, with a "View case study" CTA. The external "Visit" link is preserved. Tech chips on the card are capped at 6 with a "+N more" indicator; the full stack shows on the case study page.
- **Homepage Work preview** cards now deep-link to each case study instead of the generic `/work` index.
- **Sitemap** extended to include both `/work/[slug]` routes.

#### Accuracy corrections made from the real repos
- **Usambara was described as a static "HTML, CSS" site — it isn't.** It's a Node.js + Express application (Resend email with a two-email workflow, Helmet security, compression, per-IP rate limiting, WCAG AA accessibility, TravelAgency/FAQ/ContactPage/Blog/ImageGallery schema). Corrected the stack and capabilities.
- **Safari King was undersold as an "AI marketing copilot."** The Claude Sonnet 4.6 integration generates itineraries, blog posts, SEO metadata, booking replies, inquiry replies and newsletters, plus a streaming multi-turn admin assistant with prompt caching. It also has 2FA admin auth, full audit logging, a customer CRM, ~95 pages, 48 API routes and 13 data models. Expanded the description, capabilities, highlights and stack to match reality.
- Nice corroboration: Isaac (our testimonial author) is a named 5.0★ reviewer in Usambara's own published structured data.

### 6. Testimonial integration
- New `src/content/testimonials.tsx` data file. Currently holds one real testimonial — Isaac, Managing Director of Usambara Destination Eco Tours. Quote is rewritten for length and rhythm while preserving the original meaning (the source language and sentiment).
- New `Testimonial` component (`src/components/Testimonial.tsx` + `.module.css`). Reusable, takes an optional `project` slug to fetch a specific testimonial.
- Wired into the **homepage** between `WorkPreview` and `TechMarquee` — work-related social proof at the right moment.
- Wired into the **`/work` page** between `Portfolio` and `Contact` — reinforcement before the conversion ask.

### 7. New blog post — `what-professional-means-tourism-website.md`
- Principles-based post on building tourism websites that convert. Themes drawn from Isaac's feedback: trust signals, listening, communication, "make sure everything works."
- Quotes Isaac's testimonial directly as the proof point in the post body.
- Avoids inventing specific technical claims about Usambara that we cannot verify; sticks to general principles.

### 8. SEO and social-sharing polish
- **Blog posts now have per-post metadata** (`generateMetadata` in `src/app/blog/[slug]/page.tsx`): title, description, keywords, canonical URL, OpenGraph article type with `publishedTime`, `authors`, `tags`, and a matching Twitter card. Previously, every blog post inherited the site default — same title and description in every share.
- **Blog posts now ship JSON-LD `BlogPosting` structured data** so search engines and AI crawlers can parse them as articles instead of generic pages.
- **Sitemap** (`src/app/sitemap.ts`) extended to dynamically include every published blog post slug, with `lastModified` pulled from each post's front-matter date. Previously the sitemap only listed top-level pages.

---

## Shipped (earlier passes)

### 1. Bug fixes
- **Blog post mobile edge-cutoff** — `BlogSlug.module.css` used `padding: 8rem 0 5rem` which overrode the global `.container` horizontal padding, so blog posts went edge-to-edge on every screen. Split into `padding-top` / `padding-bottom` only.
- **Home link missing from nav** — Added `{ label: 'Home', href: '/' }` to `navLinks` in `src/content/site.ts`.

### 2. Logo stack
- "Technologies" now stacks below "Ubunifu" in both navbar and footer logo blocks (per design direction).

### 3. Real screenshots integrated
Replaced fake browser-mockup animations with real product/work screenshots:
- **Portfolio (Work)** — Safari King and Usambara cards now display actual site/admin screenshots in a Chrome-style browser frame, with a list of what we actually built (capabilities) under the description.
- **Products** — Insight and Sifa cards now show actual product UI (Document Generator template gallery showing "Tanzania Tax Invoice", and the Intelligence Dashboard for Mama Amina Duka with credit aging buckets visible). Rafiki and Build cards remain text-only since they have no screenshots yet.
- **Homepage Work preview** — small thumbnails on the homepage now show real screenshot crops instead of logos on coloured backgrounds.

Screenshot library: `public/work/` (committed). Originals: `work-screenshots/` (gitignored).

### 4. Layout / IA changes

- **`Clients` component removed** — was showing the same 2 projects as logo cards on `/products` and `/about`, duplicating Portfolio and overstating volume ("Trusted by businesses across Tanzania" with 2 logos). Deleted both the component and its CSS. When we have real client logos beyond the two case studies, bring it back from git history.
- **`/build` page** now uses the lighter `WorkPreview` (links to `/work` for full detail) instead of rendering the full `Portfolio` — was a 1:1 duplicate of `/work`.
- **Products bento** restructured: live products with screenshots get a full-width row with screenshot-left / content-right at desktop; smaller "Soon"/"Available" cards sit as a 2-up beneath. Stacks vertically on mobile.

### 5. Copy tightening
Truthful, specific rewrites — kept only claims backed by shipping product or visible screenshots:
- **Hero subtitle** — `"Two live SaaS products and custom builds for businesses across Tanzania. Document AI that answers in Swahili. Business software with credit selling built in. Shipped from Arusha."` Every claim is proven by a screenshot.
- **Insight tagline** — `"Document AI, built for here"` with description that names the Swahili AI agents and Tanzania-localised templates.
- **Sifa tagline** — `"Run your shop, restaurant, or distributor"` with description that names credit selling and offline support.
- **Safari King case study** — rewritten to reflect what we actually built: booking platform + custom CRM admin + AI marketing assistant powered by Claude Sonnet 4.6.
- **`/products` lead** — removed the "supported the way this market actually works" tail.
- **`/work` lead** — now mentions custom CRMs and AI-augmented platforms (what we actually ship), not just "websites".
- **Homepage previews** — tightened ProductsPreview and WorkPreview copy. AboutPreview now says "shipping our own SaaS products and taking on custom builds" (specific) instead of the older vague version.
- **"How this market actually works" phrase** — now appears in exactly one place: the `/about` page lead. Treated as a thesis statement, not a slogan.

---

## Deferred (need more before shipping)

### Content / data we don't yet have

| Item | What's missing | How to unblock |
|---|---|---|
| **Quantified case study outcomes** | No real metrics for Safari King or Usambara (bookings/month, conversion lift, performance scores). | Pull real numbers from the products. Even rough ranges ("dozens of monthly bookings") are better than nothing — once verified. |
| **Client testimonials** | One landed (Isaac / Usambara). Still need Safari King's. | Ask the Safari King team for a quote we can attribute. With two testimonials we can rotate or carousel on the homepage. |
| **Testimonial author photo** | We render initials in the avatar. A real photo would land harder. | Ask Isaac for a small headshot we can use. Drop into `public/work/` and add `authorImage` to the testimonial record. |
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
| ~~**Case study detail pages**~~ | ✅ **Shipped**, including the "next project" footer link. Still deferrable later: add an *outcome/metrics* row once we have verified numbers. |
| **Pricing page** | Pay-as-you-go is a differentiator. Deserves a dedicated page showing the model + sample math. **On hold** at the team's request for now. |
| **Dark mode** | Most developer-adjacent buyers default to dark. Skipped for now to focus on content first. |
| **Newsletter signup** | Blog now has 7 posts — enough to justify a capture. Good candidate for the next pass. |
| ~~**More blog posts**~~ | ✅ Grew 3 → 7 (tourism, Safari King "operating system", Swahili AI, selling on credit). Keep adding over time; a Sifa offline-first piece and an Insight data-extraction piece are still good future topics. |
| ~~**Branded OG images**~~ | ✅ **Shipped.** Dynamic per-route OG cards via `src/lib/og.tsx`. |
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

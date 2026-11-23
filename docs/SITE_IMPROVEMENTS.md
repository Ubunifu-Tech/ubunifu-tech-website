# Site Improvements — Tracker

Single source of truth for the site redesign / quality pass. Maintained as work progresses. Anything we can ship with current materials goes under **Shipped** with a brief note. Anything that needs new content, real data, or further design work goes under **Deferred** with a clear owner and unblock condition.

**Rule we follow:** never invent metrics, testimonials, client logos, or capabilities. Conceptual artwork may explain a workflow, but it is never presented as a product interface or proof of delivery. Claims must be backed by a shipping product, a live client link, approved source material, or another verifiable fact. Where the strongest version of a claim isn't yet provable, we ship a weaker truthful version and flag the better version under Deferred.

Earlier entries are retained as implementation history. Where an older entry describes retired navigation, typography, layouts, claims, imagery, or brand assets, the latest applicable entry and the current source files take precedence.

---

## Shipped (latest pass)

### 53. Individual product illustrations — 9 September 2026

- Added three distinct, wordless product illustrations: source documents for Insight, stock and sales records for Sifa, and modular website tools for Rafiki. Exact prompts, built-in generation mode, original paths and runtime assets are in `PRODUCT_ARTWORK.md`. Original PNGs remain untouched; optimized WebP copies are 39–91 kB each.
- Replaced the cramped four-column product register with open image-and-text rows that stack on smaller screens. Images retain their full composition, descriptive alt text, reserved aspect ratio and lazy loading. Stable product IDs bind each illustration to its product. Existing reduced-motion-aware row transitions remain; no new animation or package dependency.
- Kept product names, features, availability and links unchanged. Rafiki still says “In development” and “Coming soon” without a live-product link. The homepage preview stays text-led to avoid unnecessary repetition. No fake screenshots, image text, generated people, new UI colours or added claims.
- Validation: lint, TypeScript, three-size typography, whitespace checks and production build pass. Rendered checks verify all three product illustrations, source-size budgets, lazy loading, accessible descriptions, protected external links and Rafiki’s status, alongside the existing hero and SVG checks. No browser visual QA, contact submission, hosting change, push or publication was performed.

### 52. Generated hero collection and remaining service illustrations — 9 September 2026

- Generated and visually inspected thirteen new assets: eleven distinct main-page hero backgrounds plus branding and strategy service illustrations. Exact prompts, provenance and saved paths are in `HERO_ARTWORK.md`. Original PNGs and earlier assets remain untouched; no new logo, generated words, fictional staff, client screenshots, or metrics were introduced.
- Added the static `HeroBackdrop` with one responsive, preloaded image per page, centered HTML headings, navy contrast treatment, and no scroll or animation runtime. Main page heroes cover Home, Services, Work, Products, About, Industries, Contact, Articles, Careers, Brand and Privacy. Individual article covers and case-study diagrams are preserved.
- Unified Articles and Brand with the shared full-width header, removing duplicate navbar offsets and keeping their content below. The brand header now identifies the usable logo files and guidelines plainly. The light contact form and dropdown remain unchanged.
- All six service sections now have a visual: the four existing semantic SVGs and two lightweight generated illustrations. No additional sections or service-copy claims. WebP source files are 38–145 kB each; below-the-fold service images lazy-load.
- Validation: lint, TypeScript, three-size typography, whitespace checks and production build pass. Rendered checks verify eleven distinct hero backgrounds, two service images, image budgets, single page headings, and the seventeen existing wordless SVG instances across eight routes. All eleven main local routes return HTTP 200. No browser visual QA, contact submission, hosting change, push or publication was performed.

### 51. Contact dropdown surface — 8 September 2026

- Matched the enquiry dropdown to the light contact form: white menu, navy option text, neutral selected/active rows, a lighter shadow, and a light scrollbar track. The active row retains a clearly contrasting neutral outline; the selected checkmark, keyboard focus, forced-colours support, and reduced-motion behaviour remain. Styling only; selection, validation, and submission code are unchanged.

### 50. Text-free SVG system — 8 September 2026

- Removed visible labels from both project diagrams across work previews, case studies, industry references, and related articles. Project copy and live links remain outside the artwork; each meaningful diagram retains a single screen-reader description.
- Introduced a shared SVG composition system using trusted Lucide icons, consistent stroke weights, navy and restrained orange. Six distinct arrangements explain the two project systems plus responsive websites, hosting/domains/email, reporting, and grounded AI with human review. No new raster generation, fake screens, metrics, ornamental nodes, or animation runtime.
- Replaced four service raster illustrations in their existing sections. Branding and strategy remain text-led. Removed the label-specific diagram stylesheet and extra thumbnail height that was needed for the deleted labels; proportional SVGs fit the existing responsive media frames.
- Extended rendered-source checks to reject visible wording inside diagrams, verify proportional SVGs and accessible semantics, and require all four service compositions. Original assets, social metadata, logo, palette, contact handling, and hosting are unchanged.
- Validation: lint, TypeScript, typography, whitespace checks, and the production build pass. The rendered-source check verifies 17 wordless SVG instances across eight routes; six local routes return HTTP 200. Explicit icon dimensions protect nested SVGs from the global responsive-media rule. No browser visual QA or publishing was performed.

### 49. Neutral surfaces and project system diagrams — 8 September 2026

- Replaced lavender page surfaces with white and navy-derived neutral tints. Removed large purple gradients from contact CTAs, blog/work backgrounds, and mobile navigation. Original orange/violet/navy logo colours remain unchanged.
- Removed the homepage four-stage assembly and its replay control, its reserved spacing, the global footer tagline, and repeated location phrasing. Factual location details remain in About and Contact.
- Replaced in-page Safari King and Usambara landscapes with one shared icon/diagram renderer: operations with enquiries, customer records, and reviewed drafts; and a trip enquiry branching into operator notification and visitor confirmation. Applies to work previews, case studies, Industries, and related article views. No generated replacement images, simulated interface, or fabricated metrics.
- Preserved existing social metadata and legacy files. Added a post-build check for the diagrams, absent legacy in-page images, and retired homepage labels across eight routes. No contact/API or hosting changes.
- Reserved readable diagram height in short thumbnails, allowed label wrapping, and retained accessible descriptions. Code checks, production build, eight rendered-route checks, and six local HTTP checks pass. No browser visual QA was performed; the existing local preview remains the review surface.

### 48. Removal-first language and design pass — 8 September 2026

- Removed the synthetic planning photograph together with its disclaimer, the Services brand specimen, the priority matrix, and the sticky/cycling showcase. Services now uses native in-flow sections, four subject-specific illustrations, and text-led branding/advisory sections.
- Removed decorative counters, duplicated introductions, coloured edge rails, the WhatsApp/dropdown orange strips, speculative career areas, and blog passages about editorial honesty. Preserved meaningful product statuses, dates, qualifications, real team details, live project links, and paraphrased-testimonial attribution.
- Kept the original logo and palette. Body-size text and controls are regular 400, headings are medium 500, and tracking is normal. Expanded the typography guard to check body weights and tracking. Removed unused preview exports and their orphaned CSS.
- Opened value, team, and process sections and removed number-column gaps in service, product, work, industry, and article layouts. The hero retains its finite SVG/CSS assembly; its desktop connections now follow a clockwise sequence, without crosshair guides or the disconnected signal path.
- Reviewed shader techniques and retained SVG for this explanatory diagram. No new WebGL dependency, backend change, live contact submission, or hosting migration.
- Validation: lint, TypeScript, the stricter typography guard, whitespace checks, and production build pass. Ten main local routes return HTTP 200. No browser visual/interaction QA was performed in this pass; local preview remains available for review.

### 47. Balanced, three-size typography — 8 September 2026

- Consolidated live-site typography into display, heading, and body tokens. All 356 CSS size declarations now use those roles or inheritance, including labels, captions, forms, articles, and mobile variants. The brand page documents the same system.
- Loaded real Poppins 400/500 weights, moved headings and controls to medium 500, kept reading text regular 400, and reserved 600 for semantic emphasis. The logo keeps its original 600/700 weights and geometry. Opened tight line heights and tracking without changing the palette.
- Adjusted navigation breakpoints and scrolling, caption widths, service-example flow, and hero diagram columns for the larger labels. The narrowest hero uses a two-column assembly line.
- Added a dependency-free typography guard to `npm run check` to prevent new one-off text sizes or heavy weights from creeping back in. Social-image compositions remain separate from live-site typography.

### 46. Homepage system-assembly hero — 8 September 2026

- Replaced the homepage business-scene backdrop with a navy architecture field that assembles a brief, application layers, data workflow, and domain/hosting/email hierarchy. The existing wide centred headline, brand identity, and destination links remain intact.
- Reworked the unused `SystemsField` canvas into lightweight HTML/SVG/CSS diagrams. Orange signals and violet routes animate for 4.4 seconds once, then settle; the optional replay control does not restart the headline or CTAs. No particles, 3D, video, or permanent animation loop.
- Added offscreen/hidden-tab pausing, a static reduced-motion treatment, and a compact assembly line on narrower screens. The earlier generated homepage scene is retained, not deleted.

### 45. Branded contact enquiry dropdown — 8 September 2026

- Replaced the operating-system select menu with an Ink Navy popup, Digital Violet active state, and Signal Orange selection marker, using existing brand tokens only.
- Added arrow-key navigation, Home/End, typeahead, Enter/Space selection, Escape cancellation, normal Tab exit, and labelled combobox/listbox semantics. Empty-subject validation focuses the control and associates the error message.
- Popup placement follows available viewport space, supports nested scrolling independently of Lenis, and respects reduced motion. Subject values, the contact API, honeypot, and submission idempotency are unchanged.

### 44. Subject-specific imagery and a tighter editorial structure — 8 September 2026

- Replaced the ambiguous 3D Usambara and safari workflow compositions with quieter, subject-specific travel illustrations. Project images are reused only to identify the same case study or its related article; the Work masthead no longer repeats both images above the listing.
- Gave web, hosting, data, and AI their own flat illustrations: responsive layouts; server/domain/email; records and reporting; and source material, reasoning, and review. Branding shows Ubunifu's actual canonical lockup, colours, and type. Strategy uses an accessible impact-versus-effort table instead of another generated scene.
- Removed the large overlaid Services sequence numbers, dark illustration veils, and repeated decorative rails. The sticky artwork and direct navigation remain, with in-flow examples at widths up to 980px or heights up to 700px. Native mobile examples expand with their text, and enlarged desktop examples can scroll inside the illustration frame.
- Replaced the home and Services hero imagery with two different, explicitly labelled AI-generated Tanzanian working-life scenes. They are illustrative, not photographs of staff, clients, or the Ubunifu office. Removed the homepage's extra SystemsField canvas and contour/grain overlays.
- Removed repeated homepage positioning and process sections; the detailed delivery process stays on Services. Product introductions now use an open text-led register without the abstract 3D product-family machinery. About, Work, Products, Industries, Careers, and Contact have compact mastheads; About no longer repeats the delivery process and Industries no longer repeats its domain-fit caveat in a decorative panel.
- Removed duplicated blog-index framing and the unrelated Insight promotion from every closing contact CTA. Article covers now have distinct paths; the homepage selects a lead story whose cover is not already used in selected work. Usage pricing gets its own metering illustration.
- Preserved the orange/violet/navy tokens, canonical logo, factual product/service scope, navigation, project links, contact behavior, and reduced-motion support. Added no libraries, fabricated proof, or backend changes. New assets are optimized WebP; previous files remain recoverable and unmodified. `EDITORIAL_ASSETS.md` records the exact prompts and permitted reuse.
- Validation: lint, TypeScript, and production build pass. Checked Services and the homepage at 390px mobile width, the sticky panel at 1280 × 720, and the native examples at the regular 1117 × 986 preview size; no horizontal overflow in those checks. Mobile menu opens, closes on navigation, and restores scrolling. All referenced editorial files exist and the seven blog covers have distinct paths. Nine new assets total 730,978 bytes; no contact submissions or external product mutations were made during QA.

### 43. Services scroll layout and clearer delivery outcomes — 8 September 2026

- Reproduced the empty left column: `overflow-x: hidden` on the page body made it a scroll container, so the sticky artwork scrolled out of view. Changed horizontal containment to `overflow-x: clip` so the panel follows the document scroll while artwork remains contained.
- Sized the complete artwork and capability index to the available viewport, removed the percentage minimum height from its column, and kept the per-chapter artwork layout for screens at or below 980px wide or 600px high. Reduced excessive chapter spacing and increased the small navigation and caption type.
- Removed dimming from service descriptions and made artwork crossfade concurrently so the outgoing image no longer disappears before the next transition starts. Reduced-motion handling remains in place.
- Reviewed [Bay6](https://www.bay6.ai/) and [Forge6](https://www.bay6.ai/forge6) for inspiration. Applied shorter Services headlines, explicit outputs for Understand → Shape → Build → Operate, and a more concrete prompt for the first conversation. Kept Ubunifu's existing artwork, orange/violet/navy identity, open layouts, and supported service scope.

### 42. Restored original three-colour identity — 5 September 2026

- Restored the owner-preferred **Ubunifu Ligature**: the original open-stroke orange U and violet T with its angled crown. The runtime mark, favicons, downloadable SVGs, avatar, email asset, and dormant canvas renderer now share that geometry.
- Kept Ink Navy `#1F1A36` as the wordmark, typography, structural, and dark-field foundation. Orange and violet are equal logo colours; deep orange remains the accessible CTA/text variant, while data blue stays limited to data and infrastructure illustration.
- Preserved the stronger full-name lockup, embedded export fonts, responsive navigation, accessibility work, editorial layouts, conceptual-art disclosures, and control system introduced in #41. This restores the preferred symbol without rolling back the broader redesign.

### 41. Unified identity and interface system — 5 September 2026 (identity superseded by #42)

- At this stage, replaced the stroked orange/purple monogram with a filled navy U/T concept called the **Ubunifu Join**. That symbol was retired and the original Ligature restored in #42; the remaining interface improvements in this entry still apply.
- Restored equal visual importance to the full **Ubunifu Technologies** name. Both words use one readable size and baseline in the navigation, footer, exports, and email lockup.
- Kept the existing palette but established clear roles: navy for structure and message, orange for identity and action, purple for intelligence and secondary interaction, and blue for data/infrastructure illustration. Deep orange moved from `#C44615` to `#BF4314` so small text clears AA on the lavender canvas while white CTA text remains comfortably legible.
- Added shared inverse text/border, control-radius, section-spacing, and responsive navigation-height tokens. Fixed the footer gutter drift, dark-logo contrast, unsupported font weights, and the 601–660px fixed-navigation overlap.
- Rebuilt `/brand` as an open editorial specimen sheet rather than a rounded-card catalogue. Download rows, logo matrices, colour roles, type specimens, and usage rules now use the same ruled layout language as the commercial pages.
- Standardised conceptual-art disclosure, internal/external arrow meaning, key artwork crops, primary action geometry, and article-cover treatment. The persistent WhatsApp action now uses the brand system, has no pulse, and reads from the central contact configuration.
- Preserved the existing social-preview artwork and metadata; it is not a canonical logo master. Any future social-preview refresh remains a separately approved pass and must use the restored Ligature from #42.

### 40. Editorial project and product storytelling — 5 September 2026

- Replaced raw interface and sample-site screenshots across the homepage, Work listing, Products, Services journey, Industries proof, and case-study covers with three original conceptual illustrations: Safari operations, Usambara discovery to enquiry, and the connected Ubunifu product family.
- Kept product names, current status, delivered capabilities, client domains, case-study links, and live-site links as accessible HTML. Every synthetic visual is described or visibly captioned as conceptual rather than presented as a literal interface.
- Rebuilt the Products catalogue as an open editorial ledger with semantic product headings, status, workflow description, capability register, and direct destination link. The homepage now uses one product-family panorama rather than three mismatched screenshot cards.
- Removed the raw screenshots from `public/` after confirming no runtime references remained. Several included personal names or saved-work context and did not belong at durable public asset URLs; the deletions remain recoverable from repository history.
- Preserved the existing palette and generated no logos, pseudo-interface text, fake dashboards, fake metrics, people, flags, or extra colours. The three compressed WebP assets total less than 500 KB.
- Fixed the Services journey column geometry so its conceptual stage remains present through the complete desktop narrative instead of ending after the first chapters.

### 39. Systems-led art direction and consulting narrative — 5 September 2026

- Reordered the homepage into a clearer consulting argument: proposition, two ways to work with Ubunifu Technologies, immediately scannable capabilities, named client evidence, owned products, delivery method, and field notes.
- Added a lightweight, code-native 2.5D “systems field” behind the centred homepage hero. Scattered signals resolve into six connected modules using only the existing orange, purple, blue, navy, and white palette. It caps device pixel ratio, pauses off-screen and in background tabs, avoids React work inside animation frames, and renders a static assembled state for reduced-motion users.
- Replaced the Services autoplay cycle and the six repeated feature rows with one user-led capability journey: a sticky evidence stage, a scroll-synchronised index, direct anchor navigation, complete visible service chapters, and a static mobile composition. No service information waits behind a carousel.
- Introduced page-header compositions for spatial, proof, human, and direct-contact pages while keeping the titles wide and centred. Each route now carries a concise, truthful register suited to its job instead of repeating one identical hero silhouette.
- Rebuilt the Work listing as two differently scaled evidence narratives. Real screenshots, supported workflows, and case-study routes now lead; fake browser chrome and prominent technology tags no longer frame the consulting proof.
- Reworked Industries around one cinematic, named tourism proof followed by an open sector ledger. The copy now distinguishes proven work, transferable workflow patterns, and domain responsibility without presenting prospective sectors as client experience.
- Tightened product and company language: service names are more concrete, unverified “free” CTAs are gone, and “technology consultancy that also builds and operates products” replaces startup/SaaS shorthand in primary metadata.
- Added no colours, animation packages, video payloads, or WebGL dependencies. Framer Motion orchestrates restrained transitions around the existing design tokens and real screenshots.

### 38. Structural motion and proof-led consulting pages — 30 August 2026

- Extended the existing Framer Motion system with a moving active-navigation rule, subtle scroll depth for full-bleed hero artwork, branded media shutters, and reduced-motion-safe editorial reveals. No new colours or animation dependency were introduced.
- Rebuilt the Services capability cycle around a shared moving selection marker, stable crossfading panel geometry, restrained directional movement, and a large editorial sequence number while preserving its pause, keyboard, mobile, visibility, and reduced-motion behaviour.
- Turned the homepage methodology strip into a scroll-led ruled timeline: each stage draws its line, number, and copy together instead of arriving as another generic fade-up block.
- Reimagined both case studies as proof-led consulting narratives. The real system screen now lives inside the full-width hero; fake browser chrome, rounded feature cards, technology pills, and the rounded next-project card were replaced with open evidence, decision, stack, gallery, and continuation registers.
- Reworked Contact into a ruled project brief with a sticky consulting statement, an open response sequence, a contact register, and unboxed fields. The secure submission behaviour, validation, honeypot, privacy warning, and status messaging remain unchanged.
- Reframed the homepage testimonial as attributable client evidence: organisation first, a concise verified pull quote, direct organisation and case-study links, and no synthetic gradient avatar.

### 37. Full-bleed heroes and open editorial layouts — 24 August 2026

- Moved homepage and shared page-header artwork out of document flow and into full-bleed background layers. Existing deep navy now provides the legibility scrim, while page-specific secondary imagery can form a restrained background collage instead of a floating screenshot card.
- Widened the homepage and page-title measures, removed the homepage's forced three-line stack, and stopped global heading styles from breaking words arbitrarily.
- Fixed two genuine grid auto-placement bugs that were pushing homepage and Services headings into narrow right-hand columns. Section introductions now use explicit label/title/copy areas and stack earlier at compact widths.
- Replaced the site's heaviest runs of rounded cards with open editorial systems: ruled project case-study rows, product dossiers, a product register, a lead-story Journal layout, an open pull quote, capability directories, methodology ledgers, and a full-width closing statement.
- Removed pill treatment from general section eyebrows and most descriptive tags while preserving contained surfaces where they serve a functional purpose, such as forms, controls, and browser proof frames.

### 36. Art-directed hero system — 23 August 2026

- Added an original panoramic homepage artwork: scattered business inputs becoming one coherent operating system, photographed in the established paper-and-ceramic editorial language and restricted to Ubunifu's existing navy, orange, purple, blue, clay, and off-white palette.
- Built a reusable responsive hero-art component with a wide primary field, optional overlapping proof image, concise caption rail, meaningful image alternatives, optimised Next.js image loading, one-shot entrance motion, and reduced-motion support.
- Reframed every main commercial page as a centred consulting hero with a visual narrative beneath the proposition. Services, Industries, About, Contact, and Careers use tactile editorial work; Work and Products use real client/product screens rather than fabricated interface art.
- Kept Privacy intentionally restrained and image-free. The system distinguishes ideas from evidence: generated art explains a concept, while real screenshots substantiate shipped work.

### 35. Editorial art in service storytelling — 23 August 2026

- Added two original, text-free editorial artworks to replace icon-only fallback panels in the Services page: a connected infrastructure system for hosting/domains/email/backups, and a tactile identity system spanning brand touchpoints.
- Kept the artwork in the same photographed paper-and-ceramic family as the existing Journal imagery, using only the established orange, purple, blue, clay, navy, and off-white palette.
- Preserved icons where they improve scanning and interaction, while using imagery for the larger narrative moments where it can carry meaning.

### 34. Service interaction and motion system — 23 August 2026

- Replaced the old frame-rate-dependent canvas orbit with a full-width, semantic capability navigator: six real service controls, one stable narrative panel, restrained directional transitions, and direct links to each detailed service.
- Added a one-pass guided sequence with visible progress and pause control. It pauses out of view, on hover or keyboard focus, stops after deliberate selection, and is disabled for reduced-motion preferences.
- Reframed the experience as a mobile accordion below 820px so service copy remains readable and every control stays touch- and keyboard-accessible.
- Restored the intended entrance choreography for the home hero, shared page headers, scroll reveals, and staggered process cards using one easing curve and short travel distances. Removed the conflicting duration setting from smooth scrolling so it responds more cleanly.
- Used only the established Ubunifu palette and existing dependencies.

### 33. Full-width consulting presentation — 23 August 2026

- Replaced the homepage's tilted two-engine interface card with a near-viewport editorial hero: one large consulting proposition, one supporting paragraph, two restrained actions, and a full-width credibility rail.
- Rebuilt the shared page-header system as wide, left-aligned editorial fields across Services, Work, Products, Industries, About, Contact, and Careers. The Services page now leads with consulting language rather than an animated product-style constellation.
- Simplified the navbar's glass, pill, shadow, and gradient treatments into a flat professional header with a rectangular project CTA.
- Moved the attributed client testimonial ahead of the product family on the homepage so consulting evidence establishes authority before owned software appears.
- The direction was informed by current official sites from BCG X, Thoughtworks, frog, Work & Co, ustwo, Genesis Analytics, BBD Software, Invent Consulting, and YUX Design; no visual assets, claims, colors, or copy were copied.

### 32. Ubunifu Technologies identity refinement — 23 August 2026

- Replaced the generic route symbol with the custom **Ubunifu Ligature**: an interlocking orange U and purple T in solid brand colors, finished with a rising angled T crown.
- Restored the full company name as the primary wordmark: **Ubunifu Technologies** now sits on one readable baseline in the horizontal lockup.
- Kept “Consulting + products, built in Tanzania.” as positioning copy only; it does not appear inside the navigation or logo lockup.

### 31. Consultancy + product studio redesign — 23 August 2026

- Repositioned Ubunifu around two connected engines, consulting and products, with a new primary navigation: Services · Work · Products · Insights · About, plus the Contact CTA.
- Rebuilt the homepage narrative around the two-engine hero, named client work, Insight/Sifa/Rafiki, a grounded testimonial, and the latest Journal notes; `/work` is client evidence and `/products` is the product catalogue.
- Introduced the two-color house-mark system, canonical vector assets in `public/brand/`, the `/brand` kit, and a tactile 16:9 editorial-cover system for pages and Journal posts. The symbol from this pass was superseded by the Ubunifu Ligature in #32.
- Tightened claim boundaries, sector language, contact/privacy behavior, reduced-motion support, security headers, and project documentation for the current site.

### 30. Redesigned transactional emails + full link audit

The contact form's two automated emails were generic. Extracted them into a dedicated template module (`src/lib/emails.ts`) and rebuilt both to match the site's brand.
- **New module `src/lib/emails.ts`** exports `notificationEmail()`, `acknowledgementEmail()`, and a shared `escapeHtml()`. Table-based, inline-styled, absolute-URL HTML built to render across email clients, with hidden preheader text, the solid two-color house mark, and a dark footer carrying real contact links (email, tel, WhatsApp, Website, Services, Our work) + © year. The current mark is the Ubunifu Ligature introduced in #32.
- **Team notification**: "New enquiry → *{name} got in touch*", a clean Name / Email / Subject table, the message in a tinted box, and a one-click **Reply to {name}** mailto button (pre-filled `Re:` subject). Reply-To is still the sender.
- **Sender acknowledgement**: "Thanks for reaching out, {name}.", confirms the subject, a numbered **what-happens-next** (mirrors the `/contact` timeline), then **Try Ubunifu Insight** / **Try Ubunifu Sifa** product buttons.
- **Route wired to the templates.** `src/app/api/contact/route.ts` now imports the two builders and dropped its inline HTML + duplicate `escapeHtml`. Current hardening includes strict JSON validation, a honeypot, streaming body limits, bounded Vercel-aware throttling, idempotency keys, best-effort acknowledgement, and a missing-key 503.
- **Link audit (email + site).** Rendered both emails and verified visually at 760px. Every link checked: all 14 internal routes return 200 on the live server; every external URL (ubunifutech.com, insight/sifa subdomains, Safari King, Usambara, GitHub, WhatsApp) returns 200 — LinkedIn returns its usual bot-blocking `999` but is valid in a browser. Em dashes removed from the email copy to match the site's voice. Typecheck + lint + build clean (34 pages).

### 29. Our own products once counted as "work" (superseded by #31)

This iteration briefly grouped client projects and Ubunifu products on `/work`. The current architecture introduced in #31 separates them: `/work` contains client evidence, while `/products` is the product catalogue.

### 28. Contact form hardened

Reviewed the form end to end and fixed a real robustness bug in `src/app/api/contact/route.ts`:
- **Resend was instantiated outside the `try`** (`new Resend(process.env.RESEND_API_KEY)`), and the SDK throws when the key is missing — so the endpoint returned **500 for every request**, including honeypot submissions, with no graceful degradation. Moved instantiation to after validation, inside the try, with an explicit missing-key guard (clear 503 + logged error).
- **Acknowledgement email is now best-effort** (its own try/catch) so a failed confirmation to the sender never fails a successful team notification.
- Verified every branch against the running server: honeypot → 200 (silent), too-fast → 200 (silent), missing fields → 400, invalid email → 400, valid → reaches the email step (200 in prod with the key; clear 503 locally without it). The form UI now uses an accessible native select, and email output is HTML-escaped.

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
- **Proof band** (`ProofBand`) right under the hero — an experimental dark panel later removed in #26. Its volatile product-count, review, model-provider, and location claims are not part of the current site.
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

### 21. Repositioned as a digital-solutions agency (superseded by #31)

This was an earlier agency-led direction. #31 restored a balanced **consulting + products** model, with both engines represented in the navigation and homepage narrative.

- **Five service pillars** (`src/content/services.tsx`): Digital Presence & Web, Branding & Visual Communication, Data Analytics & BI, Intelligent Automation & AI, Digital Strategy & Consulting. Each an icon-driven card.
- **Services page** (`/build`) rebuilt around the pillars: icon cards with brand-coloured summaries, checklists, "01–05" spec numbers, the code-window hero retitled "Everything your digital side needs."
- **Homepage rebuilt, agency-led:**
  - Historical hero → "Digital solutions, built for Tanzania." with Safari King client-build proof and trust chips; retired in #31.
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
- **Shared renderer** `src/lib/og.tsx` (`renderOgImage`) — one source of truth, used by every route. Renders the current Ubunifu Ligature, the full “Ubunifu Technologies” one-line wordmark, an eyebrow, the page title, an optional subtitle, and a gradient accent bar, all in brand colours.
- **Routes**: `src/app/opengraph-image.tsx` (site-wide default, inherited everywhere), `src/app/blog/[slug]/opengraph-image.tsx` (per-post title card), `src/app/work/[slug]/opengraph-image.tsx` (per-case-study card). All prerender statically at build via `generateStaticParams`.
- **Fonts** bundled at `src/lib/og-fonts/` (Poppins and Inter, OFL-licensed TTF), read with `fs` at build — no fragile runtime font fetches.
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
- **Safari King was undersold as an "AI marketing copilot."** The project includes booking, customer-management, content, email, security, and assisted-drafting workflows. The public case study now avoids volatile model-version and codebase-count claims.

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
- Historical: “Technologies” was stacked below “Ubunifu” in both navbar and footer logo blocks. This was superseded by #32; the current lockup puts the full **Ubunifu Technologies** name on one baseline.

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
- **Sifa tagline** — `"Run your shop, restaurant, or distributor"` with a description centred on verified sales, inventory, and credit workflows.
- **Safari King case study** — rewritten to reflect the booking platform, custom CRM administration, and assisted content workflows without pinning the site to a volatile model version.
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
| ~~**Client logos / "Trusted by" strip**~~ | ✅ **Resolved** — `Clients.tsx` was removed rather than ship with fake logos. | Revisit only if we have real client logos to show. |

### Design / layout work

| Item | Note |
|---|---|
| ~~**Homepage hero redesign with screenshot**~~ | ✅ **Resolved in #36** with an original panoramic system artwork; real product screens remain reserved for product and work proof. |
| **Product demo videos** | A 20–40s loop of Insight chat or Sifa POS would outperform any screenshot. Needs screen recording + editing pass. |
| ~~**Regenerate the legacy raster logo**~~ | ✅ **Superseded by #31** — canonical SVG masters now live in `public/brand/`, with `public/logo-v2.png` as the raster avatar. |
| ~~**Swap OG-card font to Poppins**~~ | ✅ **Done in #31** — case-study cards use bundled Poppins for headings and Inter for supporting text. |
| ~~**Case study detail pages**~~ | ✅ **Shipped**, including the "next project" footer link. Still deferrable later: add an *outcome/metrics* row once we have verified numbers. |
| **Pricing page** | Pay-as-you-go is a differentiator. Deserves a dedicated page showing the model + sample math. **On hold** at the team's request for now. |
| **Dark mode** | Most developer-adjacent buyers default to dark. Skipped for now to focus on content first. |
| **Newsletter signup** | Blog now has 7 posts — enough to justify a capture. Good candidate for the next pass. |
| ~~**More blog posts**~~ | ✅ Grew 3 → 7 (tourism, Safari King "operating system", Swahili AI, selling on credit). Keep adding over time; a Sifa offline-first piece and an Insight data-extraction piece are still good future topics. |
| ~~**Branded OG images**~~ | ✅ **Shipped.** Dynamic per-route OG cards via `src/lib/og.tsx`. |
| **Insight & Sifa multi-screenshot galleries** | Single hero screenshot per product is the v1. A click-to-expand lightbox or in-card carousel would let us show 3–5 angles per product. Deferred to v2. |
| ~~**Visual signature**~~ | ✅ **Addressed in #31–#32** with the Ubunifu Ligature, tactile editorial covers, topographic details, and connected-system layouts. |

### Operational

| Item | Note |
|---|---|
| **Product-specific privacy terms** | The corporate site now has `/privacy`; Insight and Sifa still need product-specific data-handling terms maintained alongside each product. |
| **Security notes for Insight** | What happens to uploaded docs? Where is data stored? Encryption? Buyer due diligence will ask. |
| **Status page / SLA mention** | Not urgent at current scale but signals operational seriousness as we grow. |

---

## Duplication audit

Sections that currently appear in more than one place. Most are intentional (landing-page previews → deep page). Flagged here so we don't accidentally let copy drift between them.

| Component | Where it's used | Action |
|---|---|---|
| `Products` | `/` (via `ProductsPreview` in HomePreviews) + `/products` page | OK — preview vs. full. Both pull from `src/content/products.tsx`, so copy stays in sync. |
| `Portfolio` | `/work` page, with a lighter client-work preview elsewhere | Current architecture keeps the full client portfolio on `/work`; other pages link into it without duplicating the catalogue. |
| `About` (values cards) | `/` (via `AboutPreview`) + `/about` page | OK — both pull from `src/content/values.tsx`. |
| `Contact` | Dedicated `/contact` route | Other pages use focused calls to action that link to the single form. |
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

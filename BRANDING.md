# Ubunifu Technologies — Brand & Design System

The visual system for the Ubunifu Technologies website. This is the source of truth — if you're changing colors, fonts, or component patterns, update this document and the relevant CSS variables together.

> **Sharing with collaborators?** There's a live, always-current brand page at **`/brand`** (not in nav) and a shareable **PDF** at **`public/ubunifu-brand-guide.pdf`** (served at `/ubunifu-brand-guide.pdf`) — colours with hex + RGB, type, logo, and usage rules.

---

## 1. Brand Personality

| Trait | What it means |
| ----- | ------------- |
| **African-built** | Designed in Arusha, Tanzania. The brand reflects local context: warm, optimistic, modern. |
| **Confident, not corporate** | We build for businesses that are tired of bloated foreign software. The tone is direct and warm, not stiff. |
| **Modern + grounded** | Deep purple type + soft lavender backgrounds give a tech-forward feel; warm orange CTAs keep it human. |

---

## 2. Color Palette

All colors are CSS custom properties defined in [`src/app/globals.css`](src/app/globals.css). Reference them by variable — never hard-code hex values in component CSS.

The palette has **one primary brand color (warm orange)** plus two supporting accents (deep purple and blue). Text and headings are a very dark navy with a faint purple undertone — close to Intercept Intelligence's heading treatment.

### 2.1 Foundation

| Token | Hex | Use |
| ----- | --- | --- |
| `--background` | `#F4F2FB` | Page background (soft lavender) |
| `--surface` | `#FFFFFF` | Cards, forms, navbar when scrolled |
| `--surface-2` | `#FAF8FE` | Alternate section background (Products, Contact) |
| `--surface-3` | `#F0EDF9` | Subtle panel / tag background |

### 2.2 Brand — Warm Orange (Primary)

The dominant brand color. Used for the logo mark gradient, eyebrows, primary CTAs, and active states. If you only see one accent color on a section, it should be this one.

| Token | Hex | Use |
| ----- | --- | --- |
| `--brand` | `#FF6B2C` | Logo gradient, eyebrows, CTAs, active states |
| `--brand-hover` | `#E8581E` | Hover state on primary buttons & eyebrows |
| `--brand-deep` | `#C44615` | Deepest orange, for pressed states / strong shadows |
| `--brand-dim` | `rgba(255, 107, 44, 0.10)` | Eyebrow background, soft-orange highlights |
| `--brand-border` | `rgba(255, 107, 44, 0.22)` | Subtle orange border on eyebrows / pills |
| `--brand-shadow` | `rgba(255, 107, 44, 0.30)` | Drop shadow under CTA buttons & logo |

The legacy `--cta`, `--cta-hover`, `--cta-dim`, `--cta-border`, and `--cta-shadow` tokens are aliased to the brand orange — both names refer to the same color.

### 2.3 Accent — Deep Purple

A secondary accent. Used sparingly: paired with orange in the logo gradient and hero-title gradient, and for purple-tinted hover states on product/portfolio cards.

| Token | Hex | Use |
| ----- | --- | --- |
| `--primary` | `#6D3FE8` | Logo gradient end, card hover borders, link hover |
| `--primary-hover` | `#5A2DD0` | Deeper purple on hover |
| `--primary-dim` | `rgba(109, 63, 232, 0.10)` | Soft purple background for product/portfolio badges & tags |
| `--primary-border` | `rgba(109, 63, 232, 0.22)` | Subtle purple border on cards / pills |
| `--primary-shadow` | `rgba(109, 63, 232, 0.28)` | Drop shadow for purple-themed lifts |

### 2.4 Accent — Blue

Used very sparingly — only in soft decorative background gradients (the `/build` hero glow and the footer CTA band). Not used in typography or interactive states.

| Token | Hex | Use |
| ----- | --- | --- |
| `--accent` | `#2E5BFF` | Decorative dots/blobs only |
| `--accent-dim` | `rgba(46, 91, 255, 0.10)` | Soft-blue decorative tints |
| `--accent-border` | `rgba(46, 91, 255, 0.22)` | Subtle blue borders on shapes |

### 2.5 Text

| Token | Hex | Use |
| ----- | --- | --- |
| `--text-primary` | `#1F1A36` | Headings & body — deep navy with a faint purple undertone |
| `--text-secondary` | `#5A5170` | Subheadings, paragraph copy |
| `--text-tertiary` | `#8B82A0` | Labels, captions, helper text |

### 2.6 Borders & Glass

| Token | Hex | Use |
| ----- | --- | --- |
| `--border` | `rgba(31, 26, 54, 0.08)` | Default borders on cards, inputs, dividers |
| `--border-hover` | `rgba(31, 26, 54, 0.16)` | Hover state borders |
| `--glass-bg` | `rgba(255, 255, 255, 0.65)` | Frosted-glass card backgrounds |
| `--glass-border-hover` | `rgba(255, 107, 44, 0.30)` | Orange-tinted border on hover |

---

## 3. Typography

Two webfonts (loaded from Google Fonts via `next/font` in [`src/app/layout.tsx`](src/app/layout.tsx)) plus a system monospace used for labels. **There is no serif anywhere in the system.**

| Role | Font | Weights | Token |
| ---- | ---- | ------- | ----- |
| Display / headings | **Poppins** | 600 – 800 | `--font-heading` |
| Body / UI | **Inter** | 400 – 700 | `--font-body` |
| Mono labels / spec | **System monospace** (SF Mono / JetBrains Mono / Menlo) | 500 | `--font-mono` |

### Type scale

| Element | Size | Weight | Line-height | Letter-spacing |
| ------- | ---- | ------ | ----------- | -------------- |
| Hero title (`h1`) | `clamp(2.2rem, 8vw, 5.5rem)` | 800 | 1.04 | −0.04em |
| Section heading (`h2`) | `clamp(2rem, 4vw, 3rem)` | 700 | 1.1 | −0.02em |
| Card title (`h3`) | 1.125 – 1.3rem | 700 – 800 | 1.2 | −0.01em |
| Body | 1rem | 400 | 1.7 | normal |
| Small / labels | 0.75 – 0.8125rem | 500 – 700 | 1.4 | 0.06 – 0.08em (uppercase) |

**Label / eyebrow styles** — there are two, and they don't mix within a single tier (there's a note to this effect in `globals.css`):

- **`.eyebrow`** — an **orange** rounded pill (`--brand` / `--brand-dim` / `--brand-border`), uppercase, 0.8rem. Marks an in-page section or a standard page header.
- **`.specLabel`** — a **monospace** kicker (`--font-mono`, tertiary grey, wide tracking, with a leading dash), uppercase, 0.72rem. Marks an editorial / page-level identity — e.g. the hero line "Digital solutions · Arusha, Tanzania" and the blog "journal" line.

---

## 4. Spacing & Layout

| Token | Value | Use |
| ----- | ----- | --- |
| `--container-width` | `1280px` | Max width of every `.container` wrapper |
| `--nav-height` | `72px` | Fixed navbar height; sections offset accordingly |

**Section padding:** `120px` top/bottom on desktop, `80px` on tablet, `64px` on phone. Use the `.section` utility class.

**Card padding:** `1.5rem – 2rem` depending on density. Use `border-radius: 16px` (cards) or `12px` (smaller elements like buttons).

---

## 5. Iconography & Logo

### Logo mark

The canonical mark is the **"U"** block, rendered as a CSS gradient: `linear-gradient(135deg, var(--brand), var(--primary))` — orange to deep purple. It appears in the Navbar and Footer; the favicon and Apple touch icon use the same gradient — see [`src/app/icon.tsx`](src/app/icon.tsx) and [`src/app/apple-icon.tsx`](src/app/apple-icon.tsx).

> **Standalone asset.** [`public/logo.png`](public/logo.png) is the orange→purple **"U"** mark (512px, exported from the Canva brand kit), matching the in-app mark. The full lockups — mark + "Ubunifu TECHNOLOGIES", and the tagline lockup with "Digital solutions, built for Tanzania." — live in a local `branding/` archive (high-res masters, kept out of git and synced to Drive). The retired blue→purple hexagon and "Technology. Strategy. Results." slogan are no longer in use.

### Icons

We use [lucide-react](https://lucide.dev) throughout. Default size is **20–22px** in nav/cards, **14–16px** in buttons. Stroke width is `2` (`2.5` for badges and "live" pulse dots).

---

## 6. Component Patterns

### 6.1 Buttons

| Variant | Background | Text | Use |
| ------- | ---------- | ---- | --- |
| **Primary CTA** | `--cta` (orange) | White | "Explore products", "Submit", footer CTA |
| **Secondary** | White / transparent | `--text-primary` with `--border-hover` | "Get in touch" alongside primary CTA |
| **Product CTA** | `--cta` (orange) | White | Product card "Try X" / "Learn more" buttons |

All primary buttons have:
- `border-radius: 12px`
- `padding: 0.875rem 1.75rem`
- `font-weight: 600`
- A colored drop-shadow (`box-shadow: 0 6px 20px var(--cta-shadow)`)
- Hover: `translateY(-2px)` + deeper shadow

### 6.2 Cards

White background, 1px border (`--border`), `16–18px` radius, subtle shadow (`0 1px 2px rgba(27, 14, 71, 0.04)`). On hover: purple border + lifted purple shadow + `translateY(-3px)`.

### 6.3 Badges & Pills

- **Eyebrow** (`.eyebrow` in `globals.css`): orange pill, uppercase, 0.8rem. Uses `--brand`/`--brand-dim`/`--brand-border`.
- **Status badges** ("Live", "Coming soon"): purple-dim styling, with an animated dot for live products. Purple here adds a second flavor to the card grid.
- **Tech tags** (Portfolio): purple pill with `--primary-dim` background and `--primary` text.

### 6.4 Animation

We use [framer-motion](https://www.framer.com/motion/) for component entrances. Standard pattern:

```tsx
initial={{ opacity: 0, y: 24 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: '-40px' }}
transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
```

CSS animations use the easing token `--ease-out-expo`. All animations are gated by `prefers-reduced-motion: reduce` in portfolio mockups.

---

## 7. Content Architecture

Page content lives in [`src/content/`](src/content/) — separated from presentation so non-technical edits don't require touching component code.

| File | Owns |
| ---- | ---- |
| `site.ts` | Company info, contact details, navigation links, footer columns |
| `services.tsx` | The five service pillars (`/build`) |
| `sectors.tsx` | Sectors / Industries — summary + offerings (`/industries`) |
| `pillars.tsx` | Home "Why Ubunifu" strip — 4 differentiators |
| `values.tsx` | "Why we exist" values in the About section |
| `about.tsx` | About narrative — vision, mission, objectives, approach |
| `products.tsx` | Products (Insight, Sifa, Rafiki, Build) |
| `portfolio.tsx` | Client projects + case studies (Safari King, Usambara) |
| `team.tsx` | Team member profiles (name, role, bio, skills) |
| `testimonials.tsx` | Client testimonials |

### How to update copy

1. Open the file under `src/content/` that matches the section.
2. Edit the strings or add/remove items in the exported array.
3. No component code needs to change — the section iterates over the data.

### How to add a new portfolio project

1. Append a new entry to `projects` in `src/content/portfolio.tsx`.
2. Set `logo` to the absolute URL of the client's logo on their live site (auto-updates if they rebrand).
3. If the logo is hosted on a new domain, add that hostname to `images.remotePatterns` in [`next.config.ts`](next.config.ts).
4. Pick `logoBg` (light brand-tinted hex) and `accent` (brand-colored hex) for the mockup.

---

## 8. File Structure

```
src/
├── app/                   # Next.js App Router
│   ├── globals.css        # CSS custom properties (design tokens)
│   ├── layout.tsx         # Root layout + fonts + JSON-LD
│   ├── page.tsx           # Homepage (highlight-reel previews)
│   ├── icon.tsx           # Favicon (generated, orange→purple "U")
│   ├── apple-icon.tsx     # Apple touch icon (generated)
│   ├── opengraph-image.tsx  # Default Open Graph card
│   ├── sitemap.ts         # sitemap.xml
│   ├── not-found.tsx      # Branded 404
│   ├── build/             # /build — Services
│   ├── industries/        # /industries — sectors we serve
│   ├── work/              # /work and /work/[slug] — case studies
│   ├── products/          # /products — our SaaS (proof)
│   ├── about/             # /about — vision, mission, story, team
│   ├── blog/              # /blog and /blog/[slug]
│   ├── careers/           # /careers (footer link)
│   ├── contact/           # /contact — the single form
│   └── api/contact/       # POST /api/contact (Resend + bot protection)
│
├── components/            # Section + UI components (co-located CSS Modules)
│   ├── Navbar · Footer · WhatsAppButton          — chrome
│   ├── Hero · CodeWindow · Topography            — hero + signature visuals
│   ├── ProblemStrip · HomePreviews · Insights    — homepage sections
│   ├── Spotlight                                 — alternating feature rows (Services + Industries)
│   ├── Products · Portfolio · Testimonial · CtaBand
│   ├── About · Team · TechMarquee · PageHeader
│   ├── BlogIndex · ReadingProgress               — blog
│   ├── Contact · SelectField                     — contact form
│   └── ScrollReveal · SmoothScroll · MotionCard · BuildCards   — motion helpers
│
├── content/               # Editable page data — no JSX logic
│   ├── site.ts            # company info, nav, footer
│   ├── services.tsx       # five service pillars
│   ├── sectors.tsx        # industries / sectors
│   ├── pillars.tsx        # home "Why Ubunifu" strip
│   ├── values.tsx         # about values
│   ├── about.tsx          # about narrative
│   ├── products.tsx       # products (proof)
│   ├── portfolio.tsx      # client projects + case studies
│   ├── team.tsx           # team profiles
│   └── testimonials.tsx   # client testimonials
│
└── lib/
    └── blog.ts            # Blog post data + helpers
```

### Why this structure?

- **Sections own their styles.** Each component has a co-located CSS module — touch one section without affecting others.
- **Content is data.** Copy, lists, and URLs live in `src/content/`, so marketing edits don't risk breaking layout.
- **Design tokens are the single source of truth.** Every color, font, and spacing value lives in `globals.css`. Components reference tokens, never hex values.

---

## 9. Adding a new section

1. Create `src/components/MySection.tsx` and `src/components/MySection.module.css`.
2. If the section has list content, create `src/content/mysection.tsx` with the data.
3. Import and place in [`src/app/page.tsx`](src/app/page.tsx) (or the relevant page).
4. Use the shared utility classes from `globals.css`: `.container`, `.section`, `.eyebrow`, `.sectionHeading`, `.sectionSubtext`.
5. Reference design tokens (`var(--primary)`, `var(--cta)`, etc.) — no hardcoded colors.

---

## 10. Accessibility Conventions

- All animations respect `prefers-reduced-motion: reduce` (see `Portfolio.module.css` and `ScrollReveal.module.css`).
- Decorative elements (auroras, dots, cursors) have `aria-hidden="true"`.
- Color contrast: text-primary (`#1F1A36`) on background (`#F4F2FB`) — passes WCAG AA at all body sizes.
- Focus states use a 3px purple-dim outline on form fields.

---

## 11. Quick Reference

```css
/* Page background */
background: var(--background);

/* Headings (dark navy with purple undertone) */
color: var(--text-primary);
font-family: var(--font-heading);

/* CTA button (orange) */
background: var(--brand);
box-shadow: 0 6px 20px var(--brand-shadow);

/* Card */
background: #FFFFFF;
border: 1px solid var(--border);
border-radius: 16px;
box-shadow: 0 1px 2px rgba(31, 26, 54, 0.04);

/* Eyebrow (orange pill) */
color: var(--brand);
background: var(--brand-dim);

/* Logo gradient (orange to purple) */
background: linear-gradient(135deg, var(--brand), var(--primary));
```

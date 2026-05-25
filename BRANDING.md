# Ubunifu Technologies — Brand & Design System

The visual system for the Ubunifu Technologies website. This is the source of truth — if you're changing colors, fonts, or component patterns, update this document and the relevant CSS variables together.

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

### 2.1 Foundation

| Token | Hex | Use |
| ----- | --- | --- |
| `--background` | `#F4F2FB` | Page background (soft lavender) |
| `--surface` | `#FFFFFF` | Cards, forms, navbar when scrolled |
| `--surface-2` | `#FAF8FE` | Alternate section background (Products, Contact) |
| `--surface-3` | `#F0EDF9` | Subtle panel / tag background |

### 2.2 Primary — Deep Purple

The standout color in text. Used for headings (`#1B0E47`), eyebrow labels, badges, in-line accents, link hovers.

| Token | Hex | Use |
| ----- | --- | --- |
| `--primary` | `#6D3FE8` | Eyebrows, badges, accent text, link hover |
| `--primary-hover` | `#5A2DD0` | Hover state on purple links |
| `--primary-deep` | `#3D1FA0` | Deepest purple, used in `::selection` |
| `--primary-dim` | `rgba(109, 63, 232, 0.10)` | Soft purple background for pills / icon wrappers |
| `--primary-border` | `rgba(109, 63, 232, 0.22)` | Subtle purple border on hover or pills |
| `--primary-shadow` | `rgba(109, 63, 232, 0.28)` | Drop shadow for purple-themed lifts |

### 2.3 Accent — Blue

Secondary brand color. Paired with purple in gradients (logo mark, hero title) and used sparingly on its own.

| Token | Hex | Use |
| ----- | --- | --- |
| `--accent` | `#2E5BFF` | Logo gradient end, secondary highlights |
| `--accent-hover` | `#1F47E0` | Hover state when used as link |
| `--accent-dim` | `rgba(46, 91, 255, 0.10)` | Backgrounds for blue-tinted decorations |
| `--accent-border` | `rgba(46, 91, 255, 0.22)` | Subtle blue borders |

### 2.4 CTA — Warm Orange

Reserved for primary calls-to-action: "Explore products", "Get in touch", form submit, hero/footer CTAs. Never use it for body text or links.

| Token | Hex | Use |
| ----- | --- | --- |
| `--cta` | `#FF6B2C` | Primary buttons |
| `--cta-hover` | `#E8581E` | Hover state on primary buttons |
| `--cta-shadow` | `rgba(255, 107, 44, 0.30)` | Drop shadow under CTA buttons |

### 2.5 Text

| Token | Hex | Use |
| ----- | --- | --- |
| `--text-primary` | `#1B0E47` | Headings & body — the deep purple-navy "standout" color |
| `--text-secondary` | `#5B4E8C` | Subheadings, paragraph copy |
| `--text-tertiary` | `#8B82B0` | Labels, captions, helper text |

### 2.6 Borders & Glass

| Token | Hex | Use |
| ----- | --- | --- |
| `--border` | `rgba(27, 14, 71, 0.08)` | Default borders on cards, inputs, dividers |
| `--border-hover` | `rgba(27, 14, 71, 0.16)` | Hover state borders |
| `--glass-bg` | `rgba(255, 255, 255, 0.65)` | Frosted-glass card backgrounds |
| `--glass-border-hover` | `rgba(109, 63, 232, 0.30)` | Purple-tinted border on hover |

---

## 3. Typography

Two typefaces, loaded from Google Fonts via `next/font` in [`src/app/layout.tsx`](src/app/layout.tsx).

| Role | Font | Weights | Token |
| ---- | ---- | ------- | ----- |
| Display / headings | **Outfit** | 600 – 800 | `--font-heading` |
| Body / UI | **Inter** | 400 – 700 | `--font-body` |

### Type scale

| Element | Size | Weight | Line-height | Letter-spacing |
| ------- | ---- | ------ | ----------- | -------------- |
| Hero title (`h1`) | `clamp(2.75rem, 7vw, 5.5rem)` | 800 | 1.02 | −0.04em |
| Section heading (`h2`) | `clamp(2rem, 4vw, 3rem)` | 700 | 1.1 | −0.02em |
| Card title (`h3`) | 1.125 – 1.3rem | 700 – 800 | 1.2 | −0.01em |
| Body | 1rem | 400 | 1.7 | normal |
| Small / labels | 0.75 – 0.8125rem | 500 – 700 | 1.4 | 0.06 – 0.08em (uppercase) |

**Eyebrow labels** (small uppercase text above headings) use the `.eyebrow` utility class in `globals.css`. Always purple, always rounded-pill background.

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

The "U" mark is rendered as a CSS gradient block: `linear-gradient(135deg, var(--primary), var(--accent))`. It appears in the Navbar, Footer, and email templates. Favicon and Apple touch icon use the same gradient — see [`src/app/icon.tsx`](src/app/icon.tsx) and [`src/app/apple-icon.tsx`](src/app/apple-icon.tsx).

### Icons

We use [lucide-react](https://lucide.dev) throughout. Default size is **20–22px** in nav/cards, **14–16px** in buttons. Stroke width is `2` (`2.5` for badges and "live" pulse dots).

---

## 6. Component Patterns

### 6.1 Buttons

| Variant | Background | Text | Use |
| ------- | ---------- | ---- | --- |
| **Primary CTA** | `--cta` (orange) | White | "Explore products", "Submit", footer CTA |
| **Secondary** | White / transparent | `--text-primary` with `--border-hover` | "Get in touch" alongside primary CTA |
| **Live (purple)** | Currently the orange `--cta` | White | Product card "Try X" buttons |

All primary buttons have:
- `border-radius: 12px`
- `padding: 0.875rem 1.75rem`
- `font-weight: 600`
- A colored drop-shadow (`box-shadow: 0 6px 20px var(--cta-shadow)`)
- Hover: `translateY(-2px)` + deeper shadow

### 6.2 Cards

White background, 1px border (`--border`), `16–18px` radius, subtle shadow (`0 1px 2px rgba(27, 14, 71, 0.04)`). On hover: purple border + lifted purple shadow + `translateY(-3px)`.

### 6.3 Badges & Pills

- **Eyebrow** (`.eyebrow` in `globals.css`): purple pill, uppercase, 0.8rem.
- **Status badges** ("Live", "Coming soon"): same purple-dim styling, with an animated dot for live products.
- **Tech tags** (Portfolio): purple pill with primary-dim background and primary text.

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
| `pillars.tsx` | Three-up strip below the hero (Products / Consulting / Approach) |
| `values.tsx` | "Why we exist" cards in the About section |
| `products.tsx` | Product bento grid (Insight, Sifa, Rafiki, Build) |
| `portfolio.tsx` | Client projects (logo URLs, brand colors, descriptions) |

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
├── app/                   # Next.js App Router pages
│   ├── globals.css        # CSS custom properties (design tokens)
│   ├── layout.tsx         # Root layout + fonts + JSON-LD
│   ├── page.tsx           # Homepage (composes sections)
│   ├── build/             # /build page
│   ├── blog/              # /blog and /blog/[slug]
│   ├── careers/           # /careers
│   ├── api/contact/       # POST /api/contact (Resend email)
│   ├── icon.tsx           # Favicon (generated)
│   ├── apple-icon.tsx     # Apple touch icon (generated)
│   └── sitemap.ts         # sitemap.xml
│
├── components/            # One folder per section / UI element
│   ├── Navbar.tsx + .module.css
│   ├── Hero.tsx + .module.css
│   ├── ProblemStrip.tsx + .module.css
│   ├── Products.tsx + .module.css
│   ├── About.tsx + .module.css
│   ├── Portfolio.tsx + .module.css   # animated browser mockups
│   ├── Contact.tsx + .module.css
│   ├── Footer.tsx + .module.css
│   ├── WhatsAppButton.tsx + .module.css
│   ├── ScrollReveal.tsx              # scroll-triggered reveals
│   ├── SmoothScroll.tsx              # Lenis smooth scroll
│   ├── MotionCard.tsx                # animated card wrapper
│   └── BuildCards.tsx                # MotionCard list wrapper
│
├── content/               # Editable page data — no JSX logic
│   ├── site.ts
│   ├── pillars.tsx
│   ├── values.tsx
│   ├── products.tsx
│   └── portfolio.tsx
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
- Color contrast: text-primary (`#1B0E47`) on background (`#F4F2FB`) — passes WCAG AA at all body sizes.
- Focus states use a 3px purple-dim outline on form fields.

---

## 11. Quick Reference

```css
/* Page background */
background: var(--background);

/* Headings */
color: var(--text-primary);
font-family: var(--font-heading);

/* CTA button */
background: var(--cta);
box-shadow: 0 6px 20px var(--cta-shadow);

/* Card */
background: #FFFFFF;
border: 1px solid var(--border);
border-radius: 16px;
box-shadow: 0 1px 2px rgba(27, 14, 71, 0.04);

/* Eyebrow / accent text */
color: var(--primary);
```

# Ubunifu Technologies Website

Official website for **Ubunifu Technologies** — a Tanzania-based digital-solutions agency.

**Digital solutions, built for Tanzania.**

---

## About

Ubunifu Technologies is a digital-solutions agency in Arusha. We design, build, host, and run
web, data, AI, and branding for organisations across Tanzania — built around how this market
actually works. We pair genuine engineering depth (cloud, data, modern AI, full-stack web)
with a close read of the local market, and we stay on to run what we ship.

For the full positioning, voice, and messaging, see [`POSITIONING.md`](POSITIONING.md).

### What we offer

**Services** (`/build`) — six pillars:
Digital Presence & Web · Hosting, Domains & Email · Branding & Graphic Design ·
Data Analytics & BI · Intelligent Automation & AI · Digital Strategy & Consulting.

**Products** (`/products`) — our own SaaS, as proof:
- **Ubunifu Insight** — *live* · document AI with Swahili-speaking agents (`insight.ubunifutech.com`)
- **Ubunifu Sifa** — *live* · business management with credit-selling built in (`sifa.ubunifutech.com`)
- **Ubunifu Rafiki** — *coming soon* · embeddable widgets (forms, booking, blog)
- **Ubunifu Build** — custom software & consulting

**Industries** (`/industries`) — equipped to serve eight sectors. Tourism & Hospitality is
*proven* (Safari King Africa, Usambara Destination); SMEs/Retail, Finance, NGOs, Healthcare,
Agriculture, Education, and Government are *targeted* (capability, not claimed clients).

---

## Tech stack

- **Framework:** Next.js 16 (App Router) · React 19
- **Language:** TypeScript
- **Styling:** CSS Modules + design tokens in [`src/app/globals.css`](src/app/globals.css)
- **Fonts:** Poppins (headings) · Inter (body) — via `next/font`
- **Animation:** Framer Motion · Lenis smooth scroll (reduced-motion gated)
- **Icons:** `lucide-react` (UI) · `react-icons` (tech logos)
- **Content:** Markdown blog (`gray-matter` + `react-markdown`)
- **Email:** Resend (contact form), with honeypot + timing + rate-limit bot protection

---

## Getting started

### Prerequisites
- Node.js 18+
- npm (or yarn / pnpm / bun)

### Install & run

```bash
git clone https://github.com/rapaugustino/ubunifu-tech-website.git
cd ubunifu-tech-website
npm install

npm run dev      # http://localhost:3000
```

### Build for production

```bash
npm run build
npm start
```

The contact form needs a `RESEND_API_KEY` in `.env.local` to send mail; without it the API
degrades gracefully (it logs and returns success rather than crashing).

---

## Project structure

```
ubunifu-tech-website/
├── public/                  # Static assets (logo.png, robots.txt, work/ + about/ images)
├── _posts/                  # Blog posts (Markdown — 7 published)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout: fonts (Poppins + Inter), metadata, JSON-LD
│   │   ├── page.tsx         # Home
│   │   ├── globals.css      # Design tokens (CSS variables) + base styles
│   │   ├── icon.tsx         # Generated favicon — orange→purple "U" mark
│   │   ├── apple-icon.tsx   # Generated Apple touch icon
│   │   ├── build/           # /build — Services
│   │   ├── industries/      # /industries — sectors we serve
│   │   ├── work/            # /work + /work/[slug] — client case studies
│   │   ├── products/        # /products — our SaaS (proof)
│   │   ├── about/           # /about — vision, mission, story, team
│   │   ├── blog/            # /blog + /blog/[slug]
│   │   ├── careers/         # /careers (footer link)
│   │   ├── contact/         # /contact — the single form
│   │   └── api/contact/     # POST /api/contact (Resend + bot protection)
│   ├── components/          # Section + UI components (co-located CSS Modules)
│   ├── content/             # Editable page data — no JSX logic (see below)
│   └── lib/blog.ts          # Blog data helpers
├── BRANDING.md              # Visual system: colors, type, components
├── POSITIONING.md           # Who we are, services, sectors, voice
├── WEBSITE_CONTENT.md       # "Site as built" reference / page map
├── PROJECT_ROADMAP.md       # Development roadmap
├── SITE_IMPROVEMENTS.md     # Changelog
└── README.md                # This file
```

**Content is data.** Copy and lists live in [`src/content/`](src/content/) so marketing edits
don't touch component code: `site.ts` (company info, nav, footer), `services.tsx`,
`sectors.tsx`, `pillars.tsx`, `values.tsx`, `about.tsx`, `products.tsx`, `portfolio.tsx`,
`team.tsx`, `testimonials.tsx`.

---

## Brand

Light, warm, modern: a soft lavender background (`#F4F2FB`), a warm-orange primary
(`#FF6B2C`), and a deep-purple accent (`#6D3FE8`) on deep-navy text (`#1F1A36`). The logo is
the orange→purple **"U"** mark (`linear-gradient(135deg, var(--brand), var(--primary))`),
rendered in the Navbar, Footer, and favicon.

Design tokens are the single source of truth — every color, font, and spacing value lives in
[`src/app/globals.css`](src/app/globals.css). See [`BRANDING.md`](BRANDING.md) for the full
system.

> **Note:** `public/logo.png` is the orange→purple "U" mark (512px, exported from the Canva
> brand kit). The full lockups (mark + "Ubunifu TECHNOLOGIES", and the tagline lockup) live in
> a local `branding/` archive that is kept out of git and synced to Drive.

---

## Documentation

| Doc | Owns |
|---|---|
| [`POSITIONING.md`](POSITIONING.md) | Vision, mission, services, sectors, approach, voice |
| [`BRANDING.md`](BRANDING.md) | Visual system: colors, type, component patterns, tokens |
| [`WEBSITE_CONTENT.md`](WEBSITE_CONTENT.md) | "Site as built" — page map, where each piece of content lives |
| [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md) | Development roadmap (phases + status) |
| [`SITE_IMPROVEMENTS.md`](SITE_IMPROVEMENTS.md) | Running changelog of site work |

---

## Contact

- **Website:** [ubunifutech.com](https://ubunifutech.com)
- **Email:** info@ubunifutech.com
- **Phone / WhatsApp:** +255 748 548 816
- **Location:** Arusha, Tanzania

---

© 2026 Ubunifu Technologies. All rights reserved.

**Built in Arusha, Tanzania.**

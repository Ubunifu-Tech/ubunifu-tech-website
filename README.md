# Ubunifu Technologies Website

Official website for **Ubunifu Technologies** — an Arusha-based consulting company and product studio.

**Consulting + products, built in Tanzania.**

---

## About

Ubunifu advises, designs, builds, hosts, and operates brand, web, software, data, and AI
systems for Tanzanian organisations. Alongside client work, the studio builds software
products around repeatable local workflows. Consulting keeps the team close to specific
problems; product work turns those lessons into reusable tools.

For the full positioning, voice, and messaging, see [`POSITIONING.md`](POSITIONING.md).

### What we offer

**Consulting services** (`/build`) — six connected capabilities:
Digital Presence & Web · Hosting, Domains & Email · Branding & Graphic Design ·
Data Analytics & BI · Intelligent Automation & AI · Digital Strategy & Consulting.

**Products** (`/products`) — software built and operated by Ubunifu:
- **Ubunifu Insight** — *available* · document AI with cited answers, extraction, templates, and multilingual agents (`insight.ubunifutech.com`)
- **Ubunifu Sifa** — *available* · sales, inventory, supplier, customer, and credit-ledger workflows in TZS (`sifa.ubunifutech.com`)
- **Ubunifu Rafiki** — *coming soon* · embeddable widgets (forms, booking, blog)

**Work** (`/work`) — named client case studies for Safari King Africa and Usambara
Destination. Product availability does not imply customer counts or adoption claims.

**Industries** (`/industries`) — equipped to serve eight sectors. Tourism & Hospitality is
*proven* through the named work above. SMEs/Retail, Finance, NGOs, Healthcare, Agriculture,
Education, and Government are potential capability fits, not claimed client experience.

---

## Tech stack

- **Framework:** Next.js 16 (App Router) · React 19
- **Language:** TypeScript
- **Styling:** CSS Modules + design tokens in [`src/app/globals.css`](src/app/globals.css)
- **Fonts:** Poppins (headings) · Inter (body) — via `next/font`
- **Animation:** Framer Motion · Lenis smooth scroll (reduced-motion gated)
- **Icons:** `lucide-react` (UI) · `react-icons` (tech logos)
- **Content:** Markdown blog (`gray-matter` + `react-markdown`)
- **Email:** Resend (contact form), with honeypot + bounded rate-limit protection

---

## Getting started

### Prerequisites

- Node.js 20.9 or newer (required by Next.js 16)
- npm, using the committed `package-lock.json`

### Install & run

```bash
git clone https://github.com/rapaugustino/ubunifu-tech-website.git
cd ubunifu-tech-website
npm ci
cp .env.example .env.local

npm run dev      # http://localhost:3000
```

The site renders without email credentials, but the contact endpoint needs the
server-only `RESEND_API_KEY` described below before it can accept messages.

### Environment variables and Resend

| Variable | Scope | Purpose |
|---|---|---|
| `RESEND_API_KEY` | Server only | Sends the contact-form notification and acknowledgement emails through Resend. |

To enable the contact form:

1. Verify `ubunifutech.com` as a sending domain in Resend and create an API key
   with permission to send from that domain.
2. Copy `.env.example` to `.env.local` and replace its placeholder value.
3. Restart the development server after changing `.env.local`.
4. Add `RESEND_API_KEY` as a secret environment variable in the production host;
   do not commit it or prefix it with `NEXT_PUBLIC_`.

The route sends team notifications from `notifications@ubunifutech.com` to
`info@ubunifutech.com` and sends acknowledgements from the same verified domain.
If the key is missing, `POST /api/contact` returns `503` and the form directs the
visitor to email `info@ubunifutech.com` instead. See `.env.example` for the safe
placeholder format.

The application includes a bounded, process-local contact throttle as a safe
fallback. Configure a distributed rule for `/api/contact` in the
[Vercel WAF](https://vercel.com/docs/vercel-firewall/vercel-waf) as well,
because separate server instances do not share in-memory counters.

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Next.js development server. |
| `npm run build` | Create a production build. |
| `npm start` | Serve an existing production build. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run check` | Run lint and type-check validation together. |

### Build for production

```bash
npm run build
npm start
```

---

## Project structure

```
ubunifu-tech-website/
├── public/
│   ├── brand/              # Canonical Ubunifu Ligature SVG marks and lockups
│   ├── editorial/          # Tactile editorial concept images
│   ├── work/               # Real client and product screenshots
│   ├── logo-v2.png         # Social/avatar raster of the Ligature
│   └── og.png              # Default social preview
├── _posts/                  # Blog posts in Markdown
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout: fonts (Poppins + Inter), metadata, JSON-LD
│   │   ├── page.tsx         # Home
│   │   ├── globals.css      # Design tokens (CSS variables) + base styles
│   │   ├── icon.tsx         # Generated Ubunifu Ligature favicon
│   │   ├── apple-icon.tsx   # Generated Ubunifu Ligature touch icon
│   │   ├── build/           # /build — Services
│   │   ├── industries/      # /industries — sectors we serve
│   │   ├── work/            # /work + /work/[slug] — client case studies
│   │   ├── products/        # /products — Ubunifu software products
│   │   ├── about/           # /about — vision, mission, story, team
│   │   ├── blog/            # /blog + /blog/[slug]
│   │   ├── brand/           # /brand — live brand kit and asset downloads
│   │   ├── careers/         # /careers (footer link)
│   │   ├── contact/         # /contact — the single form
│   │   ├── privacy/         # /privacy — contact and careers privacy notice
│   │   └── api/contact/     # POST /api/contact (Resend + bot protection)
│   ├── components/          # Section + UI components (co-located CSS Modules)
│   ├── content/             # Editable page data — no JSX logic (see below)
│   └── lib/                 # Blog, email, metadata, and social-image helpers
├── .env.example             # Safe server-environment template
├── BRANDING.md              # Ligature, palette, type, and editorial image system
├── POSITIONING.md           # Company model, offers, claim boundaries, voice
├── WEBSITE_CONTENT.md       # "Site as built" reference / page map
├── PROJECT_ROADMAP.md       # Development roadmap
├── SITE_IMPROVEMENTS.md     # Changelog
├── next.config.ts           # Next.js configuration and security headers
└── README.md                # This file
```

**Content is data.** Copy and lists live in [`src/content/`](src/content/) so marketing edits
don't touch component code: `site.ts` (company info, nav, footer), `services.tsx`,
`sectors.tsx`, `pillars.tsx`, `values.tsx`, `about.tsx`, `products.tsx`, `portfolio.tsx`,
`team.tsx`, `testimonials.tsx`.

---

## Brand

Light, warm, modern: a soft lavender background (`#F4F2FB`), a warm-orange primary
(`#FF6B2C`), and a deep-purple accent (`#6D3FE8`) on deep-navy text (`#1F1A36`). The
canonical logo is the **Ubunifu Ligature**: a custom interlocking U/T glyph with an orange U,
a purple T, and a rising angled T crown. Its full lockup spells **Ubunifu Technologies** on one
baseline. The master mark uses two solid colors; orange-to-purple gradients are a separate
device for large paths, headlines, and atmospheres. The company tagline remains supporting copy,
never part of the navigation or logo lockup.

Design tokens are the single source of truth — every color, font, and spacing value lives in
[`src/app/globals.css`](src/app/globals.css). See [`BRANDING.md`](BRANDING.md) for the full
system, [`public/brand/`](public/brand/) for canonical SVG assets, and
[`/brand`](https://ubunifutech.com/brand) for the shareable brand kit and downloads.
`public/logo-v2.png` is the social avatar and `public/og.png` is the default social preview.

---

## Documentation

| Doc | Owns |
|---|---|
| [`POSITIONING.md`](POSITIONING.md) | Company model, services, products, sectors, claim boundaries, and voice |
| [`BRANDING.md`](BRANDING.md) | Ubunifu Ligature, palette and contrast, typography, editorial imagery, and asset paths |
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

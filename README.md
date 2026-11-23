# Ubunifu Technologies Website

Official website for **Ubunifu Technologies**, a Tanzanian technology consultancy that also builds and operates products.

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
Websites & Custom Platforms · Hosting, Domains & Email · Brand Identity & Design ·
Data & Business Intelligence · AI & Automation · Technology Strategy & Advisory.

**Products** (`/products`) — software built and operated by Ubunifu:
- **Ubunifu Sifa** — *available* · sales, inventory, supplier, customer, and credit-ledger workflows in TZS (`sifa.ubunifutech.com`)
- **Ubunifu Rafiki** — *coming soon* · embeddable widgets (forms, booking, blog)

**Work** (`/work`) — named client case studies for Safari King Africa and Usambara
Destination. Product availability does not imply customer counts or adoption claims.

**Industries** (`/industries`) — Tourism & Hospitality is *proven* through the named work
above. SMEs/Retail, Finance, NGOs, Healthcare, Agriculture, Education, and Government are
presented as potential workflow fits, not claimed client experience.

---

## Tech stack

- **Framework:** Next.js 16 (App Router) · React 19
- **Language:** TypeScript
- **Styling:** CSS Modules + design tokens in [`src/app/globals.css`](src/app/globals.css)
- **Fonts:** Poppins (headings) · Inter (body) — via `next/font`
- **Animation:** Framer Motion · Lenis smooth scroll (reduced-motion gated)
- **Shaders:** `@paper-design/shaders-react` — ambient WebGL layer, dynamically imported and device-gated
- **Icons:** `lucide-react`
- **Content:** Markdown blog (`gray-matter` + `react-markdown`)
- **Email:** Resend (contact form), with honeypot + bounded rate-limit protection

---

## Getting started

### Prerequisites

- Node.js 20.9 or newer (required by Next.js 16)
- npm, using the committed `package-lock.json`
- Postgres 18 running locally (Postgres.app is the simplest on a Mac)

### Install & run

```bash
git clone https://github.com/rapaugustino/ubunifu-tech-website.git
cd ubunifu-tech-website
npm ci
cp .env.example .env     # then fill in DATABASE_URL and CONSOLE_SESSION_SECRET
createdb ubunifu_console_dev
npm run db:migrate       # creates the tables
npm run db:seed          # an owner, plan templates, terms, products and one sample client
npx tsx scripts/import-posts.mts   # copies the blog posts in _posts/ into the database

npm run dev -- --port 3001
```

The site is then on http://localhost:3001 and the staff console on
http://admin.localhost:3001. Keep the variables in `.env`: Prisma, the migration
script and every check script read only that file.

The site renders without email credentials. Without `RESEND_API_KEY` a
contact form message is still saved under Enquiries in the console but no email
goes out, and in development the console and portal print their sign-in links
in the dev server's terminal rather than sending them.

### Environment variables and Resend

Every variable the code reads is listed in `.env.example`, with its default and
what it does. A production deploy stops unless `DATABASE_URL`,
`CONSOLE_SESSION_SECRET` and `RESEND_API_KEY` are set in Vercel's Production
environment. Set `DATABASE_URL` for Production only: preview builds skip
migrations, and a preview that can see it would read and write the live
database.

To enable the contact form:

1. Verify `ubunifutech.com` as a sending domain in Resend and create an API key
   with permission to send from that domain.
2. Copy `.env.example` to `.env` and replace its placeholder value.
3. Restart the development server after changing `.env`.
4. Add `RESEND_API_KEY` as a secret environment variable in the production host;
   do not commit it or prefix it with `NEXT_PUBLIC_`.

The route sends team notifications from `notifications@ubunifutech.com` to
`info@ubunifutech.com` and sends acknowledgements from the same verified domain.
If the key is missing, the message is still saved in the console. Only when it
cannot be saved either does `POST /api/contact` return `503` and the form direct
the visitor to email `info@ubunifutech.com` instead. See `.env.example` for the
safe placeholder format.

The contact form is throttled per network address and per email address. The
counts are kept in the database (`RateLimitHit`, see
`src/lib/console/rate-limit.ts`), so they hold across server instances. A rule
for `/api/contact` in the
[Vercel WAF](https://vercel.com/docs/vercel-firewall/vercel-waf) is an optional
extra layer.

### Ubunifu Copilot

The console's agent, and a screen of its own (`/copilot`): the person's chats
down the side, the conversation in the middle, and what it is showing open
beside it. The Copilot button in the top band opens it from anywhere. It can
read records, show them and lay out changes; it cannot change anything itself.
Its name is one constant, `src/lib/console/staff-agent/identity.ts`.

- **It knows where you came from.** Opened from a record's own page (a
  project, client, document or invoice), it carries that record along: the
  record is read and given to it each turn, so "this" needs no lookup, and it
  is open beside the conversation until something else is shown.
- **It answers with the record.** The `show` tool opens a record as a card, or
  a project's fees, invoices, documents or billable lines as a table
  (`staff-agent/cards.ts`). `list_work` gives a table across every client:
  unsettled invoices, open projects, unsigned documents. Every value in these
  is read from the database: the model only says which. A card carries a
  button to the next step a person takes, such as the Send step.
- **It can put a view together.** `compose_view` builds a view from a fixed
  set of blocks (text, figures, a table, record cards) for a question no one
  record answers, such as a briefing before a call. Record blocks are filled
  in from the records. The text, figures and rows are the model's own, so the
  view says so and lists the records it read to check against.
- **It drafts documents.** `revise_document` writes or rewrites a proposal or
  agreement as a new version. It is a plan step: the person is shown what
  changes, block by block, beside the conversation, and it is saved only on
  Confirm. If someone edits the document in between, the step refuses. How
  documents are written (voice, layout, the shape of each kind, what an agent
  may never write) is `DRAFTING_RULES` in `src/lib/console/copilot.ts`, and
  `drafting_brief` gives it the project's facts. The Write step of a document
  opens Copilot on it. There is no separate drafting assistant.
- **Everything is on record.** Chats are kept when a new one is started. The
  Copilot page (`/copilot`) lists a person's chats and plans, with what each
  plan made; a past chat can be carried on. An owner can read everyone's and
  sees what every agent used this month. Plans laid out, confirmed and
  discarded are in Activity.
- **It can be told how to work.** Settings, Copilot holds house instructions
  for each of the four agents (Copilot, document drafting, the website chat,
  the portal's Help) and the notes Copilot keeps in mind. Both live in the
  database (`AgentInstruction`, `AgentMemory`). Instructions are sent after
  the built-in rules and cannot widen them. A note from a chat is a plan step
  (`remember`), so it is saved only when a person confirms.

- **Lookups** (`src/lib/console/staff-agent/lookups.ts`) run as the person
  asking and show what their role shows them on the matching page.
- **Actions** (`src/lib/console/staff-agent/actions/`) are the whole list of
  what it can ask to have changed: add a client, send a portal invitation,
  start a project, add or rename a fee, draft a document, and draft an invoice
  from fees that can be billed now. Sending a document or an invoice, recording
  a payment, pausing or resuming hosting and removing anything are not on the
  list and stay with a person.
- **Plans** (`src/lib/console/staff-agent/plan.ts`): the model calls one tool,
  `propose_plan`. Each step is checked with the same rules as the console's
  forms, and the review table is written from the checked values, not from the
  model's words. Nothing runs until the person who asked presses Confirm, and
  every step is then checked again against their role and the records as they
  stand. A step can also pin the figures the person was shown (an invoice pins
  its lines, total and due date): if they have moved by the time of Confirm,
  the step is refused, not carried out with different numbers. A plan is stored
  in `AssistantPlan` and its outcome in Activity.

`npm run check:assistant -- --only=C` runs the assistant's live cases with the
key in `.env`: real lookups and real plans against the local database, none of
them confirmed, each in a thread that is deleted when its case ends.

To add an action, write a `PlanAction` (its fields, a `check` and a `run`) and
add it to `PLAN_ACTIONS` in `actions/index.ts`. The tool schema, the review
table and the permission check all read from that list.

The rules the forms and the assistant share live in
`src/lib/console/services/` (clients, projects, fees, documents, invoices). A
form action reads the form and calls the service; an assistant action reads the
tool input and calls the same service. Put a new rule in the service, never in
one caller.

All three chat endpoints (website, portal, console) refuse a POST from another
origin and read the body with a size limit (`src/lib/console/request-guards.ts`).

### Starting things, fees and who signs

- **New**, at the top of every page, starts a client, a project, a proposal or
  agreement (`/documents/new`: choose the project, then the kind), an invoice
  (`/invoices/new`: every project with something to invoice now) and a payment.
- **Lists open on what is still open.** Projects and Invoices open on an Open
  view, so a new deal or a draft invoice is in front of you.
- **A fee is one form.** Name, how it is billed, price, and the first payment
  date for a monthly or yearly fee; quantity, payment terms, a description and
  a status are under More. A fee with no price is priced in its own row.
- **Who signs** a document is chosen on its Send step when the client has more
  than one person. It is their main contact unless somebody else is picked
  (`Document.signerId`), and only someone with portal access can sign.

### Hosting links

A console project can be linked to the Vercel project that serves the client's
site, on the project page under Hosting. Owners can then pause that site for an
unpaid invoice and resume it.

- **Link**: an owner enters the Vercel project id (or its name). With
  `VERCEL_ACCESS_TOKEN` set it is looked up on Vercel first. The project this
  console itself runs on is refused.
- **Overdue notice**: on an overdue invoice's page, anyone who handles invoices
  records when and how the client was told. The console sends nothing; it keeps
  the record (`OverdueNotice`).
- **Pause** is offered only when an invoice on the project is overdue today and
  the client was given notice, after it fell due, at least 7 days ago
  (`NOTICE_DAYS`). The first notice starts the count; a later reminder does not
  restart it. It asks twice, then calls Vercel.
- **Resume** is always there for an owner while a site is paused. Once a payment
  is recorded after the pause, the invoice and the receipt offer it too. A
  payment never resumes anything by itself: a person presses the button.
- Linking, pausing, resuming and each failed attempt are in Activity.

The rule is `src/lib/console/hosting-rules.ts`, the Vercel calls are
`src/lib/console/hosting.ts`, and both are covered by `npm run check:hosting`.
The checks and writes are in `src/lib/console/services/hosting.ts`. The console
assistant has no action for any of this, and the check fails if one is added.
Railway is not linked: the console has no control over anything hosted there.

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Next.js development server. |
| `npm run build` | Checks production variables, runs the type-scale, editor round-trip and diff checks, applies migrations and reference data, then builds. |
| `npm start` | Serve an existing production build. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run check` | Runs lint, typecheck, `check:typography`, `check:editor`, `check:diff`, `check:dates`, `check:css` and `check:hosting`. None of them needs a database. |
| `npm run check:signatures`, `check:renewals`, `check:blog-parity`, `check:links`, `check:assistant` | The checks that need the database in `.env`. `check:links` also needs the dev server on port 3001, and `check:assistant` needs `ANTHROPIC_API_KEY`. |
| `npm run db:migrate` | Create and apply migrations on the local database. |
| `npm run db:seed` | Load an owner, plan templates, standard terms, products and one sample client into the local database. |
| `npm run db:deploy` | Apply pending migrations and reference data, the way a production build does. |

### Build for production

```bash
npm run build
npm start
```

### Releasing

Every push to `main` deploys to production.

- The build stops, and the previous deployment stays live, when a required
  Production variable is missing, or when the typography, editor or diff check
  fails. Preview builds skip migrations.
- Migrations only add things: new tables, and columns that are nullable or have
  a default. The previous deployment keeps serving while the new one builds, so
  a drop or rename waits for a later deploy, once no live code reads it.
- Take a manual backup in Railway before pushing a commit that has a migration.
- To roll back, use Vercel's Instant Rollback. Once a migration has shipped,
  never `git revert` or Redeploy an old commit: the rebuild's schema check sees
  the database is ahead of that code and stops the deploy.
- If a migration was wrong, fix it forward with a new one.

---

## Project structure

```
ubunifu-tech-website/
├── public/
│   ├── brand/              # Canonical Ubunifu Ligature SVG marks and lockups
│   ├── editorial/          # Subject-specific illustrations and labelled synthetic scenes
│   ├── logo-v2.png         # Navy social/avatar tile with the Ligature
│   ├── og.jpg              # Default social preview, 1200 × 630
│   └── og.png              # Campaign master the preview is cropped from
├── _posts/                  # Blog fallback for a build with no database
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
├── BRANDING.md              # Ligature mark, palette, type, and editorial image system
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
canonical logo is the original **Ubunifu Ligature**: an open-stroke orange U and violet T
interlocked as one forward-moving glyph. Dark navy anchors the wordmark and broader system.
Its full lockup spells **Ubunifu Technologies** at one size on one baseline. The mark uses two
solid identity colors; orange-to-purple gradients are a separate
device for large paths, headlines, and atmospheres. The company tagline remains supporting copy,
never part of the navigation or logo lockup.

Design tokens are the single source of truth — every color, font, and spacing value lives in
[`src/app/globals.css`](src/app/globals.css). See [`BRANDING.md`](BRANDING.md) for the full
system, [`public/brand/`](public/brand/) for canonical SVG assets, and
[`/brand`](https://ubunifutech.com/brand) for the shareable brand kit and downloads.
`public/logo-v2.png` is the social avatar. `public/og.jpg` is the social preview, a 1200 × 630 crop of `public/og.png`, which remains campaign media rather than a canonical logo master.

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
- **Location:** Tanzania

---

© 2026 Ubunifu Technologies. All rights reserved.

**Built in Tanzania.**

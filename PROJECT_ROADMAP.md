# Ubunifu Tech - Master Project Roadmap

This document serves as the master checklist to take **Ubunifu Tech** from its current state (High-Fidelity Prototype) to a fully operational, data-driven consulting platform.

## 🟢 Phase 1: Frontend & Brand Identity (The "Shop Window")
**Status: Complete**
*Objective: Launch a credible, multi-page marketing site.*

- [x] **Core Architecture**: Next.js 16, TypeScript, CSS Modules.
- [x] **Design System**: Light theme (warm orange + deep purple on soft lavender), responsive layouts, Framer Motion entrances.
- [x] **Multi-page structure**: Home, Products, Services (`/build`), Work, About, Blog, Careers.
- [x] **Homepage**: Highlight-reel layout - hero, three-pillar strip, product/work/about previews, technology marquee.
- [x] **Portfolio**: Real client projects (Usambara, Safari King) with browser-mockup cards and a client logo strip.
- [x] **Team Bios**: Profiles for Richard (Data & AI Builder) and HappyGod (Creative Director).
- [x] **Blog**: Markdown-based blog with a working listing page and individual post pages.
- [x] **Contact**: API route with email delivery (Resend) plus bot protection (honeypot, timing check, rate limiting).
- [x] **SEO Optimization**: Open Graph tags, metadata, sitemap, and robots.txt.
- [x] **Polishing**: Mobile responsiveness pass and hero micro-interaction.

---

## 🟡 Phase 2: Backyard Infrastructure (The "Engine")
**Status: Pending**
*Objective: Build the scalable Python foundation requested to demonstrate technical prowess.*

- [ ] **API Setup**: Initialize **FastAPI** (Python) project.
- [ ] **Database**: Set up **PostgreSQL** (via Supabase or Railway).
    - *Schema*: `users`, `blog_posts`, `projects`, `contact_submissions`.
- [ ] **API Endpoints**:
    - `POST /contact`: Handle form submissions & trigger email notifications (Resend/SendGrid).
    - `GET /posts`: Fetch blog articles (replacing local Markdown files).
    - `GET /projects`: Fetch portfolio items dynamically.
- [ ] **Integration**: Connect Next.js frontend to fetch data from this new FastAPI backend.

---

## 🟠 Phase 3: Admin Dashboard (The "Control Room")
**Status: Pending**
*Objective: Create internal tools for the team to manage the business without coding.*

- [ ] **Authentication**: Secure login for Richard & HappyGod (JWT or NextAuth).
- [ ] **Dashboard UI**: Private route (`/admin`) in the Next.js app.
- [ ] **Features**:
    - **Lead Manager**: View and manage contact form submissions.
    - **Blog Editor**: WYSIWYG editor to publish articles directly to the DB.
    - **Project Manager**: Add new client projects/logos easily.

---

## 🔵 Phase 4: Production Launch
**Status: Pending**
*Objective: Go live and start doing business.*

- [ ] **Frontend Deployment**: Deploy Next.js to **Vercel** (Recommended for speed/SEO).
- [ ] **Backend Deployment**: Deploy FastAPI + Postgres to **Railway** or **Render**.
- [ ] **Domain Configuration**: Point `ubunifutech.com` to the Vercel deployment.
- [ ] **Email Setup**: Configure professional email records (MX, SPF, DKIM).
- [ ] **Analytics**: Integrate PostHog or Google Analytics to track visitor behavior.

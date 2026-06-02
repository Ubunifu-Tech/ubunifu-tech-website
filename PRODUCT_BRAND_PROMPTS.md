# Ubunifu — Product Brand-Adoption Prompts

Ready-to-paste prompts for bringing each **Ubunifu Technologies product** under the company
brand (the warm-orange + purple system defined in this repo's
[`src/app/globals.css`](src/app/globals.css), [`BRANDING.md`](BRANDING.md), the live `/brand`
page, and `public/ubunifu-brand-guide.pdf`).

Each prompt below is **self-contained** — open the target product in its own session, paste the
whole block, and the agent has everything it needs. The last one is a **reusable template** for
any new product you build.

---

## How to use these

1. Open the product's repo in a fresh session (its own worktree).
2. Copy the matching prompt block and paste it as your first message.
3. Let it audit → propose → change → verify. Each prompt ends with a build-and-render check.
4. Review the diff before merging. The hard rules below are non-negotiable, but the *visual*
   result still deserves your eye.

---

## The shared foundation (every prompt embeds this)

**Colours**

| Role | Hex | Notes |
|---|---|---|
| Brand — Warm Orange | `#FF6B2C` | Primary identity, accents, logo gradient |
| Orange hover | `#E8581E` | |
| **Orange deep** | `#C44615` | **The accessible variant — use for anything with white text** |
| Accent — Purple | `#6D3FE8` | Second accent |
| Purple deep | `#3D1FA0` | Pressed / strong |
| Decorative blue | `#2E5BFF` | Soft background glows only — never text |
| Text navy | `#1F1A36` | Headings & body (marketing) |
| Text secondary | `#5A5170` | |
| Text tertiary | `#6B6385` | (AA-safe; darkened from the old `#8B82A0`) |

Signature gradient: `linear-gradient(135deg, #FF6B2C, #6D3FE8)` (the logo/mark gradient).

**Type:** Poppins headings (600/700/800) + Inter body (400–700) + a monospace for small
UPPERCASE labels. **No serif anywhere.**

**Logo:** the gradient **"U"** mark (orange→purple) + "Ubunifu TECHNOLOGIES" wordmark. The
tagline **"Digital solutions, built for Tanzania."** is a separate element — never baked into
the mark.

**The accessibility bar (the #1 rule, learned the hard way):** bright `#FF6B2C` on white is only
**2.84:1 — it fails WCAG AA for text.** So white text/icons sit on **`#C44615`** (≈4.9:1) or
darker; orange-as-text on light uses `#C44615`/navy/purple. Bright `#FF6B2C` is reserved for
**large decorative fills** (the logo, accent shapes, icon tiles, borders). Every text/background
pair clears **≥ 4.5:1** (≥ 3:1 for large text & UI) — in **both** light and dark mode.

**The architecture — "branded house with product latitude":** products share the foundation
(logo lineage, type, accessible tokens, semantic colours, dark mode) and keep a clean neutral
app canvas (white/near-white — *not* the marketing lavender), using brand colours as **accents**.
A product with only a default theme **adopts** the brand; a product that already has a
*deliberate, documented* brand of its own gets **reconciled / co-branded** (keep its identity,
adopt only the shared layer). When in doubt, ask before discarding an existing deliberate brand.

| Product | Current theme | Approach |
|---|---|---|
| **Sifa** | Teal + amber, system fonts | Adopt |
| **Insight** | Teal (OKLch), Inter+Merriweather | Adopt |
| **Rafiki** | Emerald + teal | Adopt |
| **Fanisi** | Deep purple `#560591` + amber (deliberate, documented) | **Reconcile / co-brand** |

---

## 1. Sifa — adopt

````text
# Rebrand the Sifa app to the Ubunifu Technologies brand

You are working in the **Sifa** repo. Sifa is a **Ubunifu Technologies product** — a
business-management platform for Tanzanian businesses (live). Its UI currently uses a
**teal + amber** theme that predates the company brand. Your job: re-theme it to the Ubunifu
brand (warm orange + purple) — cleanly, accessibly, and with **zero regressions**. The app lives
in the `frontend/` subfolder.

## The Ubunifu brand (the shared foundation to adopt)
- Brand — Warm Orange `#FF6B2C` (hover `#E8581E`, DEEP `#C44615` for anything with white text).
- Accent — Purple `#6D3FE8` (deep `#3D1FA0`).
- Signature gradient `linear-gradient(135deg, #FF6B2C, #6D3FE8)` — the logo/mark gradient.
- Decorative blue `#2E5BFF` — soft glows only, never text.
- Type: Poppins headings (600/700/800) + Inter body (400–700) + a monospace for small labels.
- Logo: gradient "U" mark + "Ubunifu TECHNOLOGIES" wordmark; the tagline "Digital solutions,
  built for Tanzania." is separate — never baked into the mark.

## NON-NEGOTIABLE RULES
1. PROPER CONTRAST — WCAG AA — in BOTH light AND dark mode (Sifa has dark mode via next-themes).
   Bright `#FF6B2C` on white is 2.84:1 → FAILS for text. White text/icons (buttons, badges,
   CTAs) → use `#C44615` (≈4.9:1) or darker. Orange-as-text on light → `#C44615`/navy/purple,
   never bright `#FF6B2C`. Bright orange is fine for large decorative fills (logo, icon tiles,
   borders). Every text/bg pair ≥ 4.5:1 (≥ 3:1 large/UI).
2. KEEP FUNCTIONAL/SEMANTIC COLOURS MEANINGFUL — success=green, danger=red, info=blue,
   warning=amber. ⚠️ TRAP: Sifa's `--accent` (#D97706) is the SAME amber as `--color-warning`
   (#D97706). When you repoint `--accent` to purple, `warning` must STAY amber — DECOUPLE them.
   Keep success `#059669`, danger `#DC2626`, info `#2563EB`. Make sure `warning` amber stays
   visually distinct from the new brand orange.
3. NO REGRESSIONS. ~70% of colour is centralised, but the landing page (`frontend/src/app/page.tsx`)
   and several dashboard widgets carry scattered `bg-teal-*` / amber utility classes — migrate
   those onto tokens too, or half the app will stay teal. Verify by building + rendering.
4. The logo gradient is fixed brand identity — re-skin it; never "fix" its contrast by recolouring.

## Current state (audited — re-verify before editing)
- Stack: Next.js 16 + Tailwind v4 + shadcn (Base-UI) + next-themes.
- Tokens (single source of truth): `frontend/src/app/globals.css` (`:root` + `.dark`).
- Palette: `--primary: #0F766E` (teal), `--accent: #D97706` (amber). Semantic:
  `--color-success: #059669`, `--color-danger: #DC2626`, `--color-info: #2563EB`,
  `--color-warning: #D97706`.
- Dark mode: next-themes, light default.
- Fonts: SYSTEM fonts (Segoe UI) — no webfont is loaded.
- Logo: `frontend/public/logo.svg` (teal rounded square, white "S"); `manifest.json`
  `theme_color: #0F766E`; `themeColor` in `layout.tsx`.

## What to change
1. `globals.css` (the main job): repoint `--primary` teal → orange (`#FF6B2C` base; use
   `#C44615`-class deep orange wherever white text sits on it). Repoint `--accent` amber →
   purple `#6D3FE8`. Update BOTH `:root` and `.dark`. Keep semantics per Rule 2 (warning stays
   amber, decoupled from accent).
2. Add web fonts: Poppins (headings, 600/700/800) + Inter (body) via `next/font/google` in
   `layout.tsx` (currently system fonts).
3. Re-skin `frontend/public/logo.svg` from the teal square + "S" to the Ubunifu orange→purple
   gradient (keep an "S" product mark or align to the "U" system — keep it crisp small). Update
   `manifest.json` `theme_color` and the `layout.tsx` `themeColor` to the brand.
4. Migrate the scattered `bg-teal-*` / amber classes on `frontend/src/app/page.tsx` and the
   dashboard widgets onto brand tokens.

## Verify before you call it done
- `npm run build` + `npm run lint` (in `frontend/`) clean.
- Render (`npm run dev`) and walk the landing page, dashboard, buttons, badges, widgets — in
  BOTH light and dark mode.
- Contrast-check the new combos (primary button text, orange-on-light text, badges, focus rings)
  ≥ 4.5:1 (≥ 3:1 large/UI); fix failures with the deeper orange/navy.
- Confirm semantics still read right (success green, warning amber, danger red) and nothing is
  left teal.
- Summarise exactly which files/tokens changed, the final brand + semantic values, and anything
  you deliberately left alone.
````

---

## 2. Insight — adopt

````text
# Rebrand the Insight app to the Ubunifu Technologies brand

You are working in the **Insight** repo. Ubunifu Insight is a **Ubunifu Technologies product** —
a document-AI platform (live). Its UI uses a **teal** theme (OKLch tokens) that predates the
company brand. Re-theme it to the Ubunifu brand (warm orange + purple) — cleanly, accessibly, and
with **zero regressions**. The app lives in the `frontend/` subfolder.

## The Ubunifu brand (the shared foundation to adopt)
- Brand — Warm Orange `#FF6B2C` (hover `#E8581E`, DEEP `#C44615` for anything with white text).
- Accent — Purple `#6D3FE8` (deep `#3D1FA0`).
- Signature gradient `linear-gradient(135deg, #FF6B2C, #6D3FE8)`.
- Decorative blue `#2E5BFF` — soft glows only, never text.
- Type: Poppins headings (600/700/800) + Inter body (400–700) + a monospace for small labels.
  No serif in the house system.
- Logo: gradient "U" mark + "Ubunifu TECHNOLOGIES" wordmark; tagline "Digital solutions, built
  for Tanzania." is separate.

## NON-NEGOTIABLE RULES
1. PROPER CONTRAST — WCAG AA. Bright `#FF6B2C` on white is 2.84:1 → FAILS for text. White
   text/icons → `#C44615` or darker. Orange-as-text on light → `#C44615`/navy/purple. Bright
   orange only for large decorative fills. Every text/bg pair ≥ 4.5:1 (≥ 3:1 large/UI).
   ⚠️ COMPATIBILITY: Insight's tokens are authored in OKLch — express the brand colours in OKLch
   too (convert `#FF6B2C`, `#6D3FE8`, `#C44615`, etc.) so you stay in the existing system. Get
   BOTH the `:root` and the `.dark` token sets right (there's no visible toggle yet, but the
   `.dark` values must still be brand-correct and AA-compliant).
2. KEEP FUNCTIONAL/SEMANTIC COLOURS MEANINGFUL — success=green, danger=red, info=blue,
   warning=amber. Don't collapse them into brand orange.
3. NO REGRESSIONS. There are HARDCODED hexes to hunt down and bring onto the brand:
   - `frontend/src/app/icon.tsx` (favicon) hardcodes `#059669`.
   - `frontend/src/app/(auth)/login/page.tsx` uses `bg-[#111827]` + emerald.
   - `CreateWorkspaceDialog.tsx` has a colour picker with hardcoded hexes (a USER feature — keep
     it working; only update its default palette and ensure choices stay accessible).
   - The landing capability cards use blue/emerald/purple.
   Verify by building + rendering.
4. The logo gradient is fixed brand identity.

## Current state (audited — re-verify before editing)
- Stack: Next.js 16 + React 19 + Tailwind v4 + shadcn (Radix).
- Tokens (single source of truth): `frontend/src/app/globals.css` in OKLch (`:root` + `.dark`);
  `--primary` is a teal (hue ≈ 195°).
- Fonts: Inter (body, via next/font) + Merriweather (serif) + Geist mono.
- Logo: NO static asset — the brand is text "Ubunifu Insight" + a Lucide `LayoutDashboard` icon
  in emerald.
- Dark mode: `.dark` CSS exists but there's no toggle / next-themes.

## What to change
1. `globals.css`: repoint `--primary` teal → orange (OKLch), add the purple accent (OKLch).
   Update BOTH `:root` and `.dark`. Keep semantics.
2. Fonts: add Poppins (headings, 600/700/800); keep Inter (body); keep Geist mono. The house has
   NO serif — replace Merriweather for UI/headings with Poppins. (If Merriweather is rendering
   long-form *document body* text where a serif genuinely aids reading, that's a product-content
   choice you may keep — but app chrome and headings should be Poppins.)
3. Logo: there's no mark today — create one: the Ubunifu "U" gradient mark (or an Insight product
   mark on the orange→purple gradient). Re-skin the favicon (`icon.tsx`, currently `#059669`) and
   the emerald `LayoutDashboard` icon to the brand.
4. Hardcoded hexes: migrate the favicon, the login screen (`bg-[#111827]` + emerald), the
   `CreateWorkspaceDialog` colour picker (keep the feature; refresh its default palette + ensure
   accessible contrast), and the landing capability cards onto brand tokens.
5. Dark mode: adding a visible toggle (next-themes) is optional/nice-to-have; at minimum make the
   existing `.dark` token values brand-correct and AA-compliant.

## Verify before you call it done
- `npm run build` + `npm run lint` (in `frontend/`) clean.
- Render and walk the landing page, login, dashboard, the workspace-create dialog, the favicon.
- Contrast-check the new combos (incl. the OKLch conversions) ≥ 4.5:1 (≥ 3:1 large/UI), and spot
  the `.dark` values too.
- Confirm no stray emerald/teal remains and the workspace colour picker still works.
- Summarise the files/tokens changed, the final OKLch brand values (light + dark), and anything
  left alone.
````

---

## 3. Rafiki — adopt

````text
# Rebrand the Rafiki app to the Ubunifu Technologies brand

You are working in the **Rafiki** repo. Rafiki ("Ubunifu Rafiki") is a **Ubunifu Technologies
product** — embeddable widgets for Tanzanian businesses (contact forms, booking systems, blog
tools). Its UI currently uses an **emerald-green** theme that predates the company brand. Your
job: re-theme it to the Ubunifu brand (warm orange + purple) — cleanly, accessibly, and with
**zero regressions**. The app lives in the `frontend/` subfolder.

## The Ubunifu brand (the shared foundation to adopt)
- Brand — Warm Orange `#FF6B2C` (hover `#E8581E`, DEEP `#C44615` for anything with white text).
- Accent — Purple `#6D3FE8` (deep `#3D1FA0`).
- Signature gradient `linear-gradient(135deg, #FF6B2C, #6D3FE8)` — the logo/mark gradient.
- Decorative blue `#2E5BFF` — soft glows only, never text.
- Type: Poppins headings (600/700/800) + Inter body (400–700) + a monospace for small labels.
- Logo: gradient "U" mark + "Ubunifu TECHNOLOGIES" wordmark; tagline "Digital solutions, built
  for Tanzania." is separate — never baked into the mark.

## NON-NEGOTIABLE RULES
1. PROPER CONTRAST — WCAG AA — this is the #1 requirement. Bright `#FF6B2C` on white is 2.84:1 →
   FAILS for text. Any element with white text/icons (buttons, badges, primary CTAs) must use
   `#C44615` (≈4.9:1) or darker — never bright `#FF6B2C`. Orange-as-text on light → `#C44615`,
   navy, or purple. Bright orange is correct for large decorative fills (logo, accent shapes,
   icon tiles, borders, hover backgrounds). Every text/bg pair ≥ 4.5:1 (≥ 3:1 large text & UI/
   focus rings). There is NO dark mode today — do NOT add one (out of scope); nail light mode.
2. KEEP FUNCTIONAL/SEMANTIC COLOURS MEANINGFUL. success=green, danger=red, info=blue,
   warning=amber. ⚠️ TRAP: right now `--color-success` is `#22C55E` — the EXACT same value as the
   old brand green. When you repoint the brand to orange, `success` must STAY green (e.g. keep a
   clear green like `#16A34A`; under white text use `#15803D`/green-700 for AA). DECOUPLE
   `success` from the brand token. `warning` is amber `#F59E0B` — keep it VISUALLY DISTINCT from
   the new brand orange (nudge it yellower/cooler if needed).
3. NO REGRESSIONS. Don't break the build, layout, animations, or the per-client custom
   widget-colour feature (below). Verify by building + rendering before declaring done.
4. The logo gradient is fixed brand identity — re-skin it; never "fix" its contrast by recolouring.

## Current state (audited — re-verify before editing)
- Stack: Next.js 16 + React 19 + Tailwind v4 (PostCSS). NO `tailwind.config.*` — all design
  tokens live in a Tailwind v4 `@theme` block.
- Single source of truth: `frontend/src/app/globals.css` (the `@theme` block, ~lines 1–49).
  Components reference tokens via `var(--color-*)` / Tailwind classes (`bg-brand-600`, …).
- Palette: `--color-brand: #22C55E` (emerald, 50→900 ramp), `--color-accent: #0D9488` (teal),
  slate neutrals, surfaces `#F8FAFC`/`#F1F5F9`/`#E2E8F0`.
- Semantic: `--color-success: #22C55E`, `--color-danger: #F43F5E`, `--color-warning: #F59E0B`,
  `--color-info: #0EA5E9` (all in `globals.css`).
- Fonts: Outfit (heading) + Inter (body) via `next/font/google` in `frontend/src/app/layout.tsx`.
- Logo: no static file — a "UR" monogram generated in `frontend/src/app/icon.tsx` +
  `apple-icon.tsx` on an emerald gradient `linear-gradient(135deg, #22c55e, #34d399)`.
- Per-client feature: the widget/form builder lets each client pick a `primary_color` for their
  embedded widget; the default fallback is the emerald (`#22c55e` / `#16A34A`).

## What to change
1. `frontend/src/app/globals.css` (the main job): repoint the brand ramp from emerald to Ubunifu
   orange (`#FF6B2C` base; build the 50→900 ramp around it, with `#C44615`-and-darker at the high
   end for white-text use). Set `--color-accent` to purple `#6D3FE8`. Keep the slate neutral base
   (clean app canvas — do NOT force lavender). Update semantics per Rule 2.
2. `frontend/src/components/ui/Button.tsx`: the primary/brand variant must resolve to a
   `#C44615`-class deep orange for its white-text default state (hover may go deeper/brighter but
   keep ≥ 4.5:1). Check every variant's text contrast.
3. `frontend/src/components/ui/Badge.tsx`: keep semantic variants mapped to real meanings
   (success=green, etc.); only brand/neutral variants move to orange.
4. `frontend/src/app/icon.tsx` + `apple-icon.tsx`: re-skin the monogram to
   `linear-gradient(135deg, #FF6B2C, #6D3FE8)`. Keep the letters white and legible (the purple
   half gives white better contrast). Keep "UR" or switch to the Ubunifu "U" — crisp at favicon size.
5. Per-client default colour: change the default `primary_color` fallback from emerald to the
   brand. IMPORTANT: clients can still pick their own colour — do not hardcode-override their
   choices. For the widget's own white-on-colour buttons, default to the accessible deep orange
   (or derive an accessible text colour from the chosen colour) so a default widget passes
   contrast out of the box.
6. Fonts: swap the heading font Outfit → Poppins (600/700/800) in `layout.tsx`; keep Inter.

## Verify before you call it done
- `npm run build` + `npm run lint` (in `frontend/`) clean.
- Render (`npm run dev`) and eyeball: landing, dashboard, buttons, badges, a form/widget preview,
  the favicon/monogram.
- Contrast-check the new combos (primary button text, orange-on-light text, badges, focus rings)
  ≥ 4.5:1 (≥ 3:1 large/UI). Fix failures with the deeper orange/navy.
- Confirm `success` still reads green and the per-client colour picker still works.
- Summarise the files/tokens changed, the final brand + semantic values, and anything left alone.
````

---

## 4. Fanisi — reconcile / co-brand

> Fanisi is the special case: it already has a *deliberate, documented* brand (deep purple
> `#560591` + amber, a custom "F" logo, its own `branding.md`, light/dark mode). We **keep** that
> and only adopt the shared layer. Do **not** repaint it orange.

````text
# Co-brand Fanisi into the Ubunifu Technologies house (RECONCILE — do not rip-and-replace)

You are working in the **Fanisi** repo. Fanisi is a **Ubunifu Technologies product** — a
school-operations platform for Tanzanian institutions ("Fanisi by Ubunifu Tech"). The app lives
in `frontend/`.

The decision (made deliberately by the owner): RECONCILE / CO-BRAND. Unlike Ubunifu's other
products, Fanisi already has a thoughtful, documented brand of its own — deep purple `#560591` +
amber, a custom "F" logo with a meaningful amber arrow, a full `docs/branding.md`, and proper
light/dark mode. You must PRESERVE that identity. Your job is NOT to repaint Fanisi orange. It is
to fold Fanisi into the Ubunifu HOUSE by adopting the shared foundation (type, a "by Ubunifu"
co-brand lockup, and the house accessibility/token standards) and gently harmonising the purple
toward the Ubunifu purple family — while keeping Fanisi unmistakably Fanisi. Think "branded house
with product latitude."

## The Ubunifu house foundation
- Brand orange `#FF6B2C` (hover `#E8581E`, deep `#C44615` for white-text use).
- Purple `#6D3FE8` (deep `#3D1FA0`) — the HOUSE purple.
- Signature gradient `linear-gradient(135deg, #FF6B2C, #6D3FE8)` — used on the Ubunifu "U"
  co-brand mark.
- Type to adopt: Poppins headings (600/700/800) + Inter body (400–700).
- Logo system: the Ubunifu mark is a gradient "U" + "Ubunifu TECHNOLOGIES" wordmark — the
  co-brand signature you ADD alongside Fanisi's own "F" mark, never replacing it.
- Tagline (Ubunifu's): "Digital solutions, built for Tanzania."

## KEEP (Fanisi's protected product identity — do NOT change)
- The primary purple + amber palette. Fanisi stays purple-led with the amber accent (the
  "achievement/arrow" colour). Do NOT introduce orange as a UI colour. (Amber and the house
  orange are cousins, so they already harmonise.)
- The "F" logo with the amber arrow stays as the product mark (`frontend/public/logo.png`,
  `logo-mark.png`, `frontend/app/icon.png`, and the `BrandMark`/`BrandLockup` in
  `frontend/components/brand-mark.tsx`).
- Light/dark mode (ThemeProvider + `public/theme-init.js`), the semantic colours (success
  teal-green, warning orange `#EA580C`, destructive red, info blue), and the centralised token
  discipline.
- JetBrains Mono for code/monospace (functional role — keep it).

## ADOPT / CHANGE (the shared layer)
1. Type → Poppins + Inter. In `frontend/app/layout.tsx`, replace the Outfit heading/UI font with
   Poppins (600/700/800) and use Inter for body, both via `next/font/google`. Keep JetBrains
   Mono. Update font-family CSS variables in `frontend/app/globals.css`. (Fanisi chose Outfit for
   warmth; Poppins is the house equivalent and keeps that rounded warmth.)
2. Add a Ubunifu co-brand lockup. Fanisi should visibly read as a Ubunifu product. The footer
   already says "© Ubunifu Tech · Fanisi" — strengthen this into a VISUAL "by Ubunifu" lockup
   (the gradient "U" mark + "Ubunifu" wordmark) in the right places: marketing footer/header, the
   auth/login screen, and any "about/powered-by" line. Consider a `UbunifuCobrand` variant near
   `frontend/components/brand-mark.tsx`. Keep it tasteful and secondary to the Fanisi "F".
3. Harmonise the purple toward the house family. Fanisi's primary is `#560591` (HSL ≈ 279° 93%
   29% — a deep, magenta-leaning violet). The house purple is `#6D3FE8` (≈ 256° 79% 58% —
   brighter, bluer). Nudge Fanisi's purple INTO the same family without flattening its character:
   adopt a brighter interactive purple in the `#6D3FE8` direction for primary buttons/links/active
   states, and RETAIN a deep purple (`#560591`/`#3D1FA0`) for pressed/active/deep surfaces. A
   Fanisi user and a ubunifutech.com visitor should feel the same purple lineage. Do this in
   `frontend/app/globals.css` (`:root` AND `.dark`).

## NON-NEGOTIABLE RULES
1. PROPER CONTRAST — WCAG AA — in BOTH light AND dark mode. Every text/bg pair ≥ 4.5:1 (≥ 3:1
   large text, UI, focus rings). Amber (`#F59E0B`) must NEVER carry white text — keep dark text on
   amber, exactly as `docs/branding.md` prescribes. When you brighten the interactive purple
   toward `#6D3FE8`, re-check white-on-purple: `#6D3FE8` on white text is ~3.9:1 — fine for LARGE
   text/UI but borderline for SMALL text; for small white text on a purple fill use a deeper
   purple (toward `#560591`/`#3D1FA0`). Verify, don't assume. USE THE SHOWCASE: the repo has a
   token showcase at `/_dev/tokens` (`frontend/app/_dev/tokens/showcase.tsx`) rendering every
   primitive in every state in both light and dark — walk it after your changes.
2. KEEP FUNCTIONAL/SEMANTIC COLOURS MEANINGFUL — success=green, warning=amber/orange-distinct,
   destructive=red, info=blue. Don't let the purple harmonisation bleed into them.
3. NO REGRESSIONS, TOTAL COMPATIBILITY. Work inside the existing system — Tailwind v4
   `@theme inline` + HSL CSS variables in `frontend/app/globals.css` (`:root` + `.dark`), shadcn
   primitives. No new styling paradigm, no inline hexes in JSX. Don't break the build, the
   dark-mode toggle, or layout.
4. UPDATE THE DOCS. Reflect the changes in `docs/branding.md`: the new type (Poppins/Inter), the
   co-brand relationship with Ubunifu (and where the lockup appears), and any harmonised purple
   values. Keep it the accurate source of truth.

## Current state (audited — re-verify before editing)
- Stack: Next 16.2 + React 19 + Tailwind v4 (`@theme inline`, no `tailwind.config.js`) + shadcn.
  Fonts via `next/font/google` (Outfit + JetBrains Mono).
- Tokens: `frontend/app/globals.css` — HSL CSS variables in `:root` (light) + `.dark`, mapped via
  `@theme inline`. Components use `bg-primary` / `text-muted-foreground` / `ring-ring` — never raw hex.
- Palette: primary purple `#560591`; primary-soft lilac `#F4EFFA`; accent amber `#F59E0B`; bg
  `#FCFCFD`, card white, foreground `#2C323A`, border gray-200. Semantic: success `158 64% 40%`,
  warning `#EA580C`, destructive `#DC2626`, info `#2563EB`.
- Dark mode: `ThemeProvider` (`frontend/components/providers/theme-provider.tsx`) +
  `public/theme-init.js`; `themeColor` in `layout.tsx`.
- Logo: "F" stroke (purple) + amber arrow; assets in `frontend/public/` + `frontend/app/icon.png`;
  wrappers in `frontend/components/brand-mark.tsx`; source art in `branding/`.
- Showcase: `/_dev/tokens`.

## Verify before you call it done
- `npm run build` + `npm run lint` (in `frontend/`) clean.
- Open `/_dev/tokens` in BOTH light and dark and walk every primitive/state — plus the login
  screen, dashboard, sidebar, and marketing footer (where the co-brand lockup now lives).
- Contrast-check the harmonised purple combos, amber usages, and focus rings in both modes
  (≥ 4.5:1 text / ≥ 3:1 large+UI). Fix failures with the deeper purple.
- Confirm Fanisi still reads as Fanisi (purple+amber, "F" mark intact) AND now visibly belongs to
  Ubunifu (co-brand lockup + Poppins/Inter).
- Summarise what changed (tokens, fonts, co-brand placements, doc edits), the final purple values
  for light+dark, and anything left untouched.
````

---

## 5. Template — any new product

Fill the three placeholders (`[REPO PATH]`, `[PRODUCT NAME]`, `[WHAT IT DOES]`), then paste into a
fresh session in that product's repo. It audits first and chooses **adopt** vs **reconcile** for
you — so it works whether the product is a blank-slate theme or already has its own identity.

````text
# Brand-align [PRODUCT NAME] to the Ubunifu Technologies house

You are brand-aligning [PRODUCT NAME] (`[REPO PATH]`), a Ubunifu Technologies product —
[WHAT IT DOES]. Bring it under the Ubunifu brand house — accessibly, compatibly, and with ZERO
regressions. Do the steps in order; do not edit anything before STEP 1 is decided.

## STEP 0 — Audit first (read-only; change nothing yet)
Report, quoting real file paths + values:
- Stack: framework + styling (Tailwind? CSS Modules? CSS-in-JS? component lib?) and whether the
  app is at the repo root or in a `frontend/` subfolder.
- Where colour/theme tokens are DEFINED (globals.css `@theme`/`:root`, a tailwind config, a theme
  file) and their FORMAT (hex / HSL / OKLch).
- Current palette (primary + accent), light/dark support + mechanism, fonts + how loaded, logo
  asset(s) + colours, semantic colours (success/danger/warning/info).
- Centralised vs scattered: are colours tokenised, or are there hardcoded hexes / `bg-<colour>-*`
  utility classes in components? List the offending files.
- Any user-facing colour feature (per-client/workspace colour pickers).

## STEP 1 — Choose the approach (state your choice + the evidence)
- ADOPT (default): the product has only a default/undeliberate theme → re-theme it to the Ubunifu
  orange/purple foundation below.
- RECONCILE / CO-BRAND: the product already has a DELIBERATE, DOCUMENTED brand (its own named
  palette, a custom logo with rationale, a branding doc) → KEEP its product identity and adopt
  ONLY the shared layer (type, a "by Ubunifu" co-brand lockup, token + contrast standards),
  harmonising its accent toward the house family. (This is what Fanisi got.)
- If it's genuinely ambiguous — or the product turns out to be a CLIENT/independent brand rather
  than a Ubunifu product — STOP and ask the owner before changing any brand identity.

## The Ubunifu brand (the shared foundation)
- Brand — Warm Orange `#FF6B2C` (hover `#E8581E`, DEEP `#C44615` for anything with white text).
- Accent — Purple `#6D3FE8` (deep `#3D1FA0`).
- Signature gradient `linear-gradient(135deg, #FF6B2C, #6D3FE8)` — the logo/mark gradient.
- Decorative blue `#2E5BFF` — soft glows only, never text.
- Type: Poppins headings (600/700/800) + Inter body (400–700) + a monospace for small UPPERCASE
  labels. No serif in the house system.
- Logo: gradient "U" mark + "Ubunifu TECHNOLOGIES" wordmark; the tagline "Digital solutions,
  built for Tanzania." is a separate element — never baked into the mark.
- Keep a clean neutral app canvas (white/near-white) — do NOT force the marketing site's lavender
  into an app UI. Brand colours are ACCENTS on that neutral base.

## NON-NEGOTIABLE RULES
1. PROPER CONTRAST — WCAG AA — this is the #1 requirement. Bright `#FF6B2C` on white is 2.84:1 →
   FAILS for text. White text/icons (buttons, badges, CTAs) → use `#C44615` (≈4.9:1) or darker.
   Orange-as-text on light → `#C44615`/navy/purple, never bright `#FF6B2C`. Bright orange is for
   LARGE decorative fills only (logo, accent shapes, icon tiles, borders). Every text/bg pair
   ≥ 4.5:1 (≥ 3:1 large text, UI, focus rings) — in BOTH light AND dark mode if dark mode exists.
2. KEEP FUNCTIONAL/SEMANTIC COLOURS MEANINGFUL — success=green, danger/destructive=red,
   warning=amber (distinct from brand orange), info=blue. Never collapse these into brand orange.
3. NO REGRESSIONS, FULL COMPATIBILITY. Work inside the existing token system and format (hex/HSL/
   OKLch) — no new styling paradigm, no inline hexes in JSX. Don't break the build, dark mode,
   layout, or any feature. Verify by building + rendering before "done."
4. The logo gradient is fixed brand identity — re-skin to the Ubunifu gradient; never "fix" its
   contrast by recolouring (a large gradient fill is exempt).

## WATCH-OUTS (learned from the other products)
- A semantic token that happens to EQUAL the old brand (e.g. success == old brand green, or
  accent == warning amber) must be DECOUPLED so it keeps its meaning — don't let it follow the
  brand to orange.
- Migrate scattered hardcoded hexes / `bg-<colour>-*` utility classes onto tokens — don't leave
  half the app on the old colour.
- Preserve any per-client/workspace colour-picker feature; only change its default + ensure the
  default and any pick stay accessible.
- If you adopt fonts, match the house exactly: Poppins headings + Inter body (no serif for UI).

## Verify before you call it done
- `npm run build` + `npm run lint` clean.
- Render and walk every key surface (landing, auth, dashboard, dialogs, favicon) in every state
  and BOTH colour modes (if present).
- Contrast-check the new combos ≥ 4.5:1 (≥ 3:1 large/UI); fix failures with the deeper orange/navy.
- Confirm semantics still read right, nothing of the old colour remains stray, and all features
  still work.
- Summarise exactly which files/tokens changed, the final brand + semantic values, and anything
  you deliberately left alone. If you chose RECONCILE, update the product's own branding doc.
````

---

## Maintaining these prompts

The canonical brand source is this repo: [`src/app/globals.css`](src/app/globals.css) (the
tokens), [`BRANDING.md`](BRANDING.md), the `/brand` page, and `public/ubunifu-brand-guide.pdf`.
If the brand changes there, update the hex values / type / logo notes in the prompts above to
match. Each prompt is deliberately self-contained (the brand spec is repeated in every block) so
it can be pasted standalone — that's by design, not duplication to "fix."

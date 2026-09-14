# Editorial asset inventory

This file records the image files intentionally retained in `public/editorial`.
The page-hero, service, project, and blog compositions rendered in the site are
primarily SVG; see `HERO_ARTWORK.md`.

## Homepage principles

These four original illustrations support the four factual working principles
on the homepage:

| Asset | Principle |
| --- | --- |
| `principle-local-v1.webp` | Understand locally |
| `principle-shipped-v1.webp` | Ship real work |
| `principle-ai-v1.webp` | Use AI deliberately |
| `principle-accountable-v1.webp` | Stay accountable after launch |

The mapping and alternative text live in
`src/content/principle-artwork.ts`.

## Products

The current product illustrations are:

| Asset | Product |
| --- | --- |
| `product-insight-v2.webp` | Ubunifu Insight |
| `product-sifa-v2.webp` | Ubunifu Sifa |
| `product-rafiki-v2.webp` | Ubunifu Rafiki |

They are used on the homepage and products page through
`src/content/product-artwork.ts`. Their subjects and factual constraints are
documented in `PRODUCT_ARTWORK.md`.

## Journal and project sources

The following assets remain the source media for article metadata, editorial
fallbacks, or project content identifiers. In-page presentation may use the
corresponding wordless SVG from `EditorialVisual`.

- `build-or-buy.webp`
- `credit-ledger.webp`
- `software-tanzania-learning.webp`
- `swahili-learning.webp`
- `tourism-systems.webp`
- `usage-based-pricing.webp`
- `safari-field-v3.webp`
- `usambara-landscape-v3.webp`

Article mappings are defined in post frontmatter and
`src/components/StoryVisual.tsx`. Project mappings are defined in
`src/content/portfolio.tsx` and `src/content/project-visuals.ts`.

## Asset rules

- Artwork must not imply a released interface, client result, or metric that is
  not supported by the adjacent HTML.
- Keep logos, labels, numbers, and readable interface text out of generated
  illustrations.
- Use semantic HTML for product status, links, captions, and claims.
- Add every runtime image to a content mapping with specific alternative text.
- Remove superseded variants when a replacement is accepted.

`IMAGE_PROMPTS.md` is a historical prompt archive. Its old filenames are not a
runtime inventory.

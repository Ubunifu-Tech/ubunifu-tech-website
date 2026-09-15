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

## Working photography

Three generated editorial photographs introduce a small amount of tangible,
real-world technology without replacing the site's explanatory SVG system:

| Asset | Placement | Subject |
| --- | --- | --- |
| `services-code-review-v1.webp` | Services delivery process | An anonymous development desk with code and a sketched system flow |
| `about-systems-workshop-v1.webp` | About story | Anonymous participants working through a wordless system map |
| `industries-transformation-workshop-v1.webp` | Industries examples | A fictional digital-transformation working session with a presentation underway |

All three files are 1536 x 1024 WebP images and are mapped with specific
alternative text and crop positions in `src/content/editorial-photography.ts`.
People are anonymous or shown in a candid working context, and screens contain
no readable content, logos, client identifiers, or product claims. Each appears
once as editorial context and must not be described as Ubunifu staff or client
evidence.

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

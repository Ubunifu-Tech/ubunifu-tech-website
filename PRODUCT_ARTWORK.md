# Product artwork - 14 September 2026

The product page and homepage use three original editorial illustrations generated for the current light Ubunifu Technologies design system. They explain each product's purpose without presenting a fictional product screenshot.

Runtime artwork is mapped by stable product ID in `src/content/product-artwork.ts`. Product names, capabilities, availability, and links remain accessible HTML sourced from `src/content/products.tsx`.

| Product | Runtime asset | Subject | WebP size |
|---|---|---|---:|
| Insight | `public/editorial/product-insight-v2.webp` | A professional reviews answers connected back to source documents | 54,314 bytes |
| Sifa | `public/editorial/product-sifa-v2.webp` | A small-business workflow connects sales, stock, customers, and records | 57,082 bytes |
| Rafiki | `public/editorial/product-rafiki-v2.webp` | A team assembles contact, booking, and publishing modules into a website | 45,470 bytes |

All three runtime files are 1200 x 900 WebP images on a clean white canvas. They contain no product claims, readable interface copy, logos, watermarks, metrics, or currency amounts. Rafiki includes an outlined, unfilled module to make its in-development status visible rather than implying it is already live.

## Shared visual direction

- Polished flat editorial illustration with restrained isometric depth.
- Substantial human figures performing recognizable work.
- Vivid violet `#6D3FE8`, deep violet `#3D1FA0`, orange `#FF6B2C`, warm ink `#2E2935`, white, pale violet, and natural skin tones.
- Rounded geometry, crisp edges, and soft dimensional shading.
- No cyan, green, yellow, red, or blue accents.
- No robots, brains, rockets, VR headsets, dark server racks, decorative network fields, or science-fiction imagery.

## Product subjects

### Insight

Several source documents pass through a compact analysis module into an answer panel. Reference markers connect answer fragments back to their sources while a professional visibly reviews the result. The scene is limited to capabilities listed in `src/content/products.tsx`: questions about documents, structured extraction, and source references.

Final corrected generation output:

`/Users/richardpallangyo/.codex/generated_images/019efd0a-a70c-73c1-9f92-edfad648a5f4/exec-b5967cc7-1cb6-43e4-b881-39afce57d73e.png`

### Sifa

A small-business operator works at a sales counter beside stock, a supplier delivery, a customer ledger, and an unpaid-balance record. One orange route joins the workflow. The scene contains no invented metrics or currency amounts.

Final corrected generation output:

`/Users/richardpallangyo/.codex/generated_images/019efd0a-a70c-73c1-9f92-edfad648a5f4/exec-8d7a1342-02a8-443c-b51a-21a5e89eb87e.png`

### Rafiki

A website shell is assembled from contact, booking, and blog modules. One outlined slot remains unfinished. This communicates the product's stated scope and current in-development status without showing a released interface.

Final corrected generation output:

`/Users/richardpallangyo/.codex/generated_images/019efd0a-a70c-73c1-9f92-edfad648a5f4/exec-7d9b58a4-52ae-4332-8a57-ab99df7054c2.png`

## Runtime treatment

The illustrations sit on white visual stages with a one-pixel violet-neutral border. Hover motion is limited to a small lift and scale, and is disabled when reduced motion is requested. The homepage reuses the same files so the product identity does not drift between pages.

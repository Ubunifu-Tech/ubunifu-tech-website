# Hero and page artwork

The live site uses repo-native SVG compositions for page heroes. Raster hero
backgrounds from the previous dark visual system have been removed.

## Runtime system

The homepage combines the light `AmbientShader` with the original animated
`HomeHeroGraphic` in `src/components/HomeLandingVisuals.tsx`. The graphic is
decorative, contains no words, and keeps all visible copy in semantic HTML.

Every internal page uses `PageHeader` and a scene from
`src/components/PageSceneGraphic.tsx`. The shared component keeps the same
640 by 440 composition, line language, isometric geometry, accessible
description, and light orange/violet palette across routes.

| Route | Scene |
| --- | --- |
| `/build` | `services` |
| `/work` | `work` |
| `/products` | `products` |
| `/about` | `about` |
| `/industries` | `industries` |
| `/contact` | `contact` |
| `/blog` | `journal` |
| `/careers` | `careers` |
| `/brand` | `brand` |
| `/privacy` | `privacy` |

Services and project compositions use the same primitives through
`SystemDiagram.tsx` and `iso.tsx`. Blog covers are translated into six shared
wordless compositions by `StoryVisual.tsx`.

## Rules

- Keep visible wording outside SVG and canvas artwork.
- Use the shared orange, violet, ink, and neutral tokens.
- Preserve each SVG view box and aspect ratio.
- Keep animation subtle and honor `prefers-reduced-motion`.
- Do not add fake interfaces, metrics, client scenes, or product claims.
- Add a new scene to the shared component instead of creating a one-off hero.

## Verification

Run a production build before the rendered-source checks:

```sh
npm run build
npm run check:hero-assets
npm run check:project-visuals
```

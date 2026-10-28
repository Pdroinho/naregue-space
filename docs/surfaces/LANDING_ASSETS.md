# Landing asset provenance

## Current artistic revision

The current landing uses nine original images generated with the built-in `image_gen` tool and optimized as WebP in `public/landing/art` (approximately 1.5 MB total). The latest explicit user brief authorized illustrations, clean fictional UI mockups and abstract backgrounds, superseding this landing's earlier screenshot-only direction.

| File | Use and nature |
|---|---|
| scissors.webp | Engraved gouache hand with chrome scissors; native alpha |
| comb.webp | Engraved gouache hand with ivory comb; native alpha |
| agenda.webp | Clean conceptual agenda mockup; not an actual screenshot |
| team.webp | Clean conceptual team mockup; not an actual screenshot |
| finance.webp | Conceptual cash-flow mockup with fictional amounts; not an actual screenshot |
| phone.webp | Physically rendered phone with conceptual booking UI; native alpha |
| bust.webp | Marble fade bust on copper plinth; native alpha |
| field.webp | Abstract material background of paper, copper and citrus arc |
| conversation.webp | Copper/citrus resin conversation ribbons; native alpha |

There are five native-alpha cutouts and four opaque images. Exact prompts are recorded in `docs/assets/landing-art-prompts.json`, including name, path, tool and transparency. Agenda, team and finance additionally record `originPrompt`, because they were edited for sans-serif typography and label fidelity. Each shipping WebP embeds the exact prompt in EXIF and has a `.webp.json` tool/provenance sidecar. The metadata scan found nine WebPs and zero missing origins.

Visible captions identify conceptual illustration and fictional data. These images do not prove commercial outcomes or promise exact equivalence with the live panel. The generated phone complements functional HTML demonstration controls without creating a real booking. Official logos in `public/brand` remain preserved. AbacatePay guided composition, hands and interaction; none of its image assets were incorporated.

## Historical captures - not displayed on the current landing

`public/landing/renewal/*.webp` contains five actual product captures produced on 27 October 2026 by `node scripts/check-product-ui.mjs --landing-assets`: `calendar`, `team`, `dashboard`, `finance` and `booking`. They were rendered from the compiled project with intercepted APIs and synthetic in-memory data, without creating real records. They contain origin/authorship EXIF and were not AI generated. They document the first renewal, rather than the current artistic revision.

Photographs in `public/naregua` remain official pre-existing project assets. Their presence does not impose exclusive photography on the current campaign.

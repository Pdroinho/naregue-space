# Landing asset provenance

## Current artistic revision: art-v2

The current landing uses seven original images generated with the built-in `image_gen` tool and optimized as WebP in `public/landing/art-v2`. The user requested fine ink crosshatching and restrained watercolor, with petroleum, copper and ivory and a peach accent. Green and citrus are rejected, as are marble sculptures, resin ribbons and shiny decorative 3D material.

| File | Use and nature | Transparency |
|---|---|---|
| hands.webp | Ink-and-watercolor barber hands holding scissors and comb; reused as left/right crops in hero and close | Native alpha |
| chair.webp | Ink-and-watercolor vintage barber chair; introduction and close | Native alpha |
| conversation.webp | Hand writing on an appointment card and notebook; Mestre AI section | Native alpha |
| agenda.webp | Conceptual agenda mockup based on the actual product interface | Opaque |
| team.webp | Conceptual team mockup based on the actual product interface | Opaque |
| finance.webp | Conceptual finance mockup with fictional amounts, based on the actual product interface | Opaque |
| phone.webp | Physically rendered phone with conceptual booking UI based on the actual product interface | Native alpha |

Exact generation prompts, paths, tool and requested transparency are recorded in `docs/assets/landing-art-v2-prompts.json`. The four alpha assets are generated cutouts rather than opaque paper rectangles. The three desktop mockups are deliberately opaque product panels.

Actual NaRégua product screenshots and the actual official logo PNG were input references for product-image generation. They constrain the existing interface, petroleum panels, ivory text, copper actions and Portuguese labels. These remain generated conceptual illustrations, not actual screenshots or promises of exact interface equivalence. The exact official `/brand/logo-wordmark-approved-web.png` is additionally rendered by the HTML `ProductBrand` overlay above the desktop mockups, preserving the real graphic independently of generated lettering. Official header and footer assets remain native images.

Visible captions identify conceptual illustration and fictional data. The phone complements functional HTML demonstration controls without creating a real booking; the message demonstration sends nothing. No asset proves commercial outcomes. AbacatePay guided composition, artistic hands and interaction; its imagery was a style reference, not incorporated campaign artwork. The art-v2 prompts explicitly reject its green palette and avocado subject.

## Historical assets - not displayed on the current landing

`public/landing/art` and `docs/assets/landing-art-prompts.json` record the superseded nine-image art-v1 direction. Its marble bust, sculpted field and resin conversation ribbons are historical provenance, not the current visual contract.

`public/landing/renewal/*.webp` contains five actual product captures produced on 27 October 2026 by `node scripts/check-product-ui.mjs --landing-assets`: `calendar`, `team`, `dashboard`, `finance` and `booking`. They were rendered from the compiled project with intercepted APIs and synthetic in-memory data, without creating real records. They contain origin/authorship EXIF and were not AI generated. They document the first renewal and supplied product-reference material rather than the current displayed campaign images.

Photographs in `public/naregua` remain official pre-existing project assets. Their presence does not impose exclusive photography on the current campaign. The public art revision does not change the operational panel system or its semantic state colors.

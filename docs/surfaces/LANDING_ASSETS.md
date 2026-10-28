# Landing asset provenance

## Current artistic revision: art-v2

The desktop landing uses seven original images generated with the built-in `image_gen` tool and optimized as WebP in `public/landing/art-v2`. The user requested fine ink crosshatching and restrained watercolor, with petroleum, copper and ivory and a peach accent. Green and citrus are rejected, as are marble sculptures, resin ribbons and shiny decorative 3D material.

| File | Use and nature | Transparency |
|---|---|---|
| hands.webp | Ink-and-watercolor barber hands holding scissors and comb; reused as left/right crops in hero and close | Native alpha |
| chair.webp | Ink-and-watercolor vintage barber chair; introduction, close and public access | Native alpha |
| conversation.webp | Hand writing on an appointment card and notebook; Mestre AI section | Native alpha |
| agenda.webp | Conceptual agenda mockup based on the actual product interface | Opaque |
| team.webp | Conceptual team mockup based on the actual product interface | Opaque |
| finance.webp | Conceptual finance mockup with fictional amounts, based on the actual product interface | Opaque |
| phone.webp | Physically rendered phone with conceptual booking UI based on the actual product interface | Native alpha |

Exact generation prompts, paths, tool and requested transparency are recorded in `docs/assets/landing-art-v2-prompts.json`. The four alpha assets are generated cutouts rather than opaque paper rectangles. The three desktop mockups are deliberately opaque product panels.

Actual NaRégua product screenshots and the actual official logo PNG were input references for product-image generation. They constrain the existing interface, petroleum panels, ivory text, copper actions and Portuguese labels. These remain generated conceptual illustrations, not actual screenshots or promises of exact interface equivalence. The user explicitly removed white logo bars and the HTML `ProductBrand` overlay on 28 October 2026. CSS crops the top 12.1% of desktop mockups; all seven WebPs and their recorded generation origins remain unchanged. Official header and footer assets remain native images.

The user explicitly revoked visible demo captions on 28 October 2026; image alternatives retain the conceptual and fictitious-data descriptions. The hero demo meets the end of the opening block, and finance is presented in a native CSS notebook frame. The phone complements functional HTML demonstration controls without creating a real booking; the message demonstration sends nothing. No asset proves commercial outcomes. AbacatePay guided composition, artistic hands and interaction; its imagery was a style reference, not incorporated campaign artwork. The art-v2 prompts explicitly reject its green palette and avocado subject.

## Historical assets - not displayed on the current landing

`public/landing/art` and `docs/assets/landing-art-prompts.json` record the superseded nine-image art-v1 direction. Its marble bust, sculpted field and resin conversation ribbons are historical provenance, not the current visual contract.

`public/landing/renewal/*.webp` contains five actual product captures produced on 27 October 2026 by `node scripts/check-product-ui.mjs --landing-assets`: `calendar`, `team`, `dashboard`, `finance` and `booking`. They were rendered from the compiled project with intercepted APIs and synthetic in-memory data, without creating real records. They contain origin/authorship EXIF and were not AI generated. They document the first renewal and supplied product-reference material rather than the current displayed campaign images.

Photographs in `public/naregua` remain official pre-existing project assets. Their presence does not impose exclusive photography on the current campaign. The public art revision does not change the operational panel system or its semantic state colors.

## Current independent mobile artwork

The user rejected revision `d3b49ab` and its prototype, explicitly commissioning new assets for an independent mobile landing. `MobileLanding.tsx` uses three original built-in `image_gen` illustrations in `public/landing/mobile-art`, all native alpha, approximately 761 kB total:

| Asset | Dimensions | Nature |
|---|---|---|
| booking-hand | 960 x 1216 | Booking/hand illustration using actual brand and booking references |
| cash-notebook | 800 x 887 | Notebook illustration for the warm finance section |
| team-handoff | 800 x 466 | Team handoff artwork for the mobile closing |

Exact prompts and provenance are in `docs/assets/landing-mobile-art-prompts.json`. These are new mobile assets; the seven desktop art-v2 images and their origins remain unchanged. Mobile screenshots live in `.validation/mobile-art`. Generated illustrations do not substantiate commercial outcomes or measured conversion gains.

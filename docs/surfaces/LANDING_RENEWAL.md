# Public landing - illustrated barber atelier

Mode: Persuade. Route: `/`. User-selected reference: https://www.abacatepay.com/, inspected on desktop with controls and scrolling. This is the artistic revision requested on 27 October 2026. It supersedes the earlier screenshot-only, existing-photography-only and no-abstract-art contracts for this landing. Operational panel rules remain unchanged.

## Direction contract

The user rejected the sober composition, blurred enlarged UI captures, CSS phone, tall pricing and weak closing/footer. They explicitly requested generated illustrations, clean fictional mockups, abstract backgrounds and more motion, with Renaissance hands and artistic collage from the reference as authority.

THESIS: barbershop talent meets organization in a digital atelier, with human gestures and tools as protagonists.

OWN-WORLD: engraved gouache hands, chrome, copper and a marble fade bust; petroleum, cream and pale citrus; original art and clearly identified conceptual UI. Preserve Manrope, Hugeicons and the official brand.

STORY: citrus opening with hands/tools, clean mockup, marble bust, physically rendered booking phone, visual management, conversation ribbons, compact plan selection and a campaign close with full petroleum footer.

FIRST VIEWPORT: central headline and working topic selector framed by large illustrated hands; citrus, petroleum and copper provide contrast around the CTA and clean conceptual preview.

FORM: preserve real commercial content and functional HTML controls. Native-alpha artwork and sculpted paper backgrounds create material depth. Interruptible movement supports reading with reduced-motion and coarse-pointer alternatives.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Product truth and boundaries

- Plans and prices come from the existing catalog. Checkout, referral and subscription return are preserved; access uses `/acessar`.
- Do not invent metrics, savings, testimonials or customer counts.
- Agenda, team, finance and phone images are generated conceptual illustrations, not actual screenshots or exact product specifications. Visible captions identify fictional data and illustrative UI; the message demonstration sends nothing.
- Nine current WebPs live in `public/landing/art`. Exact prompts and origin prompts are in `docs/assets/landing-art-prompts.json`; provenance is documented in LANDING_ASSETS.md.
- The artistic direction applies only to the public landing, without changing operational panel identity, density or rules.

## Implemented expression

`LandingExperience.tsx`, `landing-experience.css` and `landing-art-direction.css` implement the surface. The citrus opening integrates scissors and comb held by engraved gouache hands. A marble fade bust stands over a sculpted paper field. Booking uses a physically rendered native-alpha phone. Conversation ribbons accompany Mestre AI. Compact pricing leads to a close combining hands, bust and material field, followed by a full petroleum footer with complete brand and navigation.

The agenda/team/management selector changes conceptual mockups. The booking story responds to scrolling and explicit step selection; confirming changes local state only. The 1-15 professional range resolves real catalog plans of up to 3, 6 or 15 seats with refresh/error handling. Rolling digits do not claim savings or individual pricing.

Navigation contracts after 32px scrolling, becomes a menu below 900px and closes with Escape, returning focus. Skip link, visible focus, keyboard controls and native FAQ remain available. Fine-pointer hands follow a requestAnimationFrame spring (stiffness 220, damping 24); the loop stops at rest. Coarse pointers and reduced motion bypass it. Reduced motion also removes reveals, transitions and smooth scrolling while retaining content and controls.

## Current evidence and review

Current captures: `.validation/lp-renewal/hero-1440.png`, `hero-390.png`, `full-1440.png`, `full-390.png`, plus desktop/mobile crops for `intro`, `workspace`, `ai`, `pricing-wrap`, `close` and `footer`. The fresh final five-section review returned **SHIP for the whole landing**, with no visual fix required. Its documentation reconciliation request is addressed by this contract and LANDING_ASSETS.md.

Chromium and Firefox each passed 10/10 landing checks without reported errors. Typecheck, lint and build passed. This is not a global accessibility audit. Final record: `docs/LP_DIRECAO_ARTISTICA_2026-10-27.md`.

The earlier review limited to mobile captions, a zero-percent discount and checkout eyebrow belongs to the screenshot-era version; it is not approval evidence for the current artwork. `public/landing/renewal` captures are historical assets, no longer displayed on this landing.

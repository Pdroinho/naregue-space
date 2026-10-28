# Public landing - illustrated barber atelier

Mode: Persuade. Route: `/`. User-selected reference: https://www.abacatepay.com/, inspected on desktop with controls and scrolling. This is the artistic revision requested on 27 October 2026. It supersedes the earlier screenshot-only, existing-photography-only and no-abstract-art contracts for this landing. Operational panel rules remain unchanged.

## Direction contract

The user rejected the sober composition, blurred enlarged UI captures, CSS phone, tall pricing and weak closing/footer. They explicitly requested generated illustrations, clean fictional mockups, abstract backgrounds and more motion, with Renaissance hands and artistic collage from the reference as authority.

THESIS: barbershop talent meets organization in a digital atelier, with human gestures and tools as protagonists.

OWN-WORLD: fine ink crosshatching and restrained watercolor hands, vintage barber chair and appointment notebook; petroleum, copper and ivory with peach accents; original art and clearly identified conceptual UI. Green, citrus, marble and resin are explicitly rejected. Preserve Manrope, Hugeicons and the official brand.

STORY: ivory opening with hands/tools, faithful conceptual mockup, illustrated barber chair, physically rendered booking phone, visual management, a hand writing in an appointment notebook, compact plan selection and a hands/chair campaign close with full petroleum footer.

FIRST VIEWPORT: central headline and working topic selector framed by large illustrated hands; ivory, petroleum and copper provide contrast around the CTA and clean conceptual preview.

FORM: preserve real commercial content and functional HTML controls. Native-alpha ink-and-watercolor artwork and restrained peach accents create material depth. Interruptible movement supports reading with reduced-motion and coarse-pointer alternatives.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Product truth and boundaries

- Plans and prices come from the existing catalog. Checkout, referral and subscription return are preserved; access uses `/acessar`.
- Do not invent metrics, savings, testimonials or customer counts.
- Agenda, team, finance and phone images are generated conceptual illustrations, not actual screenshots or exact product specifications. Visible captions identify fictional data and illustrative UI; the message demonstration sends nothing.
- Seven current WebPs live in `public/landing/art-v2`. Hands, chair, conversation and phone have native alpha; agenda, team and finance are opaque. Exact prompts are in `docs/assets/landing-art-v2-prompts.json`; provenance is documented in LANDING_ASSETS.md.
- Actual product screenshots and the official PNG were input references for the generated product illustrations. The exact official PNG also remains an HTML overlay on desktop mockups. The results remain conceptual illustrations, not actual screenshots.
- The artistic direction applies only to the public landing, without changing operational panel identity, density or rules.

## Implemented expression

`LandingExperience.tsx`, `landing-experience.css` and `landing-art-direction.css` implement the surface. The ivory opening integrates scissors and comb held by ink-and-watercolor hands. A vintage barber chair anchors the introduction. Booking uses a physically rendered native-alpha phone. A hand writing in an appointment notebook accompanies Mestre AI. Compact pricing leads to a close combining hands and chair, followed by a full petroleum footer with complete brand and navigation.

The agenda/team/management selector changes conceptual mockups. The booking story responds to scrolling and explicit step selection; confirming changes local state only. The 1-15 professional range resolves real catalog plans of up to 3, 6 or 15 seats with refresh/error handling. Rolling digits do not claim savings or individual pricing.

Navigation contracts after 32px scrolling, becomes a menu below 900px and closes with Escape, returning focus. Skip link, visible focus, keyboard controls and native FAQ remain available. Fine-pointer hands follow a requestAnimationFrame spring (stiffness 220, damping 24); the loop stops at rest. Coarse pointers and reduced motion bypass it. Reduced motion also removes reveals, transitions and smooth scrolling while retaining content and controls.

## Current evidence and review

Art-v2 captures in `.validation/lp-renewal` and `.validation/lp-renewal-firefox` cover desktop and mobile. Chromium and Firefox each passed 10/10 checks from 320 to 1440px with no visual findings. Build, typecheck and lint passed. Specific checks preserve the official logo, warm campaign accent and complete financial illustration. The independent finish review found no remaining material blockers after fixing the mobile finance crop. This is implementation review, not user aesthetic approval or a global accessibility audit. Safari and physical devices were not tested.

Current record: `docs/LP_DIRECAO_ARTISTICA_2026-10-27.md`. Screenshot-era and rejected art-v1 verdicts do not establish approval of art-v2. `public/landing/renewal` captures remain historical input references.
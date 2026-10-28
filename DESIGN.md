---
name: NaRégua
description: Professional barbershop operations with a calm, readable interface.
colors:
  brand-action: "#b85a30"
  brand-action-hover: "#934526"
  brand-soft: "#fdf2ea"
  canvas: "#f4efe6"
  panel: "#fbf7ef"
  raised: "#fffdf8"
  soft: "#eee6d9"
  ink-strong: "#102832"
  ink-body: "#39505a"
  line-soft: "rgba(16, 40, 50, .12)"
  line-strong: "rgba(16, 40, 50, .22)"
  success: "#267657"
  success-soft: "#e7f4ed"
  warning: "#8b5b17"
  warning-soft: "#fff2d2"
  danger: "#a6463e"
  danger-soft: "#fbe9e4"
  lp-highlight: "#efd3be"
  lp-paper: "#fffdf8"
  lp-cream: "#eee7d9"
  lp-ink: "#082a39"
  lp-muted: "#526770"
  lp-pale: "#f5dfd0"
  lp-line: "rgba(8, 42, 57, .16)"
typography:
  display:
    fontFamily: "Manrope, Segoe UI Variable, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 5vw, 4.8rem)"
  lp-display:
    fontFamily: "Manrope, Segoe UI Variable, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 5.2vw, 4.7rem)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-.04em"
  lp-section:
    fontSize: "clamp(2.15rem, 4vw, 3.5rem)"
    fontWeight: 750
    lineHeight: 1.1
  page:
    fontFamily: "Manrope, Segoe UI Variable, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 2.4vw, 2rem)"
  body:
    fontFamily: "Manrope, Segoe UI Variable, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: ".875rem"
  card-title:
    fontSize: "1.06rem"
    fontWeight: 760
    letterSpacing: "-.025em"
  label:
    fontSize: ".76rem"
    fontWeight: 720
    lineHeight: 1.35
rounded:
  xs: "6px"
  control: "10px"
  card: "14px"
  panel: "18px"
  hero: "22px"
  pill: "999px"
  lp-opening: "48px"
  lp-section: "40px"
  lp-photo: "32px"
  lp-plan: "20px"
  lp-mobile-surface: "28px"
  lp-pill: "100px"
spacing:
  one: "4px"
  two: "8px"
  three: "12px"
  four: "16px"
  five: "20px"
  six: "24px"
  eight: "32px"
  ten: "40px"
  twelve: "48px"
components:
  lp-button:
    backgroundColor: "{colors.brand-action}"
    textColor: "{colors.lp-paper}"
    rounded: "{rounded.lp-pill}"
    padding: "12px 24px"
  lp-plan:
    backgroundColor: "{colors.lp-paper}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.lp-plan}"
    padding: "25px 28px"
  button-primary:
    backgroundColor: "{colors.brand-action}"
    textColor: "{colors.raised}"
    rounded: "{rounded.control}"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-action-hover}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.card}"
  chip:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
---

# Design System: NaRégua

## Overview

**Creative North Star: "Precision of the barbershop"**

NaRégua preserves the precision and material character of the barbershop: petroleum structure, cream reading surfaces and copper actions. The original monogram, realistic barber photography and calm task hierarchy carry the identity through owner, staff and public booking experiences.

Operational screens open in light mode, with a persistent petroleum dark option. Tenant logos and action accents may vary; neutral surfaces and semantic states remain product-owned. The public landing composition has been replaced within the established brand. Its Persuade expression is an illustrated barber atelier: fine ink crosshatching and restrained watercolor hands, a vintage barber chair and a hand writing in an appointment notebook, with a framed light-copper opening, peach accents and full petroleum footer. Large display type, generous surface radii and floating pill navigation are public-surface exceptions, not operational defaults. The user explicitly commissioned generated campaign art and clean fictional UI mockups on 27 October 2026; they supersede the earlier screenshot-only direction for this landing.

**Key Characteristics:**
- Cream reading surfaces and petroleum structure.
- Manrope interface with local Hugeicons Stroke Rounded.
- Copper actions and realistic photography in operations; ivory, peach and ink-and-watercolor campaign art on the public landing.

This document records the incumbent operational system and the completed public landing replacement within that visual world. Evidence: PRODUCT.md, BRANDING.md, src/main.tsx, naregua-identity.css, naregua-integration.css, theme.ts, Shell.tsx and BookingPage.tsx; representative dashboard and booking review captures. Identity is imported after feature styles; integration is last. Frontmatter records default light primitives and explicitly prefixed public landing variants, not every feature override or runtime tenant value. Landing evidence: src/features/marketing/LandingExperience.tsx, landing-experience.css and .validation/lp-renewal/{hero,full}-{1440,390}.png. The campaign layer is implemented in landing-art-direction.css. Its composition contract and raster provenance live in docs/surfaces/LANDING_RENEWAL.md and docs/surfaces/LANDING_ASSETS.md.

## Colors

Warm cream supports reading; petroleum provides structure; copper marks actions and selection.

### Primary

**Copper action** is the default action family. Tenant runtime branding replaces its scale and derives foreground contrast in theme.ts; static frontmatter is the unbranded default.

### Neutral

**Cream canvas, panel and raised paper** separate workspace layers. **Petroleum ink** supplies strong headings and body copy; soft and strong translucent lines divide content.

### Named Rules

**The Product Neutrals Rule.** Tenant branding changes the accent family and logo, never product surfaces or semantic colors.

Green, amber and coral belong to success, warning and danger. Dark mode replaces surface, ink, line, semantic and shadow values under the explicit admin/tenant/dev theme selectors in naregua-identity.css. The integration aliases intentionally match the dark theme selectors' specificity so both component generations resolve to the canonical product neutrals and semantic colors. Use live CSS variables rather than hardcoding light values in new components.

The public landing uses the prefixed paper, cream, petroleum ink, pale copper and line variants recorded above, plus peach (`lp-highlight`) for restrained campaign accents; the opening is a light-copper/peach field with radial light and selected plan controls are copper. The public palette is petroleum, copper and ivory with peach accents: green and citrus are explicitly rejected. These scoped variants do not recolor the panel or remove operational semantic success colors.

## Typography

**Display and Body Font:** self-hosted Manrope, with the system fallbacks recorded above. The variable font serves interface and display; avoid adding a new display family.

The declared display and page sizes are role tokens, not universal computed heading sizes. Body controls use the body token; card titles and form labels use the recorded compact hierarchy. Booking mobile deliberately uses a lighter headline (500, clamp(34px, 9.2vw, 42px), 1.03 line height, -.045em tracking); the admin mobile title is 15px with 1.25 line height below 767px. Preserve those contextual differences.

Space Mono remains declared for numeric/code roles, but fonts.css currently self-hosts Manrope only. Do not claim the mono font is supplied locally. Use the existing local Hugeicons components for actions and navigation.

Public landing display and section roles are separately prefixed in frontmatter. The campaign heading becomes 3.1rem below 900px and clamp(2rem, 7.8vw, 3.1rem) with 1.23 line height below 640px. These expressive scales do not alter compact operational headings.

## Layout

The workspace uses a collapsible sidebar and flexible content column. Its declared content ceiling is 1680px, page gutter clamp(16px, 2.1vw, 34px), and compact gutter 12px. Shared surfaces use 20px internal padding, reduced to 16px below 640px. The spacing vocabulary follows four-pixel increments, with contextual gaps rather than nested cards for every grouping.

Below 767px the admin header wraps readable page context, retains a compact monogram above 360px and places team scope in its own content toolbar; at 360px and below the redundant header brand is omitted to preserve the full page title. Mobile operational navigation is a bottom dock. Booking uses a bounded shell (1220px) on desktop; below 820px it becomes a vertical journey with short progress labels, two-column photo-led service choices and a centered workspace up to 620px. Its field inputs use 16px on mobile. These breakpoint-specific arrangements are contextual, not one universal mobile breakpoint.

The public landing uses a 1200px content ceiling with 96px total desktop gutters, reducing to 80px below 1150px and 40px below 640px. Navigation collapses below 900px; the narrative, pricing and FAQ become single-column below 640px. Desktop section spacing reaches 128px; mobile sections generally use 70px. The opening is a distinct rounded block: width calc(100% - 48px), maximum 1392px, margin 24px auto 0 and radius 48px; below 640px it uses width calc(100% - 20px), 10px top margin and radius 28px. The selected page sequence and interaction story remain in the surface brief.

## Elevation & Depth

Tonal layering and thin borders do most structural work. Shared cards use the smallest ambient shadow; larger shadows belong to elevated panels and dialogs. Primary buttons are flat at rest and move upward one pixel on hover. The sidecar preserves the exact shadow and motion vocabulary. Short transitions use the standard ease; reduced motion collapses animations and transitions to .01ms and disables smooth scrolling.

Public landing depth comes from native-alpha ink-and-watercolor campaign cutouts, physically rendered phone artwork, the product frame, floating navigation and illustrative booking layers. Fictional mockup changes use opacity and short translation; story layers and price digits settle with the emphasized curve. Fine-pointer hero art follows a requestAnimationFrame spring (stiffness 220, damping 24), cancels at rest and is bypassed for reduced motion and coarse pointers. Reveals run once for 650ms. The landing reduced-motion mode removes transitions and animations, disables smooth scrolling and resets staged transforms; content and controls remain available. Exact scoped shadow and motion values are in the sidecar.

## Shapes

Controls have moderately rounded corners; cards, panels and photo surfaces grow softer at larger scales. Status chips are pills. Booking has its own roomier shell and service-card geometry, including a desktop shell radius of 30px and mobile photo cards of 20px; do not flatten those observed variants into the shared card token. Photography is realistically cropped with object-fit cover; the approved monogram remains intact.

The public landing radius tokens apply only to its opening, broad sections, photography, plan result and pill controls. Mobile broad surfaces use the prefixed mobile radius. Do not propagate these softer geometries into the panel.

## Components

### Buttons

Confident, compact controls: 44px minimum height, copper primary or raised-paper secondary, thin borders and 720 weight at .84rem. Hover darkens primary copper; ghost actions use transparent surfaces. The primary foreground follows the runtime on-accent variable. Shared button/input minimum height becomes 46px below 640px. Disabled controls use reduced opacity and a not-allowed cursor.

### Chips

Compact pills use soft neutral surfaces and body ink. Status variants pair semantic foreground and background colors; do not use tenant color for appointment meaning.

### Cards / Containers

Shared cards use raised paper, a soft one-pixel border, the card radius and smallest shadow. Headers divide with a line; descriptions remain subordinate. Avoid nesting another card where space or a separator is sufficient.

### Inputs / Fields

Raised-paper fields use a strong line, the control radius and recorded padding. Focus changes the border to action color and adds the three-pixel focus shadow. Booking integration explicitly raises placeholder, dossier, hints and inactive step copy to body ink. Generic faint placeholder styling elsewhere is not an accessibility endorsement.

### Navigation

Sidebar rows combine local rounded-stroke icons and labels. Active navigation uses a pale accent surface, action ink and an inset three-pixel accent marker; hover uses soft neutral fill. Preserve keyboard focus and accessible labels when collapsed. The booking step navigation reports current and completed progress with a thin underline and adapts its labels on mobile.

### Public Landing Artwork

Seven generated WebPs in `public/landing/art-v2` are current: hands, chair, conversation and phone have native alpha; agenda, team and finance are opaque. Product mockups use actual NaRégua screenshots and the official PNG as generation references, while remaining conceptual illustrations with fictitious data described in image alternatives. On 28 October 2026 the user explicitly removed visible demo captions and white logo bars. Desktop plates now crop their top 12.1% in CSS, without changing the WebPs; there is no ProductBrand overlay. Exact prompts live in `docs/assets/landing-art-v2-prompts.json`. Marble, resin, citrus and green campaign art are rejected.

### Public Landing Controls

Public copper pill buttons use the prefixed component token, a 52px minimum height and 700 weight; the hero button reaches 56px. Hover darkens copper and lifts 2px; active returns to rest. The public header is an 80px floating pill, contracts on scroll and exposes a button-controlled menu below 900px; Escape closes it and returns focus. Visible focus is a 3px copper outline with 5px offset. The title selector and pressed-state preview controls share the same demonstration selection. The team range chooses actual catalog bands; rolling digits are visual only, with a complete accessible currency label. Native details/summary supplies the FAQ. The existing checkout remains the transaction surface, and /acessar is the explicit access route.

### Public Access and Plan Dialog

The hero demo meets the bottom of the opening block; finance is housed in a native CSS notebook frame. `/acessar` uses a cream/copper composition with the existing chair illustration and a focused access form. The plan dialog uses selectable plan rows and an included-features aside, strong Manrope hierarchy and normal scrolling without grid shrink. Arrow keys, Home and End navigate plan selection. `landing-entry.css`, `LandingPage.tsx` and `LandingCheckout.tsx` own these public entry treatments; operational dashboards retain their system.

### Mestre AI

Use the established Mestre AI name, existing mark and Manrope wordmark. Assistant surfaces inherit product tokens rather than introducing a second brand palette.

## Do's and Don'ts

### Do:
- **Do** preserve the original NaRégua monogram and approved assets.
- **Do** use one primary action per context and real empty, loading and error states.
- **Do** adapt mobile composition and honor reduced motion.

### Don't:
- **Don't** let tenant accents recolor neutral surfaces or semantic states.
- **Don't** invent testimonials or product metrics. Preserve conceptual/fictitious descriptions in image alternatives; the user revoked visible demo captions. Never present generated images as actual screenshots.
- **Don't** introduce decorative gradients into operational screens; the public campaign may use commissioned abstract artwork and material backgrounds.

Existing drift is not normative: decorative date/section kickers and small faint metadata remain in inherited screens; generic faint table headers/placeholders and muted chips are not certified as contrast-compliant by their presence here. Legacy feature names, fallback wine values and Space Mono declarations do not authorize a new identity. This document does not repair that broader backlog. The earlier operational review disposition remains limited to its five resolved fixes; it is not a global accessibility audit. The prior art revision received a whole-page ship recommendation and Chromium/Firefox 10/10 checks; those results are historical and do not certify the current art-v2 replacement. Current validation evidence belongs in docs/surfaces/LANDING_RENEWAL.md.

TenantBrand images retain natural height and aspect ratio; their row grows for portrait logos. `tenant-brand.css` is imported last to override legacy fixed heights. The collapsed sidebar preserves its 44px logo width, while the mobile top bar grows automatically. Validation: `--brand-height` passed 5/5 checks, covering portrait and wide logos at 1440px and 390px plus browser errors; independent review approved the change.

The public setup atelier uses the real wordmark, cream/copper surfaces and chair illustration, without a gradient, eyebrow or badge. Its neutral alternative reads `Configurar por conta própria`; no gender field exists. Logo-derived palettes come from local pixel extraction, with honest image-source/fallback labeling and white-text contrast of at least 4.5:1. Runtime theme updates set and clear `--brand-primary-on-light` alongside the primary-700 value so hover actions retain the selected palette. Implementation and validation findings are recorded in `docs/SETUP_IDENTIDADE_2026-10-28.md`.

The public mobile landing is an independent atelier at widths up to 640px: `LandingPage` lazily selects `MobileLanding.tsx` with `mobile-atelier.css`, leaving desktop `LandingExperience` and its visual world unchanged. Shared `landingContent` keeps FAQ copy aligned. Mobile uses a dark petroleum hero, ivory text and copper/peach CTA; a step accordion with local confirmation; a warm finance section with original art; optional AI text; three real catalog plan rows; FAQ; and team artwork at closing. Three new native-alpha images in `public/landing/mobile-art` have exact prompts in `docs/assets/landing-mobile-art-prompts.json`. The prior mobile d3b49ab implementation and prototype were explicitly rejected and are not approval evidence. No conversion improvement has been measured. See `docs/LP_MOBILE_2026-10-28.md`.

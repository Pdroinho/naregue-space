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
typography:
  display:
    fontFamily: "Manrope, Segoe UI Variable, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 5vw, 4.8rem)"
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

Operational screens open in light mode, with a persistent petroleum dark option. Tenant logos and action accents may vary; neutral surfaces and semantic states remain product-owned. Existing landing composition is inherited rather than a template for every workflow.

**Key Characteristics:**
- Cream reading surfaces and petroleum structure.
- Manrope interface with local Hugeicons Stroke Rounded.
- Restrained copper actions and real barber photography.

This scan records the incumbent extension, not a new visual world. Evidence: PRODUCT.md, BRANDING.md, src/main.tsx, naregua-identity.css, naregua-integration.css, theme.ts, Shell.tsx and BookingPage.tsx; representative dashboard and booking review captures. Identity is imported after feature styles; integration is last. Frontmatter records default light primitives, not every feature override or runtime tenant value.

## Colors

Warm cream supports reading; petroleum provides structure; copper marks actions and selection.

### Primary

**Copper action** is the default action family. Tenant runtime branding replaces its scale and derives foreground contrast in theme.ts; static frontmatter is the unbranded default.

### Neutral

**Cream canvas, panel and raised paper** separate workspace layers. **Petroleum ink** supplies strong headings and body copy; soft and strong translucent lines divide content.

### Named Rules

**The Product Neutrals Rule.** Tenant branding changes the accent family and logo, never product surfaces or semantic colors.

Green, amber and coral belong to success, warning and danger. Dark mode replaces surface, ink, line, semantic and shadow values under the explicit admin/tenant/dev theme selectors in naregua-identity.css. The integration aliases intentionally match the dark theme selectors' specificity so both component generations resolve to the canonical product neutrals and semantic colors. Use live CSS variables rather than hardcoding light values in new components.

## Typography

**Display and Body Font:** self-hosted Manrope, with the system fallbacks recorded above. The variable font serves interface and display; avoid adding a new display family.

The declared display and page sizes are role tokens, not universal computed heading sizes. Body controls use the body token; card titles and form labels use the recorded compact hierarchy. Booking mobile deliberately uses a lighter headline (500, clamp(34px, 9.2vw, 42px), 1.03 line height, -.045em tracking); the admin mobile title is 15px with 1.25 line height below 767px. Preserve those contextual differences.

Space Mono remains declared for numeric/code roles, but fonts.css currently self-hosts Manrope only. Do not claim the mono font is supplied locally. Use the existing local Hugeicons components for actions and navigation.

## Layout

The workspace uses a collapsible sidebar and flexible content column. Its declared content ceiling is 1680px, page gutter clamp(16px, 2.1vw, 34px), and compact gutter 12px. Shared surfaces use 20px internal padding, reduced to 16px below 640px. The spacing vocabulary follows four-pixel increments, with contextual gaps rather than nested cards for every grouping.

Below 767px the admin header wraps readable page context, retains a compact monogram above 360px and places team scope in its own content toolbar; at 360px and below the redundant header brand is omitted to preserve the full page title. Mobile operational navigation is a bottom dock. Booking uses a bounded shell (1220px) on desktop; below 820px it becomes a vertical journey with short progress labels, two-column photo-led service choices and a centered workspace up to 620px. Its field inputs use 16px on mobile. These breakpoint-specific arrangements are contextual, not one universal mobile breakpoint.

## Elevation & Depth

Tonal layering and thin borders do most structural work. Shared cards use the smallest ambient shadow; larger shadows belong to elevated panels and dialogs. Primary buttons are flat at rest and move upward one pixel on hover. The sidecar preserves the exact shadow and motion vocabulary. Short transitions use the standard ease; reduced motion collapses animations and transitions to .01ms and disables smooth scrolling.

## Shapes

Controls have moderately rounded corners; cards, panels and photo surfaces grow softer at larger scales. Status chips are pills. Booking has its own roomier shell and service-card geometry, including a desktop shell radius of 30px and mobile photo cards of 20px; do not flatten those observed variants into the shared card token. Photography is realistically cropped with object-fit cover; the approved monogram remains intact.

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

### Mestre AI

Use the established Mestre AI name, existing mark and Manrope wordmark. Assistant surfaces inherit product tokens rather than introducing a second brand palette.

## Do's and Don'ts

### Do:
- **Do** preserve the original NaRégua monogram and approved assets.
- **Do** use one primary action per context and real empty, loading and error states.
- **Do** adapt mobile composition and honor reduced motion.

### Don't:
- **Don't** let tenant accents recolor neutral surfaces or semantic states.
- **Don't** invent testimonials, metrics or generated product screenshots.
- **Don't** introduce gradients except as readability masks over photography.

Existing drift is not normative: decorative date/section kickers and small faint metadata remain in inherited screens; generic faint table headers/placeholders and muted chips are not certified as contrast-compliant by their presence here. Legacy feature names, fallback wine values and Space Mono declarations do not authorize a new identity. This document does not repair that broader backlog. The completed review disposition is ship within the five explicitly scoped fixes, all resolved; it is not a global accessibility audit.

---
name: KARNA / CORE
colors:
  surface: '#0a141f'
  surface-dim: '#0a141f'
  surface-bright: '#303a46'
  surface-container-lowest: '#050f19'
  surface-container-low: '#121c27'
  surface-container: '#16202c'
  surface-container-high: '#212b36'
  surface-container-highest: '#2c3642'
  on-surface: '#d9e3f3'
  on-surface-variant: '#bbc9cc'
  inverse-surface: '#d9e3f3'
  inverse-on-surface: '#27313d'
  outline: '#869396'
  outline-variant: '#3c494c'
  surface-tint: '#4cd8ee'
  primary: '#daf8ff'
  on-primary: '#00363e'
  primary-container: '#61e8ff'
  on-primary-container: '#006774'
  inverse-primary: '#006876'
  secondary: '#a8c8ff'
  on-secondary: '#003061'
  secondary-container: '#3491ff'
  on-secondary-container: '#002955'
  tertiary: '#fff0e5'
  on-tertiary: '#492900'
  tertiary-container: '#ffcd9d'
  on-tertiary-container: '#85510e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9eefff'
  primary-fixed-dim: '#4cd8ee'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004e59'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#a8c8ff'
  on-secondary-fixed: '#001b3c'
  on-secondary-fixed-variant: '#004689'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#ffb86e'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#0a141f'
  on-background: '#d9e3f3'
  surface-variant: '#2c3642'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  badge-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  telemetry-caption:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies the ethos of precision systems engineering, computational telemetry, and high-performance software craft. It avoids the superficial trap of ornamental "cyberpunk" neon wash in favor of an architectural, high-fidelity instrument console aesthetic—restrained, technical, and unmistakably professional.

The visual style synthesizes **Technical Precision Minimalism** with **Deep-Space HUD Telemetry**:
- **Tonal Gravity:** Anchored in deep obsidian voids to eliminate ocular fatigue while framing dense technical data.
- **Architectural Rigor:** Structural 1px precision dividers, hairline Cartesian coordinate grids, and discrete corner notches evoke bespoke aerospace hardware, compiler terminals, and high-frequency infrastructure dashboards.
- **Controlled Luminescence:** Cyan and plasma blue accents are treated as active circuits and state indicators, applied with strict optical economy rather than ambient decorative blurs.
- **Target Audience:** Engineering managers, principal architects, and technical recruiters seeking absolute rigor, full-stack competency, and uncompromising attention to detail.

## Colors

The palette simulates a calibrated technical viewport operating within low ambient light.

- **Base Void (`#060B12`):** Primary canvas background. Deep obsidian, neutral-cool, absorbing light to create infinite structural depth.
- **Panel / Surface (`#101A25`):** Secondary container surface. A rich gunmetal that lifts interactive modules and system panels off the void.
- **Sub-Surface Elevation (`#162333`):** Tertiary elevated surface for cards, dropdown menus, and active computational nodes.
- **Precision Stroke / Hairline Grid (`#1E2D3D`):** 1px structural boundaries defining the layout lattice and container containment.
- **Reactor Cyan (`#61E8FF`):** Primary interactive accent and focus indicator. Denotes live status, active execution, key links, and system health.
- **Telemetry Blue (`#218CFF`):** Secondary accent for secondary actions, interactive data visualizations, and structural badges.
- **Engineering Copper / Gold (`#C98A45`):** Dedicated milestone and credential token. Applied to MCA academic honors, certifications, and architectural milestones.
- **Text Systems:**
  - **High-Contrast Cool White (`#EFF8FF`):** Primary labels, titles, and terminal commands.
  - **Muted Blueprint Blue-Grey (`#A7BACB`):** Secondary body, descriptive copy, and inactive state indicators.
  - **Terminal Carbon (`#4B637B`):** Ghost metadata, grid coordinate indices, and disabled items.

## Typography

Typography establishes an immediate balance between high-concept engineering hardware and human-centric software readability.

- **Space Grotesk (Headings):** Provides industrial, structural presence with crisp geometric apertures. Used strictly in upper range scales for system identifiers, page titles, and project titles. Always track display scales slightly tighter (`-0.02em` to `-0.03em`) to mimic machined industrial typography.
- **Inter (Body Copy):** Handles dense descriptions, architectural narratives, and project breakdowns. Inter provides neutral clarity and high legibility across dark backdrops, resisting glow distortion.
- **JetBrains Mono (Metadata, Badges, Metrics):** Deployed for numerical telemetry, commit hashes, technological stacks, SIESCOMS course codes, and interface status flags. Always rendered uppercase in label roles with open tracking (`+0.05em` to `+0.08em`) to sustain technical rhythm.

## Layout & Spacing

The spatial environment uses a rigid, modular coordinate system. All components adhere strictly to a 4px base increment, with macro spatial grouping anchored at 8px, 16px, 24px, and 40px intervals.

- **Grid Architecture:** 12-column layout on desktop (max width 1280px, auto-centered) flanked by optional precision coordinate markers (`L-01`, `R-01`) rendered in `#4B637B`. Collapses to a 6-column grid on tablet, and a single-column modular stack on mobile.
- **Technical Framing:** Structural panels and interactive blocks do not bleed ambiguously into space; they are enclosed within explicit hairline perimeter lines (`#1E2D3D`).
- **Mobile Adaptations:** Outer margins drop to `1.25rem` (`20px`) on mobile viewports while preserving minimum touch targets of `44px × 44px` across all interactive targets and navigation links. Element stacking remains clean and unified without horizontal overflow.

## Elevation & Depth

Rather than relying on generic drop shadows, elevation is achieved via **structural surface tiers and selective photonic glow**:

1. **Base Plane (Level 0 - `#060B12`):** The master canvas. Often overlaid with a faint hairline grid (`1px` lines at `48px` intervals in `#101A25`).
2. **Panel Tier (Level 1 - `#101A25`):** Structural content wrappers, technical sidebars, and navigation rails. Defined by a continuous `1px` border in `#1E2D3D`.
3. **Card & Interactive Tier (Level 2 - `#162333`):** Hoverable items, code viewer surfaces, project cards, and active credential blocks.
4. **Photonic Emission (Hover & Focus States):**
   - Interactive components manifest restrained energy when engaged: `box-shadow: 0 0 16px -2px rgba(97, 232, 255, 0.25), inset 0 0 0 1px #61E8FF`.
   - Milestone items (copper tier) emit warm focus: `box-shadow: 0 0 16px -2px rgba(201, 138, 69, 0.25), inset 0 0 0 1px #C98A45`.
5. **Precision Notches:** Distinctive technical corners (diagonal chamfers or inner corner notches of `4px`) appear on primary structural containers to ground the aerospace hardware visual language.

## Shapes

The design system employs a **Soft Engineering (`roundedness: 1`)** geometry:

- Standard elements (buttons, inputs, telemetry chips) utilize subtle `0.25rem` (`4px`) radii, providing structural stability without brutalist sharpness or toy-like pill curves.
- Larger structural panels adopt `0.5rem` (`8px`) or use micro-chamfered/beveled corners (`clip-path: polygon(...)`) to express industrial hardware characteristics.
- System metrics and circular status diodes remain strict geometric circles (`50%`), creating immediate graphic contrast against the rectangular architectural grid.

## Components

### Buttons
- **Primary (Core Execution):** Solid `#61E8FF` background with `#060B12` high-contrast bold typography. On hover, background shifts to pure white `#FFFFFF` with a localized cyan perimeter glow (`0 0 12px rgba(97, 232, 255, 0.45)`).
- **Secondary (Subsystem Action):** Transparent background with `1px solid #1E2D3D` and cool white text `#EFF8FF`. On hover, border activates to `#218CFF` with background tinting to `rgba(33, 140, 255, 0.08)`.
- **Engineering / Terminal Action:** JetBrains Mono uppercase badge with prepended operational glyph (`> EXEC_`, `// REPO`).

### Technical Badges & Chips
- **Stack Indicator:** Background `#101A25`, border `1px solid #1E2D3D`, text `#A7BACB` in JetBrains Mono. Prefix with a discrete 4px cyan dot for active frameworks (e.g., `● NEXT.JS`, `● FASTAPI`).
- **Academic / Milestone Badge (SIESCOMS / SDE):** Copper edition with border `1px solid #C98A45`, text `#C98A45`, background `rgba(201, 138, 69, 0.08)`.

### Project & Metrics Cards
- Constructed with `#101A25` surface and `1px solid #1E2D3D` perimeter.
- **Telemetry Header:** Top rail contains micro-metadata (e.g., `LATENCY: 12ms`, `BUILD: SUCCESS`, `SYS_REV: 02.4`) in JetBrains Mono (`11px`, `#4B637B`).
- **Notched Frame Accent:** Top-right or bottom-left corner features a precision corner tick or chamfer indicator.

### Input Fields & Terminal Consoles
- Background `#060B12`, border `1px solid #1E2D3D`, text `#EFF8FF`.
- Active focus invokes a solid `#61E8FF` hairline outline with zero radius displacement and an absolute 1px cyan caret.

### Checkboxes & Toggle Controls
- Custom square components (`16px × 16px`) with 1px border `#1E2D3D`. Checked state fills `#61E8FF` with an obsidian check mark, accompanied by an instantaneous 100ms hardware-style transition.

### Telemetry / SDE Status Pill
- Fixed or header-anchored indicator: `STATUS: OPEN FOR SDE ROLES`. Features an active pulsing reactor LED (`6px` circle alternating between `#61E8FF` at 100% and 40% opacity via an ambient 2-second pulse cycle).
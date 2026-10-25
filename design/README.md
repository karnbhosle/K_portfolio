# Design provenance

The visual language was generated with the connected **Stitch MCP** in private project `4839009819091884978` (KARNA / CORE). No credentials are stored in this repository.

- Design system: `assets/7711881164605486118`, exported as `resources/stitch_karna_core_portfolio_ui/karna_core/DESIGN.md`
- Screen references: `stitch/initiation.html`, `stitch/transition.html` and `stitch/portfolio.html`
- Diagram references: `resources/stitch_karna_core_portfolio_ui/*_diagram/`

These exports are references, **not content sources or deployable pages**. Stitch filled them with invented telemetry (latency, flux and "energy matrix" readings), fabricated model metrics, AQI readings, investment figures, unverified badges and an unexplained handle. None of that is used.

## What the application takes from the references

The current frontend is an original implementation of the design system, not a pixel port:

- **Palette and roles.** OLED black canvas, reactor cyan for live and interactive state only, engineering copper for milestones (the MCA in progress, the 2nd-place result, CorpusAI), and a muted blue-grey text scale. Text and control colours meet WCAG AA.
- **Type.** Space Grotesk for display, Inter for reading, JetBrains Mono for short metadata labels only. Fonts are self-hosted with `next/font/local` from `apps/web/src/app/fonts` (SIL Open Font License files included).
- **Console details.** Hairline structure, corner ticks on the two framed surfaces, an indexed 01–06 section system that matches the navigation, and the "Open to SDE roles" status pill.
- **The arc reactor.** One SVG drawn in layers, reused by the ignition intro (the signature moment) and the faint background reactor pinned behind every section. Glow comes from gradients rather than blur filters to stay cheap to composite.
- **Layouts.** The left navigation rail and ignition flow from the Stitch screens, rebuilt with real anchors, a mobile menu dialog and layouts verified from 320px up.

The project diagrams were redrawn from canonical content (`architecture`, `pipeline` and `features` in `packages/shared/src/seed.ts`), so they are legible on a phone and state nothing the CV does not. The AQI scale describes the public CPCB standard, labelled as such.

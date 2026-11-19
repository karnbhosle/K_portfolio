/**
 * The decorative layer every interactive card shares: a glare that follows the pointer and HUD
 * corner brackets that close in on hover. Place inside a relative `.tilt-card[data-tilt-card]`.
 */
export function HudDecor({ tone = 'text-cyan' }: { tone?: string }) {
  return (
    <>
      <span className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />
      <span className={`hud-corners pointer-events-none absolute inset-3 ${tone}`} aria-hidden="true" />
    </>
  );
}

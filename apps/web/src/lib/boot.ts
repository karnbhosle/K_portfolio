/** Keys shared by the pre-paint boot script and the client preference stores. */
export const storageKeys = {
  motion: 'karna:motion',
  sound: 'karna:sound',
  intro: 'karna:intro',
  draft: 'karna:contact-draft',
} as const;

// Crawlers and audit tools get the page without the intro; the content is identical.
const automatedAgents = 'bot|crawl|spider|slurp|lighthouse|pagespeed|facebookexternalhit|embedly|preview';

/**
 * Runs before first paint, so the page never flashes the wrong state:
 * - data-motion: the stored choice, else the OS reduced-motion setting
 * - data-sound: the stored intro sound choice
 * - data-intro: "pending" on the first visit of a session, unless a section link was opened directly
 */
export const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');try{
var m=localStorage.getItem('${storageKeys.motion}');
d.dataset.motion=m==='on'||m==='off'?m:(matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on');
var s=localStorage.getItem('${storageKeys.sound}');d.dataset.sound=s==='off'?'off':'on';
if(location.pathname==='/'&&sessionStorage.getItem('${storageKeys.intro}')!=='done'&&!location.hash&&!/${automatedAgents}/i.test(navigator.userAgent)){d.dataset.intro='pending';
setTimeout(function(){if(!window.__karnaIntroReady){delete d.dataset.intro;}},8000);}
}catch(e){d.dataset.motion=d.dataset.motion||'on';}})();`;
// The timeout is a failsafe: if the app never hydrates, the intro must not trap the visitor.

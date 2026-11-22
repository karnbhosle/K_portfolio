import type { ReactNode } from 'react';
import type { Portfolio } from '@karna/shared';
import { ArrowUpRight, Clock, GitHub, MapPin, Phone } from '@/components/ui/icons';
import { sections } from '@/lib/sections';
import { order } from '@/lib/style';
import { ContactForm } from './contact-form';
import { CopyEmail } from './copy-email';
import { LocalTime } from './local-time';
import { taglines } from '@/lib/copy';
import Image from 'next/image';
import { headshot } from '@/lib/assets';
import { ContactCore } from '@/components/holo/contact-core';
import { ContactGlobe } from '@/components/holo/contact-globe';

export function ContactSection({ portfolio }: { portfolio: Portfolio }) {
  const { profile } = portfolio;
  const githubHandle = profile.github ? new URL(profile.github).pathname.replace(/^\/+/, '') : null;

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative pt-28 sm:pt-40">
      <div className="shell relative">
        <header className="relative" data-reveal>
          {/* The empty side of the headline on wide screens: the arc core, in 3D. */}
          <ContactCore />
          <p className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-subtle" aria-hidden="true">
            <span><span className="text-cyan">06</span> / {String(sections.length).padStart(2, '0')}</span>
            <span className="draw-x h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {/* Who you are writing to. */}
            <span className="avatar relative inline-flex h-16 w-16 shrink-0 rounded-full" aria-hidden="true">
              <span className="avatar-ring absolute -inset-1 rounded-full" />
              <Image src={headshot.path} alt="" width={headshot.width} height={headshot.height} sizes="4rem" className="relative h-16 w-16 rounded-full border border-cyan-line bg-surface object-cover" />
              <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-black bg-cyan" />
            </span>
            {profile.availability ? (
              <p className="inline-flex items-center gap-2.5 rounded-full border border-cyan-line bg-black/50 py-1.5 pl-3 pr-3.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-cyan">
                <span className="status-led h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" />
                {profile.availability}
              </p>
            ) : null}
          </div>
          <h2 id="contact-title" className="mt-6 max-w-[16ch] text-case font-semibold">
            <span className="sr-only">Contact: </span>{taglines.contact.lead} <span className="block text-cyan">{taglines.contact.punch}</span>
          </h2>
          <p className="mt-8 max-w-measure text-body-lg text-ink-muted">
            Email is the quickest way to reach me. I reply from Mumbai, on India Standard Time.
          </p>
        </header>

        <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-6 sm:mt-16 sm:py-8" data-reveal>
          <a
            href={profile.emailHref}
            className="group inline-flex min-w-0 items-center gap-3 font-display text-[clamp(1.375rem,0.6rem+3.6vw,3.75rem)] font-medium tracking-[-0.035em] text-ink transition-colors duration-fast hover:text-cyan [overflow-wrap:anywhere]"
          >
            <span className="min-w-0">{profile.email}</span>
            <ArrowUpRight size={36} strokeWidth={1.3} className="hidden shrink-0 text-ink-subtle transition-transform duration-base ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-cyan sm:block" />
          </a>
          <CopyEmail email={profile.email} />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="relative lg:col-span-4" data-reveal>
            <h3 className="label mb-5">Direct</h3>
            <ul className="divide-y divide-line border-y border-line">
              <Channel icon={<Phone />} term="Phone">
                <a href={profile.phoneHref} className="inline-block py-1 font-medium tabular-nums text-ink hover:text-cyan">{profile.phoneDisplay}</a>
              </Channel>
              <Channel icon={<MapPin />} term="Location">
                <p className="py-1 text-ink">{profile.location}</p>
              </Channel>
              <Channel icon={<Clock />} term="Local time">
                <p className="py-1 text-ink"><LocalTime timeZone={profile.timeZone} fallback="IST, UTC+5:30" /></p>
              </Channel>
              {profile.github && githubHandle ? (
                <Channel icon={<GitHub />} term="GitHub">
                  <a href={profile.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 py-1 font-medium text-ink hover:text-cyan">
                    {githubHandle} <ArrowUpRight size={15} className="text-ink-subtle" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Channel>
              ) : null}
            </ul>
            <ContactGlobe />
          </div>

          <div className="lg:col-span-8" data-reveal style={order(1)}>
            <ContactForm email={profile.email} emailHref={profile.emailHref} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Channel({ icon, term, children }: { icon: ReactNode; term: string; children: ReactNode }) {
  return (
    <li className="channel-row group relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 py-4">
      <span className="channel-sweep pointer-events-none absolute inset-0" aria-hidden="true" />
      <span className="relative mt-1 text-ink-subtle transition-colors duration-fast group-hover:text-cyan" aria-hidden="true">{icon}</span>
      <div className="relative min-w-0 transition-transform duration-base ease-out group-hover:translate-x-1">
        <p className="label">{term}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

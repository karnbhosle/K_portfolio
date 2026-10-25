import type { ReactNode } from 'react';
import type { Portfolio } from '@karna/shared';
import { ArrowUpRight, Clock, GitHub, Mail, MapPin, Phone } from '@/components/ui/icons';
import { order } from '@/lib/style';
import { SectionHeader } from './section-header';
import { ContactForm } from './contact-form';
import { CopyEmail } from './copy-email';
import { LocalTime } from './local-time';

export function ContactSection({ portfolio }: { portfolio: Portfolio }) {
  const { profile } = portfolio;
  const githubHandle = profile.github ? new URL(profile.github).pathname.replace(/^\/+/, '') : null;

  return (
    <section id="contact" aria-labelledby="contact-title" className="pt-24 sm:pt-32">
      <SectionHeader id="contact" index="06" title="Contact">
        <p>Let&rsquo;s build something meaningful. {profile.availability ? `${profile.availability}; ` : ''}email is the quickest way to reach me.</p>
      </SectionHeader>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5" data-reveal>
          <h3 className="label mb-5">Direct</h3>
          <ul className="divide-y divide-line border-y border-line">
            <Channel icon={<Mail />} term="Email">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <a href={profile.emailHref} className="min-w-0 break-all py-1 font-medium text-ink hover:text-cyan">{profile.email}</a>
                <CopyEmail email={profile.email} />
              </div>
            </Channel>
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
        </div>

        <div className="lg:col-span-7" data-reveal style={order(1)}>
          <ContactForm email={profile.email} emailHref={profile.emailHref} />
        </div>
      </div>
    </section>
  );
}

function Channel({ icon, term, children }: { icon: ReactNode; term: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 py-4">
      <span className="mt-1 text-ink-subtle" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="label">{term}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

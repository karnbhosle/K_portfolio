import { getPortfolio, siteUrl } from '@/lib/portfolio';
import { formatFacts } from '@/lib/format';
import { IgnitionIntro } from '@/components/intro/ignition-intro';
import { AmbientReactor } from '@/components/reactor/ambient-reactor';
import { SiteChrome } from '@/components/site/site-chrome';
import { SiteFooter } from '@/components/site/site-footer';
import { ClientRuntime } from '@/components/site/client-runtime';
import { AboutSection } from '@/components/sections/about-section';
import { QualificationsSection } from '@/components/sections/qualifications-section';
import { ProjectsSection } from '@/components/sections/projects-section';
import { SkillsSection } from '@/components/sections/skills-section';
import { ActivitiesSection } from '@/components/sections/activities-section';
import { ContactSection } from '@/components/sections/contact-section';

export const revalidate = 60;

export default async function Home() {
  const portfolio = await getPortfolio();
  const { profile } = portfolio;
  const url = siteUrl();

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.displayName,
    alternateName: profile.fullName,
    jobTitle: profile.role,
    description: profile.headline,
    email: profile.emailHref,
    telephone: profile.phoneHref.replace(/^tel:/, ''),
    address: { '@type': 'PostalAddress', addressLocality: profile.location, addressCountry: 'IN' },
    knowsLanguage: profile.languages,
    knowsAbout: portfolio.skillGroups.flatMap((group) => group.skills),
    affiliation: { '@type': 'EducationalOrganization', name: profile.institution },
    ...(profile.github ? { sameAs: [profile.github] } : {}),
    ...(url ? { url: url.href } : {}),
  };

  return (
    <>
      <IgnitionIntro name={profile.displayName} tagline={`${profile.role} · ${formatFacts(profile.educationLine)}`} />
      <div id="site" className="relative">
        <AmbientReactor />
        <SiteChrome name={profile.displayName} role={profile.role} footnote={formatFacts(profile.educationLine)} />
        <div className="relative z-10 lg:pl-sidebar">
          <div className="mx-auto max-w-content px-5 sm:px-8 lg:px-12 xl:px-16">
            <main id="main" tabIndex={-1} className="outline-none">
              <AboutSection portfolio={portfolio} />
              <QualificationsSection portfolio={portfolio} />
              <ProjectsSection portfolio={portfolio} />
              <SkillsSection portfolio={portfolio} />
              <ActivitiesSection portfolio={portfolio} />
              <ContactSection portfolio={portfolio} />
            </main>
            <SiteFooter profile={profile} />
          </div>
        </div>
      </div>
      <ClientRuntime />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }}
      />
    </>
  );
}

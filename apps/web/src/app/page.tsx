import { getPortfolio, siteUrl } from '@/lib/portfolio';
import { formatFacts } from '@/lib/format';
import { IgnitionIntro } from '@/components/intro/ignition-intro';
import { CoreJourney } from '@/components/reactor/core-journey';
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
    ...(profile.portrait ? { image: url ? new URL(profile.portrait.path, url).href : profile.portrait.path } : {}),
  };

  const links = {
    email: profile.email,
    emailHref: profile.emailHref,
    phoneHref: profile.phoneHref,
    phoneDisplay: profile.phoneDisplay,
    github: profile.github,
    repositories: portfolio.projects.map((project) => ({ name: project.name, url: project.repository })),
  };

  return (
    <>
      <IgnitionIntro name={profile.displayName} tagline={`${profile.role} · ${formatFacts(profile.educationLine)}`} />
      <div id="site" className="relative">
        <div className="backdrop" aria-hidden="true" />
        <CoreJourney />
        <SiteChrome name={profile.displayName} role={profile.role} footnote={formatFacts(profile.educationLine)} links={links} />
        <div className="relative z-10">
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
      <ClientRuntime />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }}
      />
    </>
  );
}

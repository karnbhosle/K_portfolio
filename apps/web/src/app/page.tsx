import Image from 'next/image';
import { getPortfolio, siteUrl } from '@/lib/portfolio';
import { Header } from '@/components/header';
import { ContactForm } from '@/components/contact-form';
import { Certificate } from '@/components/certificate';
import { ReactorFrame } from '@/components/reactor-frame';
import { ReactorArtwork, ProjectArtwork } from '@/components/stitch-artwork';
import type { Project } from '@karna/shared';

function SectionHeading({ number, title, note }: { number: string; title: string; note: string }) {
  return <div className="section-heading"><div><span className="section-number">{number}</span><h2>{title}</h2></div><span className="section-note">{note}</span></div>;
}

function ProjectShowcase({ project, index }: { project: Project; index: number }) {
  return <article className={`project-showcase ${project.visual === 'finance' ? 'project-copper' : ''}`} data-reveal>
    <div className="project-visual">
      <div className="visual-caption"><span className="micro-label">{project.visual === 'air' ? 'ATMOSPHERIC SYSTEMS' : 'FINANCIAL SYSTEMS'}</span><span aria-hidden="true">↗</span></div>
      {project.screenshot
        ? <Image src={project.screenshot.path} alt={project.screenshot.alt} width={project.screenshot.width} height={project.screenshot.height} loading="lazy" className="project-screenshot" />
        : <><ProjectArtwork kind={project.visual} /><p className="illustration-note">Illustrative system study · not a project screenshot</p></>}
      <div className="architecture" aria-label={`${project.name} architecture`}>
        {project.architecture.nodes.map((node, i) => <div className="architecture-step" key={node}><span>{node}</span>{i < project.architecture.nodes.length - 1 && <span className="architecture-arrow" aria-hidden="true">↓</span>}</div>)}
        <div className="architecture-database">{project.architecture.nodes[1]} ↔ {project.architecture.database}</div>
      </div>
    </div>
    <div className="project-content">
      <span className="micro-label project-index">PROJECT / 0{index + 1}</span>
      <h3>{project.name}</h3><p className="project-subtitle">{project.subtitle}</p>
      <p className="project-summary">{project.summary}</p>
      <ul className="project-highlights">{project.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
      <div className="stack-list" aria-label={`${project.name} technology stack`}>{project.stack.map(tech => <span key={tech}>{tech}</span>)}</div>
      <a className="text-link repository-link" href={project.repository} target="_blank" rel="noopener noreferrer">View repository <span aria-hidden="true">↗</span><span className="sr-only"> for {project.name} (opens in a new tab)</span></a>
      <details className="technical-details"><summary>Explore technical details <span aria-hidden="true">+</span></summary><div><p>{project.architecture.note}</p><ul>{project.details.map(detail => <li key={detail}>{detail}</li>)}</ul></div></details>
    </div>
  </article>;
}

export default async function Home() {
  const portfolio = await getPortfolio();
  const { profile } = portfolio;
  const [firstName, ...familyNames] = profile.displayName.split(' ');
  const url = siteUrl();
  const person = {
    '@context': 'https://schema.org', '@type': 'Person', name: profile.displayName,
    alternateName: profile.fullName, description: profile.role, email: profile.email,
    telephone: profile.phoneDisplay, homeLocation: { '@type': 'Place', name: profile.location },
    knowsLanguage: profile.languages,
    affiliation: { '@type': 'EducationalOrganization', name: profile.institution },
    ...(url ? { url: url.href } : {}),
  };
  return <>
    <Header />
    <main id="main-content" className="page-shell">
      <section id="know-karna" className="hero-section">
        <SectionHeading number="01" title="Know Karna" note="THE PERSON BEHIND THE CODE" />
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span aria-hidden="true" />{profile.role}</p>
            <h1>{firstName}{' '}<span>{familyNames.join(' ')}<span className="name-dot" aria-hidden="true">.</span></span></h1>
            <div className="cyan-rule" aria-hidden="true" />
            <p className="education-line">{profile.educationLine}</p>
            <p className="introduction">{profile.introduction}</p>
            <div className="hero-actions"><a className="button button-primary" href="#projects">View Projects <span aria-hidden="true">↗</span></a><a className="button button-outline" href="#contact">Contact Me <span aria-hidden="true">→</span></a>{profile.publicResume && <a className="text-link" href={profile.publicResume.path} download>Download resume ↓</a>}</div>
          </div>
          <ReactorFrame><span className="reactor-label micro-label">ORIGINAL REACTOR STUDY</span><ReactorArtwork /><div className="reactor-caption"><span className="tiny-line" /><span>ENGINEERING AT THE CORE</span><span className="tiny-line" /></div></ReactorFrame>
        </div>
        <div className="hero-meta"><div className="focus-areas">{profile.focusAreas.map(area => <span key={area}><i aria-hidden="true" />{area}</span>)}</div><div className="personal-meta"><span>{profile.location}</span><span>{profile.languageProficiency}</span></div></div>
      </section>

      <section id="qualifications">
        <SectionHeading number="02" title="Qualifications" note="FOUNDATIONS & CONTINUED LEARNING" />
        <div className="qualifications-grid">
          <ol className="education-timeline">{portfolio.education.map((education, i) => <li key={education.id} data-reveal data-delay={i * 0.06}><div className="timeline-node" aria-hidden="true" /><div className="timeline-top"><span className="micro-label">{education.period}</span>{education.status && <span className="pursuing">{education.status}</span>}</div><h3>{education.degree}</h3><p>{education.institution}</p></li>)}</ol>
          <div className="training-column">{portfolio.training.map(training => <article className="training-card" key={training.id} data-reveal><span className="micro-label">SPECIALIZED TRAINING</span><div className="training-symbol" aria-hidden="true">⌘</div><h3>{training.title}</h3><p className="training-provider">{training.provider}</p><p>{training.duration} <span aria-hidden="true">/</span> {training.mode}</p><span className="training-date">{training.date}</span>{training.certificate && <Certificate asset={training.certificate} title={training.title} />}</article>)}</div>
        </div>
      </section>

      <section id="projects">
        <SectionHeading number="03" title="Projects" note="FULL-STACK & APPLIED MACHINE LEARNING" />
        <p className="section-intro">{profile.headline}</p>
        <div className="projects-list">{portfolio.projects.map((project, index) => <ProjectShowcase project={project} index={index} key={project.id} />)}</div>
      </section>

      <section id="technical-skills">
        <SectionHeading number="04" title="Technical Skills" note="THE ENGINEERING TOOLKIT" />
        <div className="skills-grid">{portfolio.skillGroups.map((group, i) => <article className="skill-panel" key={group.category} data-reveal data-delay={(i % 3) * 0.06}><div className="skill-heading"><span className="module-symbol" aria-hidden="true">{['⌘', '⌑', '↔', '▤', '⋈', '◇', '⌁'][i]}</span><h3>{group.category}</h3></div><ul>{group.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></article>)}</div>
      </section>

      <section id="activities">
        <SectionHeading number="05" title="Co-Curricular Activities" note="BEYOND THE CLASSROOM" />
        <h3 className="group-heading">Hackathons &amp; Achievements</h3>
        <div className="achievements-grid">{portfolio.activities.achievements.map(achievement => <article className="achievement-card" key={achievement.id} data-reveal><span className="achievement-symbol" aria-hidden="true">{achievement.result ? '✧' : '◇'}</span>{achievement.result && <p className="achievement-result">{achievement.result}</p>}<h4>{achievement.title}</h4>{achievement.location && <p>{achievement.location}</p>}{achievement.designation && <p>{achievement.designation}</p>}{achievement.date && <p>{achievement.date}</p>}{achievement.description && <p>{achievement.description}</p>}{achievement.certificate ? <Certificate asset={achievement.certificate} title={achievement.title} /> : <p className="certificate-empty"><span aria-hidden="true">▧</span> Certificate to be added</p>}</article>)}</div>
        <h3 className="group-heading leadership-heading">Extra-Curricular &amp; Leadership</h3>
        {portfolio.activities.leadership.map(activity => <article className="leadership-card" key={activity.id} data-reveal><div><span className="micro-label">CAMPUS / COMMUNITY</span><h4>{activity.title}</h4><p>{activity.institution}, {activity.location}</p></div><div><p className="leadership-role">{activity.role}</p><p>{activity.description}</p><ul>{activity.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul></div></article>)}
      </section>

      <section id="contact" data-reveal>
        <SectionHeading number="06" title="Contact Me" note="START A CONVERSATION" />
        <div className="contact-grid"><div className="contact-copy" data-reveal><h3>Let&apos;s build<br />something <span>meaningful.</span></h3><p>Have a role, an idea, or a question? I&apos;d be glad to hear from you.</p><div className="contact-links"><a href={profile.emailHref}><span className="micro-label">EMAIL</span><span>{profile.email} <b aria-hidden="true">↗</b></span></a><a href={profile.phoneHref}><span className="micro-label">PHONE</span><span>{profile.phoneDisplay} <b aria-hidden="true">↗</b></span></a></div><p className="contact-location">{profile.location}</p></div><ContactForm emailHref={profile.emailHref} /></div>
      </section>
    </main>
    <footer className="footer"><div className="footer-inner"><a href="#know-karna" className="brand"><span className="brand-mark">KB</span><span>KARNA <span className="brand-slash">/</span> CORE</span></a><span>Built with curiosity. Grounded in engineering.</span><a href="#know-karna">Back to top ↑</a></div></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }} />
  </>;
}

/* ── Personal content — edit this file to update the portfolio ── */

const DATA = {
  user: 'hermann',
  hostname: 'portfolio',

  about: `Hermann Aust
Automotive Engineer · Software-Based Solutions

I bridge the gap between mechanical engineering and software — designing
embedded systems, toolchains, and data-driven solutions for the automotive
industry.

Currently focused on software architecture, automation, and anything that
makes cars smarter and engineers faster.`,

  skills: `Languages & Tools
─────────────────────────────────────────────────────

  Languages    Python · C · C++ · MATLAB · Bash · JavaScript
  Embedded     AUTOSAR · CAN / LIN / FlexRay · ADAS toolchains
  DevOps       Git · Docker · CI/CD · Linux
  Other        Signal processing · Data analysis · Raspberry Pi

─────────────────────────────────────────────────────`,

  contact: `Contact & Links
─────────────────────────────────────────────────────

  GitHub     https://github.com/hermanno3005
  Email      hermannaut00@gmail.com
  LinkedIn   https://www.linkedin.com/in/hermann-aust/

─────────────────────────────────────────────────────
  Type 'open github' to open GitHub in a new tab.`,

  projects: [
    {
      id: 'portfolio',
      name: 'portfolio',
      description: 'This terminal-style portfolio website — Ghostty-themed, vanilla JS, hosted on a Raspberry Pi.',
      stack: ['HTML', 'CSS', 'JavaScript'],
      url: 'https://github.com/hermanno3005/portfolio',
    },
    // Add more projects below:
    // {
    //   id: 'my-project',
    //   name: 'my-project',
    //   description: 'Short description.',
    //   stack: ['Python', 'CAN'],
    //   url: 'https://github.com/hermanno3005/my-project',
    // },
  ],

  links: {
    github:   'https://github.com/hermanno3005',
    linkedin: 'https://www.linkedin.com/in/hermann-aust/',
    email:    'hermannaut00@gmail.com',
  },

  /* Virtual filesystem tree */
  fs: {
    '/': { type: 'dir', children: ['home'] },
    '/home': { type: 'dir', children: ['hermann'] },
    '/home/hermann': {
      type: 'dir',
      children: ['about.txt', 'projects', 'skills.txt', 'contact.txt', 'cv.pdf'],
    },
    '/home/hermann/about.txt': { type: 'file', content: null /* filled at runtime */ },
    '/home/hermann/skills.txt': { type: 'file', content: null },
    '/home/hermann/contact.txt': { type: 'file', content: null },
    '/home/hermann/cv.pdf': { type: 'file', content: '__CV__' },
    '/home/hermann/projects': { type: 'dir', children: [] /* filled at runtime */ },
  },
};

/* Populate dynamic fs entries from project list */
(function initFs() {
  DATA.fs['/home/hermann/about.txt'].content = DATA.about;
  DATA.fs['/home/hermann/skills.txt'].content = DATA.skills;
  DATA.fs['/home/hermann/contact.txt'].content = DATA.contact;

  DATA.projects.forEach(p => {
    const path = `/home/hermann/projects/${p.id}.md`;
    DATA.fs['/home/hermann/projects'].children.push(`${p.id}.md`);
    DATA.fs[path] = {
      type: 'file',
      content: [
        `# ${p.name}`,
        '',
        p.description,
        '',
        `Stack: ${p.stack.join(' · ')}`,
        p.url ? `URL:   ${p.url}` : '',
      ].filter(l => l !== undefined).join('\n'),
    };
  });
})();

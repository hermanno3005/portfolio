/* ── Personal content — edit this file to update the portfolio ── */

const DATA = {
  user: 'hermann',
  hostname: 'portfolio',
  lang: 'en',

  /* ── Locales ── */
  locales: {
    en: {
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

      projectDescriptions: [
        'This terminal-style portfolio website — Ghostty-themed, vanilla JS, hosted on a Raspberry Pi.',
      ],

      neofetchRole: 'Automotive Engineer · Software',
      welcome: "Hey, nice to meet you.\nI'm Hermann, have fun looking around.",
      helpHint: "Type 'help' to see available commands.",

      help: `<span class="cyan bold">Available commands</span>
<span class="dim">───────────────────────────────────────────────────────────</span>
  <span class="green">whoami</span>      · About me
  <span class="green">ls</span>          · List directory contents
  <span class="green">cd</span>          · Change directory
  <span class="green">cat</span>         · Display file contents
  <span class="green">pwd</span>         · Print current directory
  <span class="green">open</span>        · Open a URL or download CV  (open github / open cv.pdf)
  <span class="green">projects</span>    · List my projects
  <span class="green">skills</span>      · Display my skill set
  <span class="green">contact</span>     · Show contact information
  <span class="green">neofetch</span>    · System info + ASCII art
  <span class="green">uname</span>       · Kernel/system info
  <span class="green">echo</span>        · Print text
  <span class="green">history</span>     · Show command history
  <span class="green">man</span>         · Show manual for a command
  <span class="green">lang</span>        · Switch language  (lang de / lang en)
  <span class="green">clear</span>       · Clear the terminal
<span class="dim">───────────────────────────────────────────────────────────</span>
  Use <span class="cyan">Tab</span> to autocomplete · <span class="cyan">↑ ↓</span> to navigate history`,
    },

    de: {
      about: `Hermann Aust
Automotive Ingenieur · Softwarebasierte Lösungen

Ich überbrücke die Lücke zwischen Maschinenbau und Software — ich entwickle
eingebettete Systeme, Toolchains und datengetriebene Lösungen für die
Automobilindustrie.

Aktuell fokussiert auf Softwarearchitektur, Automatisierung und alles, was
Autos intelligenter und Ingenieure schneller macht.`,

      skills: `Sprachen & Werkzeuge
─────────────────────────────────────────────────────

  Sprachen     Python · C · C++ · MATLAB · Bash · JavaScript
  Embedded     AUTOSAR · CAN / LIN / FlexRay · ADAS-Toolchains
  DevOps       Git · Docker · CI/CD · Linux
  Sonstiges    Signalverarbeitung · Datenanalyse · Raspberry Pi

─────────────────────────────────────────────────────`,

      contact: `Kontakt & Links
─────────────────────────────────────────────────────

  GitHub     https://github.com/hermanno3005
  E-Mail     hermannaut00@gmail.com
  LinkedIn   https://www.linkedin.com/in/hermann-aust/

─────────────────────────────────────────────────────
  Tippe 'open github' um GitHub in einem neuen Tab zu öffnen.`,

      projectDescriptions: [
        'Diese terminal-basierte Portfolio-Website — Ghostty-Design, reines JavaScript, gehostet auf einem Raspberry Pi.',
      ],

      neofetchRole: 'Automotive Ingenieur · Software',
      welcome: "Hey, schön dich kennenzulernen.\nIch bin Hermann, viel Spaß beim Stöbern.",
      helpHint: "Tippe 'help' für eine Übersicht der Befehle.",

      help: `<span class="cyan bold">Verfügbare Befehle</span>
<span class="dim">───────────────────────────────────────────────────────────</span>
  <span class="green">whoami</span>      · Über mich
  <span class="green">ls</span>          · Verzeichnisinhalt anzeigen
  <span class="green">cd</span>          · Verzeichnis wechseln
  <span class="green">cat</span>         · Dateiinhalt anzeigen
  <span class="green">pwd</span>         · Aktuelles Verzeichnis anzeigen
  <span class="green">open</span>        · URL öffnen oder CV herunterladen  (open github / open cv.pdf)
  <span class="green">projects</span>    · Projekte auflisten
  <span class="green">skills</span>      · Fähigkeiten anzeigen
  <span class="green">contact</span>     · Kontaktdaten anzeigen
  <span class="green">neofetch</span>    · Systeminfo + ASCII-Art
  <span class="green">uname</span>       · Kernel-/Systeminfo
  <span class="green">echo</span>        · Text ausgeben
  <span class="green">history</span>     · Befehlsverlauf anzeigen
  <span class="green">man</span>         · Handbuch für einen Befehl
  <span class="green">lang</span>        · Sprache wechseln  (lang de / lang en)
  <span class="green">clear</span>       · Terminal leeren
<span class="dim">───────────────────────────────────────────────────────────</span>
  <span class="cyan">Tab</span> zur Autovervollständigung · <span class="cyan">↑ ↓</span> für Befehlsverlauf`,
    },
  },

  projects: [
    {
      id: 'portfolio',
      name: 'portfolio',
      description: '',
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

  /* Derived from active locale — do not edit directly */
  about: '',
  skills: '',
  contact: '',

  /* Virtual filesystem tree */
  fs: {},

  /* Switch language and rebuild all derived content */
  setLang(lang) {
    if (!this.locales[lang]) return false;
    this.lang = lang;
    const l = this.locales[lang];

    this.about   = l.about;
    this.skills  = l.skills;
    this.contact = l.contact;

    this.projects.forEach((p, i) => {
      if (l.projectDescriptions[i] !== undefined) {
        p.description = l.projectDescriptions[i];
      }
    });

    this._initFs();
    return true;
  },

  _initFs() {
    this.fs = {
      '/': { type: 'dir', children: ['home'] },
      '/home': { type: 'dir', children: ['hermann'] },
      '/home/hermann': {
        type: 'dir',
        children: ['about.txt', 'projects', 'skills.txt', 'contact.txt', 'cv.pdf'],
      },
      '/home/hermann/about.txt':   { type: 'file', content: this.about },
      '/home/hermann/skills.txt':  { type: 'file', content: this.skills },
      '/home/hermann/contact.txt': { type: 'file', content: this.contact },
      '/home/hermann/cv.pdf':      { type: 'file', content: '__CV__' },
      '/home/hermann/projects':    { type: 'dir', children: [] },
    };

    this.projects.forEach(p => {
      const path = `/home/hermann/projects/${p.id}.md`;
      this.fs['/home/hermann/projects'].children.push(`${p.id}.md`);
      this.fs[path] = {
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
  },
};

/* Boot with English */
DATA.setLang('en');

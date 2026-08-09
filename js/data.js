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

Dipl.-Ing. in Mechanical Engineering — Automotive Engineering, TU Dresden.
Passionate about bridging the gap between automotive engineering and software, working towards safer autonomous driving.
Currently working in OEM projects: prototype development, CAN bus analysis, and Python-based tooling.`,

      skills: `Languages & Tools
─────────────────────────────────────────────────────
  OEM-Tools     E-SYS · EDIABAS · SWL · INPA · SWHRL · ZEDIS
  Languages     Python · MATLAB
  Embedded      CAN / LIN / FlexRay · Vector Tools
  Dev Workflows Git · Docker · CI/CD
  Other         Signal processing · Data analysis

─────────────────────────────────────────────────────`,

      contact: `Contact & Links
─────────────────────────────────────────────────────

  GitHub     https://github.com/hermanno3005
  Email      hermannaust00@gmail.com
  LinkedIn   https://www.linkedin.com/in/hermann-aust/

─────────────────────────────────────────────────────
  Type 'open github' to open GitHub in a new tab.`,

      projectDescriptions: [
        'Python pipeline that strips weather and terrain out of my running data to show the fitness trend underneath - built on the intervals.icu and Open-Meteo APIs.',
        'This terminal-style portfolio website - Ghostty-themed, vanilla JS, hosted on Cloudflare.',
        /* TODO: verify wording — and replace the em-dashes with plain hyphens, as the
           active entries above do — then uncomment together with the projects below.
        'Self-hosted home server on a Raspberry Pi — Docker stack with Home Assistant, Matter server and OpenThread Border Router for a Matter-over-Thread smart home.',
        'Claude-powered personal training coach with access to my full workout history via the COROS API.',
        'Data logger based on the HUAdapter Gen 2 for evaluating automated driving functions — built as my Diplomarbeit at TU Dresden.', */
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

Diplom-Ingenieur Maschinenbau — Vertiefung Fahrzeugtechnik, TU Dresden.
Mit Leidenschaft dabei, die Lücke zwischen Fahrzeugtechnik und Software zu schließen — für sichereres autonomes Fahren.
Derzeit in OEM-Projekten tätig: Prototypenentwicklung, CAN-Bus-Analyse und Python-Tooling.`,

      skills: `Sprachen & Werkzeuge
─────────────────────────────────────────────────────
  OEM-Tools     E-SYS · EDIABAS · SWL · INPA · SWHRL · ZEDIS
  Sprachen      Python · MATLAB
  Embedded      CAN / LIN / FlexRay · Vector-Tools
  Dev-Workflows Git · Docker · CI/CD
  Sonstiges     Signalverarbeitung · Datenanalyse

─────────────────────────────────────────────────────`,

      contact: `Kontakt & Links
─────────────────────────────────────────────────────

  GitHub     https://github.com/hermanno3005
  E-Mail     hermannaust00@gmail.com
  LinkedIn   https://www.linkedin.com/in/hermann-aust/

─────────────────────────────────────────────────────
  Tippe 'open github' um GitHub in einem neuen Tab zu öffnen.`,

      projectDescriptions: [
        'Python-Pipeline, die Wetter und Topografie aus meinen Laufdaten herausrechnet und den Fitness-Trend darunter sichtbar macht - auf Basis der APIs von intervals.icu und Open-Meteo.',
        'Diese terminal-basierte Portfolio-Website - Ghostty-Design, reines JavaScript, gehostet auf Cloudflare.',
        /* TODO: verify wording — and replace the em-dashes with plain hyphens, as the
           active entries above do — then uncomment together with the projects below.
        'Selbst gehosteter Home-Server auf einem Raspberry Pi — Docker-Stack mit Home Assistant, Matter-Server und OpenThread Border Router für ein Matter-over-Thread Smart Home.',
        'Claude-basierter Personal-Trainer mit Zugriff auf meine komplette Trainingshistorie über die COROS-API.',
        'Datenlogger auf Basis des HUAdapter Gen 2 zur Bewertung automatisierter Fahrfunktionen — entstanden als Diplomarbeit an der TU Dresden.', */
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
      id: 'pacelab',
      name: 'PaceLab',
      description: 'normalized pace from grade, heat and wind',
      stack: ['Python', 'SQLite', 'Docker'],
      url: 'https://github.com/hermanno3005/pacelab',
      runnable: true,
    },
    {
      id: 'portfolio',
      name: 'portfolio',
      description: 'terminal-like portfolio website',
      stack: ['HTML', 'CSS', 'JavaScript'],
      url: 'https://github.com/hermanno3005/portfolio',
    },
    /* TODO: verify descriptions/stacks, then uncomment together with the
       projectDescriptions entries in BOTH locales above (order must match).
    {
      id: 'hermipi',
      name: 'HermiPi — Home Server',
      description: 'self-hosted smart home stack',
      stack: ['Linux', 'Docker', 'Home Assistant', 'Matter / Thread'],
    },
    {
      id: 'ai-coach',
      name: 'Personal AI Coach',
      description: 'Claude-powered training coach',
      stack: ['Python', 'n8n', 'Claude API', 'COROS API'],
    },
    {
      id: 'datalogger',
      name: 'Vehicle Data Logger',
      description: 'Diplomarbeit',
      stack: ['Python', 'GNSS / IMU', 'ROS'],
    }, */
  ],

  links: {
    github:   'https://github.com/hermanno3005',
    linkedin: 'https://www.linkedin.com/in/hermann-aust/',
    email:    'hermannaust00@gmail.com',
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
    document.documentElement.lang = lang;
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

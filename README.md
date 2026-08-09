# hermann-aust.com

Terminal-style portfolio — a fake zsh session in the browser, themed after
[Ghostty](https://ghostty.org)'s dark default. Vanilla HTML/CSS/JS, no build
step, no runtime dependencies, deployed on Cloudflare.

<!-- TODO: add a screenshot
![screenshot](assets/screenshot.png) -->

## Features

- Interactive shell: `help`, `whoami`, `ls`/`cd`/`cat` over a virtual filesystem,
  tab completion, command history, `neofetch`, a `sudo rm -rf /` easter egg
- Bilingual content (`lang en` / `lang de`)
- CV download in both languages (`open cv`)
- Recruiter card instead of the terminal on touch devices ≤900px
- Self-hosted JetBrains Mono (variable font, OFL — see `assets/fonts/`),
  no third-party requests

## Editing content

Everything personal lives in **`js/data.js`** — about text, skills, projects,
links, and both locales. The virtual filesystem and the mobile card are
generated from it.

## Develop & deploy

```sh
npx wrangler dev      # local preview
npx wrangler deploy   # deploy to Cloudflare
```

`.assetsignore` keeps repo plumbing (this file, `wrangler.jsonc`, the test
setup, …) out of the deployed assets.

## Tests

```sh
npm install   # once — vitest and jsdom, devDependencies only
npm test      # run the suite
npm run test:watch
```

The site itself still has no build step and no runtime dependencies: nothing
under `node_modules/` or `test/` is ever served. Tests drive the real terminal
through `Term.run('…')` in a jsdom copy of `index.html` and assert on what a
visitor would see in `#output` — see `test/harness.js`.

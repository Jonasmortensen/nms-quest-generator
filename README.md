# No Man's Sky Quest Generator

A small React + Vite app that generates procedural, No Man's Sky flavored
quests from data tables. Installable as a PWA on mobile.

## Development

```bash
npm install
npm run dev
```

Run the unit tests for the templating engine:

```bash
npm test
```

## How it works

- `src/data/*.json` holds the raw data tables: items, locations, and task
  templates.
- `src/lib/questEngine.js` is a framework agnostic, dependency free
  templating engine (pure functions, no React). It resolves placeholders
  like `[item?type=mineral&craftable=true]`, `[location?allowsTrade=true]`,
  and `[10-30]` (a random integer in that range) against the data tables.
  Each placeholder in a template is resolved independently, so two
  `[item]` placeholders in the same template can resolve to different
  items. If a filter matches no rows, the engine substitutes
  `{no matching item found}` and logs a console warning instead of
  crashing.
- `src/hooks/useQuestGenerator.js` wraps the engine in a hook that holds
  a batch of 5 quests in state and exposes `regenerate()`.
- `src/components/QuestList.jsx` and `QuestCard.jsx` render the batch,
  each `QuestCard` showing a single resolved objective.

Because the engine has no React dependency, it can be unit tested in
isolation (see `src/lib/questEngine.test.js`) or reused outside this UI.

## Sending objectives to an LLM

The "Copy AI Prompt" button copies the current batch of 5 objectives to
the clipboard, wrapped in instructions asking an LLM to weave them into
a single chronological narrative with flavor text before, between, and
after each objective.

- `src/data/promptTemplate.json` holds the wrapping prompt text as a
  template string with `{{count}}` and `{{objectives}}` placeholders.
- `src/lib/promptBuilder.js` is a small, dependency free module (see
  `promptBuilder.test.js`) that numbers the objectives in order and
  fills in the template.
- `src/components/CopyPromptButton.jsx` copies the built prompt to the
  clipboard and shows a brief "Copied!" confirmation.

This is a copy/paste workflow today. It's written this way (pure
template + pure builder function) so it's easy to later swap the button
for a direct API call to an LLM without touching the prompt content
itself.

## Deploying to GitHub Pages

This repo is configured to deploy automatically via GitHub Actions
(`.github/workflows/deploy.yml`) on every push to `main`, using GitHub's
official Pages actions (no manual `gh-pages` branch or deploy step).

**One-time setup on GitHub:** in the repo's Settings -> Pages, set
"Source" to "GitHub Actions".

**Important — the base path must match your repo name.** `vite.config.js`
sets:

```js
const REPO_NAME = 'nms-quest-generator'
base: `/${REPO_NAME}/`,
```

If you rename or fork this repo, update `REPO_NAME` in `vite.config.js`
to match the new repository name, or the built assets and the PWA
manifest will resolve to the wrong path once deployed.

## PWA

The manifest (name, icons, theme colors, `display: standalone`) and
service worker are generated at build time by `vite-plugin-pwa` from the
config in `vite.config.js` — there's no hand written manifest file to
keep in sync. The two placeholder icons in `public/icons/` (192x192 and
512x512 PNGs) are simple generated colored squares; swap them for real
artwork whenever you like, keeping the same filenames and sizes, or
update the `manifest.icons` entries in `vite.config.js` if you rename
them.

After the first visit, built assets are cached by the service worker so
the app keeps working offline.

## Extending

The engine is intentionally small and isolated so it's easy to grow:

- add new data tables by dropping a JSON file in `src/data/` and passing
  it through in the `data` object built in `useQuestGenerator.js`
- add weighted rarity by changing how `pickRandomRow` selects a
  candidate in `questEngine.js`
- add a "lock this objective" feature or filter controls in the UI
  without touching `questEngine.js` at all, since it has no knowledge of
  React or component state

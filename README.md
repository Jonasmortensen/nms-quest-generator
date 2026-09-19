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

- `src/data/items.json` and `src/data/locations.json` are the raw data
  tables used to resolve placeholders.
- `src/data/tasks.json` is the pool of task templates. Each entry is
  `{ "task": "<template string>", "prerequisites": { ... } }`.
  `prerequisites` is a plain object of fact name to required value (e.g.
  `{ "hasFreighter": true }`); an empty object means the task has no
  restrictions and is always eligible. See "Task prerequisites &
  Save Info" below for where those facts come from.
- `src/lib/questEngine.js` is a framework agnostic, dependency free
  templating engine (pure functions, no React). It resolves placeholders
  like `[item?type=mineral&craftable=true]`, `[location?allowsTrade=true]`,
  and `[10-30]` (a random integer in that range) against the data tables.
  Each placeholder in a template is resolved independently, so two
  `[item]` placeholders in the same template can resolve to different
  items. If a filter matches no rows, the engine substitutes
  `{no matching item found}` and logs a console warning instead of
  crashing. `generateQuestBatch` also filters out tasks whose
  `prerequisites` don't match the current facts (via `prerequisitesMet`)
  before picking from the remaining eligible pool.
- `src/hooks/useQuestGenerator.js` wraps the engine in a hook that holds
  a batch of 5 quests in state and exposes `regenerate()`. It takes the
  current facts as an argument so regenerating always respects the
  latest Save Info answers. It also tracks progress through the batch as
  a single `activeIndex`: objectives are completed strictly in order
  (top to bottom), so that one number is enough to derive every card's
  status — everything before it is completed, the one at it is active,
  everything after it is upcoming. The batch and progress are persisted
  to `localStorage` (via `src/lib/storage.js`), so reloading the page or
  navigating away and back keeps the same objectives and progress —
  only clicking "Generate 5 New" replaces them.
- `src/components/QuestList.jsx` and `QuestCard.jsx` render the batch in
  order. The active objective is highlighted yellow with a "Complete"
  button (advances `activeIndex`); completed ones are green with a
  "Play From Here" button (rewinds `activeIndex` back to that objective,
  un-completing everything after it); the rest are dimmed grey.

Because the engine has no React dependency, it can be unit tested in
isolation (see `src/lib/questEngine.test.js`) or reused outside this UI.

## Pages & navigation

The app has two pages, switched with `react-router-dom`'s `HashRouter`
(chosen so GitHub Pages doesn't need a server rewrite rule for deep
links — `#/save-info` never leaves `index.html`):

- **Quest Generator** (`src/pages/QuestGeneratorPage.jsx`) — the
  objective batch, the narrative prompt form, and the copy button.
- **Save Info** (`src/pages/SaveInfoPage.jsx`) — a form of persistent
  facts about the player's save (see below).

Both pages share `src/components/QuestionForm.jsx`, a generic
questions-as-radio-buttons renderer driven by a `{ id, question,
options }[]` array; it doesn't know or care whether its answers are
persisted or session-only.

## Task prerequisites & Save Info

`src/data/saveInfoQuestions.json` is the pool of questions on the Save
Info page, e.g. `{ "id": "hasFreighter", "question": "Do you own a
freighter?", "options": ["Yes", "No"] }`. Add more by appending to this
array the same way as `promptQuestions.json`.

- `src/hooks/usePersistedAnswers.js` is like `usePromptAnswers` but
  reads/writes its answers to `localStorage`, so they survive reloads
  and future visits instead of resetting each session.
- `src/lib/saveInfo.js` (`answersToFacts`) converts those answers into a
  flat facts object for the engine: a Yes/No question becomes a boolean
  keyed by its `id` (e.g. `{ hasFreighter: true }`); any other question
  is passed through as its raw string answer. This is what a task's
  `prerequisites` object is checked against.
- `QuestGeneratorPage` reads the same persisted answers, converts them
  with `answersToFacts`, and passes the result into `useQuestGenerator`
  so only eligible tasks are ever picked.

To add a new gated task, give it a `prerequisites` entry keyed by a
Save Info question's `id`, e.g. `{ "hasFreighter": true }` for a task
that should only appear once the player owns a freighter.

## Sending objectives to an LLM

Below the generated objectives is a "Narrate this questline" section with
a short multiple choice form, followed by a "Copy AI Prompt" button. The
button copies the current batch of 5 objectives to the clipboard, wrapped
in instructions asking an LLM to weave them into a single chronological
narrative with flavor text before, between, and after each objective.

- `src/data/promptQuestions.json` is the pool of setup questions shown
  in the form, e.g. `{ "id": "location", "question": "Where are you?",
  "options": [...] }`. Add more questions by appending to this array;
  each one gets its own set of radio buttons and, unless answered,
  defaults to its first option.
- `src/hooks/usePromptAnswers.js` holds the current answer to each
  question in state (session-only; see Save Info below for the
  persisted variant).
- `src/components/QuestionForm.jsx` renders the pooled questions as
  radio button groups.
- `src/data/promptTemplate.json` holds the wrapping prompt text as a
  template string with `{{count}}`, `{{context}}`, and `{{objectives}}`
  placeholders.
- `src/lib/promptBuilder.js` is a small, dependency free module (see
  `promptBuilder.test.js`): `formatAnswers` turns the question answers
  into a "Starting context" bullet list, `formatObjectivesList` numbers
  the objectives in order, and `buildNarrativePrompt` fills in the
  template with both.
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

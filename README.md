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
  `{ "task": "<template string>", "prerequisites": { ... }, "effects":
  { ... } }`. Both `prerequisites` and `effects` are plain objects keyed
  by a player state schema entry's `id` (e.g. `{ "hasFreighter": true }`);
  an empty object means "no restriction" / "no change". `prerequisites`
  gates whether the task can be picked; `effects` are applied to player
  state once the objective is marked complete — e.g. a "requisition a
  freighter" task can have `"effects": { "hasFreighter": true }` to
  update player state the moment it's completed. See "Task
  prerequisites, effects & player state" below for where that state
  comes from and how effects get written back.
- `src/lib/questEngine.js` is a framework agnostic, dependency free
  templating engine (pure functions, no React). It resolves placeholders
  like `[item?type=mineral&tags=craftable]`, `[location?allowsTrade=true]`,
  and `[10-30]` (a random integer in that range) against the data tables.
  When a field's value is an array (e.g. an item's `tags`), the filter
  checks membership instead of equality, so `tags=craftable` reads as
  "tags includes craftable" — this is how `items.json` marks which
  items can be crafted, rather than a dedicated boolean field. Each
  placeholder in a template is resolved independently, so two `[item]`
  placeholders in the same template can resolve to different items. If
  a filter matches no rows, the engine substitutes
  `{no matching item found}` and logs a console warning instead of
  crashing. `generateQuestBatch` also filters out tasks whose
  `prerequisites` don't match the current facts (via `prerequisitesMet`)
  before picking each objective, and resolves the chosen task's
  `effects` onto the returned quest object (`{ id, text, effects }`) —
  a non-string effect value (e.g. a boolean) passes through as-is, and a
  string effect value is resolved as its own template, reusing any
  placeholder already resolved in that task's `task` text so an effect
  can refer back to the exact value the player saw (see "Task
  prerequisites, effects & player state" below). Eligibility isn't
  decided once for the whole batch: it's simulated objective by
  objective, folding each picked objective's resolved `effects` into a
  running copy of the facts before picking the next one. So if
  objective 2's `effects` change `currentLocation`, objective 3 is
  picked from tasks whose `prerequisites` match *that* location, not
  whatever the player's location was when "Generate 5 New" was clicked —
  the batch reads as one locally-consistent sequence rather than five
  independent rolls. If a step ever finds no eligible tasks, generation
  stops there (with a console warning) and whatever was already
  generated is returned, so a batch can come back shorter than 5 rather
  than crashing or discarding valid earlier objectives.
- `src/hooks/useQuestGenerator.js` wraps the engine in a hook that holds
  a batch of 5 quests in state and exposes `regenerate()`. It takes the
  current player state as an argument so regenerating always respects
  its latest values. It also tracks progress through the batch as
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

## Task prerequisites, effects & player state

`src/data/playerStateSchema.json` describes every piece of persisted
player state as `{ id, default, formQuestion? }`, e.g.:

```json
[
  {
    "id": "hasFreighter",
    "default": false,
    "formQuestion": { "label": "Do you own a freighter?", "options": ["Yes", "No"] }
  },
  { "id": "currentLocation", "default": "Unknown" }
]
```

`default` is already typed (a boolean, a string, ...) — that typed
value is the canonical form the persisted player state is stored in,
and it's exactly what a task's `prerequisites` and `effects` are
expressed in, so the quest engine needs no conversion at all. An entry
with a `formQuestion` shows up as a radio-button question on the Save
Info page; an entry without one (like `currentLocation` above) is
hidden from the form entirely and can only ever be changed by a task's
`effects`.

The only place a readable, labelled form (e.g. "Yes"/"No") exists is at
the Save Info form's boundary, and `src/lib/playerState.js` is the
single place that translates between it and the typed state:

- `schemaToFormQuestions(schema)` — renders the entries that have a
  `formQuestion` into the `{ id, question, options }` shape
  `QuestionForm.jsx` expects; entries without one are omitted.
- `valueToLabel(entry, value)` / `labelToValue(entry, label)` — convert
  one entry's typed value to/from its form label. Boolean entries
  round-trip through a Yes/No-style label (matched case-insensitively,
  so it works regardless of how the options were capitalized); any
  other entry's label is its value.
- `stateToFormAnswers(schema, state)` / `formAnswerToValue(schema, id,
  label)` — apply the above across the whole persisted state, for
  populating and updating the form.

Wiring:

- `src/hooks/usePlayerState.js` persists the typed state object to
  `localStorage`, defaulting every entry from its schema `default`, so
  it survives reloads and future visits instead of resetting each
  session.
- `QuestGeneratorPage` reads that state directly and passes it into
  `useQuestGenerator` so only tasks whose `prerequisites` match are ever
  picked.
- When the active objective is marked complete, `QuestGeneratorPage`
  applies that quest's `effects` straight onto the player state (no
  label conversion needed, since effects are already typed), so Save
  Info — and the form on the Save Info page — update immediately to
  reflect what just happened in the fiction.

The top of the Quest Generator page also has a "Show Debug State"
toggle (`src/components/DebugStatePanel.jsx`) that dumps the full
persisted player state object as raw key/value pairs — including
entries with no `formQuestion` (like `currentLocation`), which the Save
Info form itself never shows. It's off by default, and lives here
rather than on the Save Info page so you can watch state change live as
`effects` are applied while completing objectives.

To add a new gated task, give it a `prerequisites` entry keyed by a
player state schema entry's `id`, e.g. `{ "hasFreighter": true }` for a
task that should only appear once the player owns a freighter. To make
a task change player state when completed, give it an `effects` entry
the same way, e.g. `{ "hasFreighter": true }` on a "requisition a
freighter" task.

An `effects` value can also be a template string, resolved the same way
as `task` — and if it contains a placeholder that also appears in that
task's own `task` text, it reuses the *exact same resolved value*
rather than rolling a new one. This is how `{ "task": "Go to [location]",
"effects": { "currentLocation": "[location]" } }` sets `currentLocation`
to whichever location the task actually sent the player to, instead of
a fresh, unrelated one. An effect placeholder that *doesn't* appear in
the task's text resolves independently as normal (see
`resolveTemplate`'s `cache`/`record` options and `resolveEffects` in
`questEngine.js`).

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

Clicking "Generate 5 New" also writes the "Where are you?" answer into
player state's `currentLocation` (see `QuestGeneratorPage.handleRegenerate`),
since it doubles as where the player is starting this new questline
from. The updated value is passed straight into that same `regenerate()`
call — `useQuestGenerator`'s `regenerate` accepts an optional override
for exactly this, so the new batch's `prerequisites` checks see the
just-set location immediately rather than the render's stale copy.

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

**Known gap (TODO):** "Play From Here" rewinds `activeIndex` but does not
undo player state changes made by the `effects` of the objectives it
un-completes (see the TODO comment on `playFromHere` in
`useQuestGenerator.js`). Fixing this needs a snapshot of the state (or
just the prior value of each overwritten key) taken alongside each quest
when it's completed, then replayed in reverse down to the rewind point.

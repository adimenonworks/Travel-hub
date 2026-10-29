# Trip Hub

A collaborative vacation planner. People create trips, invite others with a link, and plan together: day-by-day itinerary, ideas board with voting, budget, weather/news/map, and a home dashboard with a visited-places map.

- **Live site:** https://adimenonworks.github.io/Travel-hub/
- **Owner:** learning to build apps. Explain what you change and why in plain language, and add a one-line explanation in brackets for any jargon.

## Publishing

- Any push to the repo's **default branch** builds and deploys automatically (`.github/workflows/deploy.yml`, about 1 minute). Other branches build nothing.
- A change is only live once it's on the default branch. **Publish every change by default**: once the build and checks pass and nothing needs the owner's attention (a rules re-publish, a decision, a known problem), open a PR, merge it and confirm the workflow run is green, without asking first. If something does need their attention, ask before publishing.
- Optional second host: Firebase Hosting at https://travel-hub-a1aa2.web.app runs only if the `FIREBASE_SERVICE_ACCOUNT` repo secret exists (see README).

## Stack

- React 19 + TypeScript + Vite. Hash routing (`/#/trip/:id`) because GitHub Pages can't route paths.
- Firebase Auth (Google sign-in) + Firestore, project `travel-hub-a1aa2`. The web config is in `.env.production`; it's public by design, and security comes from `firestore.rules`.
- With no Firebase config (e.g. `npm run dev` without `.env.local`), the app runs in **demo mode** using localStorage. This is how to test locally.
- External APIs (free, no keys): Open-Meteo (weather + city search), OpenStreetMap/Leaflet (maps), Nominatim (address lookup). Fonts: Manrope is bundled (`@fontsource-variable/manrope`); Clash Display Bold loads from Fontshare's CDN (`index.html`), so the sandbox falls back to Manrope.

## Code layout

```
src/app/        router (App.tsx) + shell (sticky top bar with tabs)
src/data/       types.ts, Store interface (store.ts), firebaseStore.ts, localStore.ts, hooks.tsx
src/design/     tokens/ (primitives → semantic → typography) + components/
src/features/   home, trip (Itinerary, plan page, Ideas, Budget, Photos, People, forms), profile (incl. Your travels), auth, design page, shared
src/lib/        dates, format, weather, geocode, categories, theme, prefs, image, authErrors
firestore.rules + tests/rules/   security rules and their emulator tests
```

## Rules for changes

- **Design system:** bold, bright and rounded, inspired by Wise. `DESIGN.md` (repo root) is the Wise reference spec; follow it except where this file says otherwise. In short: pale neutral canvas with white cards, Clash Display Bold for page titles and big numbers only (`--font-display`), Manrope everywhere else (`--font-heading` for titles, `--font-text`), one brand colour (emerald #2EE6B6) with its deep partner as text, pill-shaped controls and 24px card corners. Deliberate departures from DESIGN.md: emerald instead of Wise green, a dark mode, pill (not 24px) buttons and inputs, and WCAG AA contrast wins over any value in the spec. Colour: `primitives.css` holds five palettes (emerald, green, orange, red, neutral) from white (0) to #181D1B (1000), each step at the same contrast against white, plus see-through black/white (`--p-alpha-*`). Components use only the semantic groups in `semantic.css` (`--text-*`, `--icon-*`, `--status-*`, `--surface-*`, `--interactive-*`, `--border-*`, `--disabled-*`, `--overlay-*`), which match the Figma "Color" collection name for name. Display text (page titles, the `t-display` style) uses `--text-brand`; other headings, body and form text are greys only. Emerald is for display titles, links, brand text and icons. Interactive states: hover is lighter, pressed is darker (`--interactive-*-hover` / `-pressed`). Categories have no colours: they're told apart by icon on `--surface-brand-subtle`. Never put text in a bright colour on a light background. Use semantic tokens from `src/design/tokens/semantic.css` and components from `src/design/components/`. Never hard-code colors, sizes or radii. Add new tokens or components there and show them on the `/#/design` page (a builder's reference, deliberately not linked in the app's navigation; open it by URL).
- **Responsive:** nothing smaller than 14px from 744px up (the small type steps up there; phones keep 12–13px); compact < 744px (bottom sheets), regular 744–1067px, wide ≥ 1068px. Tap targets ≥ 44px, no horizontal scroll at 390px, light and dark mode.
- **Accessibility:** WCAG 2.2 AA. Text ≥ 4.5:1 contrast, control outlines and focus rings ≥ 3:1, never colour alone for state, every control has an accessible name. Check new colour pairs in light and dark mode, on every surface they can sit on.
- **Data:** UI code talks only to the `Store` interface. Any new data operation must be added to **both** `firebaseStore.ts` and `localStore.ts`. Dates are `YYYY-MM-DD` strings and times are `HH:mm`.
- **Security:** a new Firestore collection or field rule needs a matching change in `firestore.rules`, plus tests in `tests/rules/rules.test.mjs`. If the rules changed, the owner must re-publish them in the Firebase console. The owner isn't technical: never ask them to edit or add to anything. Paste the **entire** `firestore.rules` file in your reply as one code block, with numbered click-by-click steps (console.firebase.google.com → project travel-hub-a1aa2 → Firestore Database → Rules tab → select all and delete → paste → Publish). Make app code work with both the old and new rules, since they may publish later.
- Watch for `fn?.(await x())`: if `fn` is undefined, `x()` never runs. Await into a variable first.

## Before pushing

1. `npm run build` (type-checks and builds).
2. Exercise the change in demo mode with Playwright (pre-installed, `require('playwright')`). Check 390px and 1440px widths, and dark mode.
3. If rules changed: `cd tests/rules && npm install && npm test` (needs Java; the Firestore emulator downloads on first run).

## Roadmap / open ideas

- Gmail import of reservations (restricted read-only Gmail permission; capped at 100 test users unless Google verifies the app)
- PDF/file uploads (needs Firebase Blaze plan for Storage; today links are used instead). Trip cover photos avoid this by shrinking to ≤ 300 KB JPEG and storing the data URL in the trip doc (`src/lib/image.ts`).
- AI recommendations for nearby cafés, bars and activities
- More home-dashboard widgets

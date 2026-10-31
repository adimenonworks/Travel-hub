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
- External APIs (free, no keys): Open-Meteo (weather + city search), OpenStreetMap/Leaflet (maps), Nominatim (address lookup). Fonts are bundled from npm: Manrope (`@fontsource-variable/manrope`) and Poppins Black (`@fontsource/poppins/latin-900.css`).

## Code layout

```
src/app/        router (App.tsx) + shell (no top bar: hands your profile avatar to every Page Header; owns the New trip sheet via useNewTrip)
src/data/       types.ts, Store interface (store.ts), firebaseStore.ts, localStore.ts, hooks.tsx
src/design/     tokens/ (primitives → semantic → typography) + components/
src/features/   home, trip (Itinerary, plan page, Ideas, budget card + spending sheet, Photos, People, forms), profile (Your travels, collections), auth, design page, shared
src/lib/        dates, format, weather, geocode, countries (circle-flags), categories, theme, prefs, image, authErrors
firestore.rules + tests/rules/   security rules and their emulator tests
```

## Rules for changes

- **Figma is the source of truth:** file `cXoK1GzmzgqY0cmcgJw66W` (page "Foundations"). Token and component names in code match Figma 1:1: variable `interactive/button/primary/background` is `--interactive-button-primary-background`, text style "Heading 1" is `.t-heading-1`, primitives are `--color-emerald-300`, `--space-16`, `--radius-24`. Figma's Typography "Small" mode is the default; "Regular+" applies from 744px. Icons are Uicons Rounded in `src/design/components/icons.ts`, each with `state="default"` (line) and `state="filled"` (solid, brand colour). Trip components from Figma live in `TripCards.tsx`: `HeroCard`, `ContentCard`, `EventRow`, `BudgetCard`, `Timeline` (Size=Small below 744px, Large from 744px, via `useLarge`). Every page starts with the Figma Page Header (`PageHeader`): back button, Display title (Display secondary, 40px, on phones), an optional primary icon button (edit trip on trip pages, new trip on Home) and your avatar. Illustrations use only the `--illustration-*` tokens. Never add or change anything that isn't in Figma: recommend it, the owner designs it, then build it. Change Figma first (or with the code), never only the code.
- **Design system:** bold, bright and rounded, inspired by Wise. `DESIGN.md` (repo root) is the Wise reference spec; follow it except where this file says otherwise. In short: pale neutral canvas (`--surface-background-primary`) with white cards, Poppins Black for page titles and big numbers only (`--font-display`, `--weight-black`), the Figma Hero Card (`HeroCard`, emerald frame with a deep emerald panel; its corner counts days to go, then days left) as both the trip header and the home hero, Manrope everywhere else (`--font-family`), headings on one line (100% line height), one brand colour (emerald #2EE6B6) with its deep partner as text, pill-shaped controls and 24px card corners. Deliberate departures from DESIGN.md: emerald instead of Wise green, a dark mode, pill (not 24px) buttons and inputs, and WCAG AA contrast wins over any value in the spec. Colour: `primitives.css` holds five palettes (emerald, green, orange, red, neutral) from white (0) to #181D1B (1000), each step at the same contrast against white, plus see-through steps made with opacity in semantic tokens. Dark mode is the Figma Color collection's Dark mode: there `surface/brand` is deep emerald so `text/brand` (emerald) sits on it. Components use only the semantic groups in `semantic.css` (`--text-*`, `--icon-*`, `--status-*`, `--surface-*`, `--interactive-*`, `--border-*`, `--disabled-*`, `--overlay-*`), which match the Figma "Color" collection name for name. Display text (page titles, the `t-display` style) uses `--text-brand`; other headings, body and form text are greys only. Emerald is for display titles, links, brand text and icons. Interactive states: hover is lighter, pressed is darker (`--interactive-*-hover` / `-pressed`). Categories have no colours: they're told apart by icon on `--surface-brand-subtle`. Never put text in a bright colour on a light background. Illustrations: one hand-drawn style for every empty state and trip cover (white framed shapes with the bold outline and a slight tilt, emerald land, warm sun, sparkle crosses), drawn in `src/design/components/Illustration.tsx` with semantic tokens only; `EmptyState` takes an `illustration`, never an icon. Use semantic tokens from `src/design/tokens/semantic.css` and components from `src/design/components/`. Never hard-code colors, sizes or radii. Add new tokens or components there and show them on the `/#/design` page (a builder's reference, deliberately not linked in the app's navigation; open it by URL).
- **Responsive:** nothing smaller than 14px from 744px up (the small type steps up there; phones keep 12–13px); compact < 744px (bottom sheets), regular 744–1067px, wide ≥ 1068px. Tap targets ≥ 44px, no horizontal scroll at 390px, light and dark mode.
- **Accessibility:** WCAG 2.2 AA. Text ≥ 4.5:1 contrast, control outlines and focus rings ≥ 3:1, never colour alone for state, every control has an accessible name. Check new colour pairs in light and dark mode, on every surface they can sit on.
- **Borders:** subtle (`--border-subtle`) by default; bold (`--border-bold`, `--input-field-border`) only for text inputs and where accessibility needs a visible outline.
- **Features to keep working:** the trip's total budget (`trip.totalBudget`, group-wide) drives each day's budget (`src/features/trip/tripBudget.ts`: what's left, shared over the days to come; orange under half, red under a fifth). Organizers can give one day its own budget (`trip.dayBudgets`, "Edit today's budget"); the other days re-share what's left. Older trips only have `dailyBudget` (per person per day); keep saving it too. Every event needs a location: it powers Maps/Uber buttons and adds the event's country to the trip's country badges (`tripCountries`). Starred events (`activity.starredBy`) show in the profile's travel collections (`/#/profile/collections/:key`); the star was removed from the event row and will move to the event's own page.
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

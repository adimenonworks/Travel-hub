# Trip Hub

A collaborative vacation planner. People create trips, invite others with a link, and plan together: day-by-day itinerary, ideas board with voting, budget, weather/news/map, and a home dashboard with a visited-places map.

- **Live site:** https://adimenonworks.github.io/Travel-hub/
- **Owner:** learning to build apps. Explain what you change and why in plain language, and add a one-line explanation in brackets for any jargon.

## Publishing

- Any push to the repo's **default branch** builds and deploys automatically (`.github/workflows/deploy.yml`, about 1 minute). Other branches build nothing.
- A change is only live once it's on the default branch. When the owner says "publish it", get the change there: open a PR and merge it, or push to it directly if they say so. Then confirm the workflow run is green.
- Optional second host: Firebase Hosting at https://travel-hub-a1aa2.web.app runs only if the `FIREBASE_SERVICE_ACCOUNT` repo secret exists (see README).

## Stack

- React 19 + TypeScript + Vite. Hash routing (`/#/trip/:id`) because GitHub Pages can't route paths.
- Firebase Auth (Google sign-in) + Firestore, project `travel-hub-a1aa2`. The web config is in `.env.production`; it's public by design, and security comes from `firestore.rules`.
- With no Firebase config (e.g. `npm run dev` without `.env.local`), the app runs in **demo mode** using localStorage. This is how to test locally.
- External APIs (free, no keys): Open-Meteo (weather + city search), GDELT (news), OpenStreetMap/Leaflet (maps), Nominatim (address lookup).

## Code layout

```
src/app/        router (App.tsx) + responsive shell/sidebar
src/data/       types.ts, Store interface (store.ts), firebaseStore.ts, localStore.ts, hooks.tsx
src/design/     tokens/ (primitives → semantic → typography) + components/
src/features/   home, trip (Itinerary, Ideas, Budget, Info, People, forms), profile, auth, design page, shared
src/lib/        dates, format, weather, news, geocode, categories, theme, authErrors
firestore.rules + tests/rules/   security rules and their emulator tests
```

## Rules for changes

- **Design system:** follow Apple's Human Interface Guidelines with a rounded look (capsule buttons, soft corners). Use semantic tokens from `src/design/tokens/semantic.css` and components from `src/design/components/`. Never hard-code colors, sizes or radii. Add new tokens or components there and show them on the `/#/design` page.
- **Responsive:** compact < 744px (bottom tab bar, bottom sheets), regular 744–1067px (sidebar), wide ≥ 1068px. Tap targets ≥ 44px, no horizontal scroll at 390px, light and dark mode.
- **Data:** UI code talks only to the `Store` interface. Any new data operation must be added to **both** `firebaseStore.ts` and `localStore.ts`. Dates are `YYYY-MM-DD` strings and times are `HH:mm`.
- **Security:** a new Firestore collection or field rule needs a matching change in `firestore.rules`, plus tests in `tests/rules/rules.test.mjs`. If the rules changed, tell the owner to re-paste them in the Firebase console (Firestore → Rules → Publish).
- Watch for `fn?.(await x())`: if `fn` is undefined, `x()` never runs. Await into a variable first.

## Before pushing

1. `npm run build` (type-checks and builds).
2. Exercise the change in demo mode with Playwright (pre-installed, `require('playwright')`). Check 390px and 1440px widths, and dark mode.
3. If rules changed: `cd tests/rules && npm install && npm test` (needs Java; the Firestore emulator downloads on first run).

## Roadmap / open ideas

- Gmail import of reservations (restricted read-only Gmail permission; capped at 100 test users unless Google verifies the app)
- PDF/file uploads (needs Firebase Blaze plan for Storage; today links are used instead)
- AI recommendations for nearby cafés, bars and activities
- More home-dashboard widgets

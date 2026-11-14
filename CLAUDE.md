# Rove

A collaborative vacation planner. People create trips, invite others with a link, and plan together: day-by-day itinerary, ideas board with voting, saved places (Collections) with maps, and a home dashboard with a visited-places map.

- **Platform:** an **iPhone app** (Capacitor: the built web app inside a native iOS shell, `ios/`, bundle ID `com.adimenon.rove`). The website is **join-only** (owner, 11 Nov 2026): in a browser with the real database it shows only sign-in, the join page (`/join/:code`, collection links end in `?to=collection` so the sign-in message says so), the privacy policy and the "Get Rove" page (`features/auth/GetApp.tsx`: "You're in!" after joining, **Open in Rove** = `rove://go?path=/join/<code>`, which the app opens via `onOpenPath` in `native.ts`; once that has worked on a device it's tried automatically next time; Get Rove on the App Store once `APP_STORE_URL` in `src/lib/site.ts` is set). `joinOnly()` in `src/lib/site.ts` decides; demo mode keeps the whole app (localStorage `rove:join-only` = `1` tests the website). It deploys only by hand; invite links from the app open it (`PUBLIC_SITE`). Later, a Universal Link should open the app straight away. Invitations will get a redesign (owner: make being invited feel special). Nothing is designed or checked for desktop. Android later.
- **Website (join-only, used for invite links):** https://adimenonworks.github.io/Travel-hub/
- **Owner:** learning to build apps. Explain what you change and why in plain language, and add a one-line explanation in brackets for any jargon.
- **Challenge the owner's requests** (owner's standing rule, 13 Nov 2026): every time the owner asks for a change, first check whether it's a good idea, and whether there's a better, more meaningful, more on-brand, more standard or more native (iOS) way to do it. If there is, say so and propose it **before** building, with the reason. The owner's ideas are a starting point, worked out together. **Rules the owner sets explicitly are absolute**, and this is one of them.

## Read first, write after (owner's rule, 14 Nov 2026)

Rove's repo is meant to explain itself completely: any AI or person should be able to read it and understand what Rove is now, why, and where it's going.

1. **At the start of a session,** check whether this copy is behind Main on GitHub. If it is, tell the owner what's new (for example "4 changes behind, including a new CLAUDE.md") and **ask before pulling**. If the folder has unsaved changes, point them out first and let the owner decide. After pulling, re-read this file if it changed.
2. **Read first:** before planning, deciding or starting new work, read this file, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/changes/PROGRESS.md` and any change prompt in `docs/changes/` that touches the work, plus the reference file for the area you're changing (see "Where things are"). If they disagree with each other, or with the code or Figma, fix that before going on. Tiny fixes (a typo, a colour tweak) don't need the full read.
3. **Write after:** in the same pull request as the change, update whatever it affects: this file (rules), the reference files (how things work), `docs/DECISIONS.md` (a dated entry for any decision or reversal, with the reason), `docs/ROADMAP.md` (when a feature is built, decided, added or dropped, then redraw the Figma Planning board from it) and `PROGRESS.md` (while working through a change prompt).

## Where things are

| Read this | Before you work on |
|---|---|
| `docs/DESIGN-SYSTEM.md` (+ `DESIGN.md`, the Wise reference) | Anything visual: a component, token, icon, text style, colour, illustration, or anything in Figma |
| `docs/APP-SPEC.md` | A screen, flow or feature: Home, Trips, a trip's tabs, events and the event page, Save a place, Collections, budgets, layovers, time zones, Recently deleted |
| `docs/FEEL-AND-NATIVE.md` | Navigation, Bottom navigation, gestures, scrolling, the keyboard, sheets, loading, the iPhone shell (`ios/`) |
| `docs/token-migration.md` | Any old token name you meet (library v2's old → new table) |
| `docs/HOW-ROVE-IS-BUILT.md`, `docs/DEPENDENCIES-AND-RISKS.md`, `docs/SECURITY.md` | Platforms and services, limits and costs, security rules |
| `docs/ROADMAP.md` | What's built, what's next, and what's been decided against |
| `docs/DECISIONS.md` | Why something is the way it is |
| `docs/changes/` + `PROGRESS.md` | The change prompts being built, and how far they've got |

These files moved out of this one on 14 Nov 2026 word for word; this file keeps the rules every session needs.

## Publishing

- Merging into the repo's **default branch** (`Main`) saves the code; nothing deploys. The app is built from Main on the owner's Mac (`npm run ios`, then run from Xcode). The website deploy (`.github/workflows/deploy.yml`) runs only by hand (Actions → Deploy site → Run workflow); don't run it unless the owner asks, or a change to the invite/join page must reach people who don't have the app.
- **Always keep a backup of unpushed work.** GitHub access has failed before (account suspended). Whenever there are commits not yet on GitHub, keep the backup page up to date after every commit batch: a `git bundle` of everything since the last commit that is on GitHub (base64 text, since binaries aren't accepted) plus a `git format-patch` text file, published as a private Artifact with restore steps (the current one: https://claude.ai/artifact/EeFup9UiZnWWesHfYeU2zZ; update it in place). Verify the bundle restores to the same HEAD before saying it's backed up.
- A change is only done once it's on the default branch. **Merge every change by default**: once the build and checks pass and nothing needs the owner's attention (a rules re-publish, a decision, a known problem), open a PR and merge it, without asking first; then tell the owner to pull Main and rebuild the app in Xcode to see it on the phone. If something does need their attention, ask before publishing.
- Optional second host: Firebase Hosting at https://travel-hub-a1aa2.web.app runs only if the `FIREBASE_SERVICE_ACCOUNT` repo secret exists (see README).

## Stack

- React 19 + TypeScript + Vite. Hash routing (`/#/trip/:id`) because GitHub Pages can't route paths.
- Firebase Auth (Google sign-in) + Firestore, project `travel-hub-a1aa2`. The web config is in `.env.production`; it's public by design, and security comes from `firestore.rules`.
- **iPhone app:** `npm run ios` builds, copies into `ios/` (`npx cap sync ios`) and opens Xcode; run from Xcode on a phone. Sign-in in the app is native Google sign-in (`@capgo/capacitor-social-login`, pinned) handing its ID token to Firebase (`signInWithCredential`); it needs `VITE_GOOGLE_IOS_CLIENT_ID` in `.env.production` and the reversed client ID as a URL scheme in `ios/App/App/Info.plist`. `src/lib/native.ts` tells app from browser. Firestore keeps an offline cache on the device (`persistentLocalCache`). Pin new native packages to releases at least two weeks old.
- With no Firebase config (e.g. `npm run dev` without `.env.local`), the app runs in **demo mode** using localStorage. This is how to test locally.
- External APIs (free, no keys): Open-Meteo (city search, time zones and local time offsets), OpenStreetMap/Leaflet (maps), Nominatim (address lookup), Photon (place search), ExchangeRate-API open endpoint (idea prices). Fonts are bundled from npm: Manrope (`@fontsource-variable/manrope`) and Poppins Black + Bold (`@fontsource/poppins/latin-900.css`, `latin-700.css`; Heading 1 is Poppins Black, Heading 2 Poppins Bold).
- **Rove's small server** (`server/worker.js`, a Cloudflare Worker, free plan; setup in `server/README.md`, test with `node server/worker.test.mjs`): keeps the Unsplash and RapidAPI keys as Worker secrets (never in the app or repo). `GET /cover?q=` (Unsplash search, landscape, `content_filter=high`, cached a day), `POST /cover/download` (Unsplash's required download ping), `GET /flight?number=&date=` (AeroDataBox via RapidAPI, cached 10 min). The app reads its address from `VITE_API_BASE` in `.env.production`: `https://rove-api.adimenon9.workers.dev` (deployed by the owner by pasting `worker.js` in the Cloudflare dashboard; redeploy the same way when it changes, see `server/README.md`). A cover lookup that fails (offline, server or key trouble) is not remembered, so it retries; only "Unsplash has none" (404) saves `cover: null`. Client side: `src/lib/api.ts`. Trip covers: organizers' trips fetch one automatically (`trip.cover`, a `TripPhoto`), hotlinked, credited "Photo by <name> on Unsplash" with both links carrying `?utm_source=rove&utm_medium=referral`, illustration as the fallback. Flight status is polled only from 24h before departure to 1h after landing, every 10 minutes: "Check-in open" (Warning), then On time / Delayed / Cancelled; never a check-in button.

## Code layout

```
src/app/        router (App.tsx) + shell (Bottom navigation; owns the full-screen New trip flow via useNewTrip)
src/data/       types.ts, Store interface (store.ts), firebaseStore.ts, localStore.ts, hooks.tsx
src/design/     tokens/ (primitives (Base) → semantic (Color, Layout) → typography → motion) + components/
src/features/   home (Home, Trips), saves (Save a place sheet, Collections by country, Favourites, place marks), trip (Overview, Itinerary, Ideas, Photos, People, event page, bookings lists, NewTrip flow, forms), profile (You), auth, design page, shared (TripHero, SlideSwap, Price, maps, pickers)
src/lib/        dates, format, geocode, countries (Figma flags in src/assets/flags), categories, theme, prefs, image, authErrors
firestore.rules + tests/rules/   security rules and their emulator tests
server/         Rove's small server: a Cloudflare Worker for Unsplash covers and flight status (keys live only in the Worker)
functions/      Cloud Functions (readLink; not deployed: needs the Blaze plan, which the owner declined; the iPhone app reads links itself)
ios/App/ShareExtension/   iPhone share extension (Share → Rove opens rove://save?url=…)
docs/           ROADMAP.md (where Rove is going: the source of truth), DECISIONS.md (every decision and why), DESIGN-SYSTEM.md, APP-SPEC.md, FEEL-AND-NATIVE.md (reference detail, see "Where things are"), token-migration.md (old → new token names), HOW-ROVE-IS-BUILT.md (platforms, how they connect, how to rebuild), DEPENDENCIES-AND-RISKS.md (limits, what breaks first), SECURITY.md (how data is kept safe, what to watch), changes/ (change prompts for Claude Code and PROGRESS.md). Keep them current when a platform, limit or rule changes; condensed copies of the last three are the "Guides" panels on the Figma Planning page.
```

## Rules for changes

The full rules, component by component, are in `docs/DESIGN-SYSTEM.md`; read it before any visual change. The essentials:

- **Figma is the source of truth** for components and tokens: file `cXoK1GzmzgqY0cmcgJw66W`, page Foundations (components in the section `88:7142`, grouped by kind under large headers). A new or changed component, variant, token or icon is made in Figma first, then in code, matching 1:1: names, variants, properties and variables. Never build from the archive section. Icons the owner adds go in "Backup icons" on the **Backup artifacts** page, then into the Icons component (every size and state) and `icons.ts`.
- **Tokens** (library v2, 14 Nov 2026): Figma collections **Base** (raw values, only used by other tokens, `--base-*`), **Color** (Light / Dark; one set: `surface/`, `text/`, `icon/`, `border/`, `status/`, `button/`, `control/`, `input/`, `tag/`, `category/`, `overlay/`, `illustration/`, `map/`, plus `feature/` for the deep-green feature surfaces), **Layout** (`space/`, `space/page/`, `radius/`, `size/`, `border-width/`), **Typography** and **Motion** (`duration/`, `easing/`; code shorthands `--motion-*`). Figma `button/primary/background` is `--button-primary-background` in code; text style "Heading 1" is `.t-heading-1`.
- **Every value comes from a variable** (owner's rule, 14 Nov 2026): in Figma and code, every colour, spacing, corner, size, border width, text value and timing inside a component. Allowed exceptions: screen frame widths on the Figma Screens page, text-relative sizes written `calc(Nrem / 17)`, `0`, media query widths, numbers passed as component props, and artwork. No one-off size tokens: role sizes where a meaning is shared, else the numbered `size/{step}` scale.
- **Names** (13–14 Nov 2026; glossary in `DESIGN.md` and on Foundations): sentence case everywhere; full names, not abbreviations; a "." in front of parts only used inside another component (`.Tab`, `.Category icon` …); property names only `Type`, `Tone`, `Size` (Small / Large, or Small / Medium / Large), `State`, `Layout` and `Show <thing>` ("Show Icon button" when the thing is a component); layer names start with a capital.
- **Touch first:** Figma has no Hover variants; hover CSS lives only inside `@media (hover: hover)`, for the website. Every tappable thing has a 44px tap area.
- **Spacing:** pages are white (`surface/primary`) with 24px side margins (`--space-page-gutter`) and 96px (`--space-page-bottom`) below every page. **Everywhere, screens and sheets alike (owner's rule, 11 Nov 2026): 40px between sections (`--space-page-section`; Figma `space/page/section`), 16px between things inside a section** (a section is a heading and what it groups, e.g. Option cards then the day picker under them are two sections).
- **Figma pages:** Foundations (tokens, components, icons: always exact), **Screens** (the core screens, the owner's source of truth since 10 Nov 2026: Home, Trips, Trip · Overview, Trip · Itinerary, Trip · Ideas, Event, Saved · Country, You; 390px, light mode, demo data; built only from Foundations component instances) and **Planning** (a visual copy of `docs/ROADMAP.md`, redrawn from it one way only, plus the Guides; never edited directly).
- **Text size:** follows the person's iPhone text setting. `html { font: -apple-system-body }` (iPhone/iPad only; elsewhere a fixed 17px root) makes 1rem the iOS body size, 17px by default. Every type size is Figma px ÷ 17 in rem (`calc(14rem / 17)`), so at the default setting text is exactly the Figma size. Display and Heading sizes grow up to 1.4× (`min(calc(40rem / 17), 56px)`), like iOS large titles; body and label text keeps growing. Never type a font size in px. Anything holding text gets `min-height`, not `height`, and labels may wrap (buttons and list rows wrap). Size layout thresholds in rem (`minmax(calc(130rem / 17), 1fr)`, `flex-basis: calc(40rem / 17)`) so layouts reflow when text grows, not by screen width. Test at 17, 23 and 33px roots (default, largest standard, an accessibility size).
- **Responsive:** phone only, 320px (iPhone SE) to 430px (Pro Max); on a computer the test site shows a centred phone column (`--size-content-max` 480px). Tap targets ≥ 44px (a smaller control gets an invisible 44px area, e.g. the 32px header avatar), no horizontal scroll at 320px, light and dark mode.
- **Accessibility:** WCAG 2.2 AA. Text ≥ 4.5:1 contrast, control outlines and focus rings ≥ 3:1, never colour alone for state, every control has an accessible name. Check new colour pairs in light and dark mode, on every surface they can sit on.
- **Borders:** subtle (`--border-subtle`) by default; bold (`--border-bold`, `--input-border`) only for text inputs and where accessibility needs a visible outline. Lines between rows use `border/divider`. Links on light surfaces deepen on hover (lighter fails contrast).

## Definition of done (components never drift)

The owner's rule (10 Nov 2026): **components must always match exactly; screens don't.** Build in Figma first, then code.
1. **Components** (page Foundations): any new or changed component, variant, token or icon is made in Figma **before** the code, then built to match it 1:1 (names, variants, properties, tokens), and shown on the /#/design page. Removing one from the code removes it from Figma too. Check each touched component side by side (Figma screenshot vs the /#/design page) before the PR.
2. **Screens page** (owner's rule, 10 Nov 2026): the eight core screens are the source of truth. The owner changes them in Figma and asks for the code to follow; when a core screen changes in code (a request made in chat), update its Figma frame in the same PR, using component instances only (no screenshots, no detached copies). Other screens (sheets, flows, sub-pages) aren't drawn; the app is their reference. The old Flows page is gone.
3. **Roadmap and decisions** (owner's rule, 14 Nov 2026): `docs/ROADMAP.md` tracks only bigger features and meaningful changes, not a log: no change history, round summaries or small fixes. When a big feature is built it moves to **Built**; when one is decided, added or dropped, it moves to its column (Now / Next / Later / Needs a design first / Blue sky / Decided not to build). Every item in **Now**, **Next** and **Later** has a "How we'd build it" line (owner's rule, 11 Nov 2026): the approach, the services or accounts it needs, a rough size (small / medium / large) and anything the owner must do. The reason for any decision, and any reversal, goes in `docs/DECISIONS.md`. Then redraw the Figma **Planning** board from `ROADMAP.md` (one way only: the board is never edited directly; keep its column counts right and the Guides panels current).
4. The PR description's Figma checklist (`.github/pull_request_template.md`) is ticked honestly; anything not done is said there and to the owner.

## Before pushing

1. `npm run build` (type-checks and builds).
2. Exercise the change in demo mode with Playwright (pre-installed, `require('playwright')`). Check 320, 375, 390 and 430px widths, light and dark mode, and large text (html font-size 23px and 33px).
3. If rules changed: `cd tests/rules && npm install && npm test` (needs Java; the Firestore emulator downloads on first run).

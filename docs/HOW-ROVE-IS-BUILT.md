# How Rove is built (and how to build it again)

A plain-language guide to every platform Rove uses, how they fit together, why each was chosen, and the steps to
rebuild the whole thing from nothing. Jargon gets a one-line explanation in [brackets] the first time it appears.

---

## 1. The big picture

Rove is a **web app wrapped inside an iPhone app**.

```
 Your iPhone
 ┌──────────────────────────────────────────────┐
 │  Rove (native iOS shell, made with Capacitor) │
 │  ┌────────────────────────────────────────┐  │
 │  │  The web app (React), built by Vite     │  │──── Firebase Auth (Google sign-in)
 │  │  screens, components, design tokens     │  │──── Firestore (all trip data, live sync)
 │  └────────────────────────────────────────┘  │──── Rove's small server (Cloudflare Worker)
 │  Share extension (Share → Rove)               │        ├─ Unsplash (cover photos)
 └──────────────────────────────────────────────┘        └─ AeroDataBox (flight status)
                                                      Free public services, called directly:
                                                      Photon / Open-Meteo / Nominatim (places),
                                                      OpenStreetMap (maps), ExchangeRate-API (currency)
```

- **One codebase:** the same React code runs in a browser (for testing) and inside the iPhone app.
- **No server of our own** for the data: Firebase stores it and keeps everyone's phones in sync.
- **One tiny server** (the Cloudflare Worker) exists only to hide two secret keys (Unsplash, flight data).
- **Everything is on free plans.**

---

## 2. Each platform, what it does, and why it was chosen

| Platform | What it does in Rove | Why this one |
|---|---|---|
| **React 19** [a library for building screens out of reusable pieces called components] | Every screen and component | The most widely used way to build app screens; huge community, easy to hire for or get help with |
| **TypeScript 7** [JavaScript with types, so mistakes are caught before the app runs] | All code | Catches whole classes of bugs at build time (`npm run build` fails if something doesn't fit) |
| **Vite 8** [the build tool: turns our code into the small files the app actually loads] | `npm run dev` (live test site), `npm run build` (the app's files in `dist/`) | Very fast; zero config for React |
| **Capacitor 8** [wraps a web app in a real native iPhone app] | The iOS app in `ios/`, plus native features: haptics, keyboard, status bar, share sheet, native web requests | Lets one web codebase become a real App Store app; native bits are added as plugins |
| **Xcode** [Apple's tool for building iPhone apps] | Builds and installs the app on a phone | The only way to build for iPhone |
| **Firebase Authentication** [Google's sign-in service] | "Continue with Google" | Free, secure, no passwords for us to store |
| **Firestore** [Google's live database] | Trips, events, ideas, comments, places, profiles; updates appear on everyone's phone instantly; keeps working offline | Live sync and offline cache out of the box; free tier is generous; security is written as rules, not server code |
| **Firestore security rules** (`firestore.rules`) [the database's bouncer: who may read or change what] | Who can see/edit a trip, invites, private profile, places | Security lives next to the data, so even a modified app can't break it |
| **Cloudflare Worker** (`server/worker.js`) [a tiny piece of code that runs on Cloudflare's servers] | Holds the Unsplash and RapidAPI keys; answers `/cover` and `/flight` | Free (100,000 requests a day), no server to maintain, keys never ship in the app |
| **Unsplash** | Trip cover photos | Beautiful free photos; their rules require a credit and a "download" ping, which we do |
| **AeroDataBox via RapidAPI** | Live flight status (check-in open, delays, gates) | Has a free plan; only polled close to the flight |
| **Photon** (komoot) | Place search from a name ("Time Out Market") | Free, no key, OpenStreetMap data |
| **Open-Meteo** | City search and local time offsets | Free, no key |
| **Nominatim** | Turning an address into map coordinates | Free OpenStreetMap service |
| **OpenStreetMap + Leaflet** [Leaflet is a map library] | Maps on event pages and You | Free map tiles; no Google Maps bill |
| **ExchangeRate-API** (open endpoint) | Converting prices and budgets | Free daily rates, no key (credited in Settings) |
| **Figma** | The design system: tokens [named design values: colours, spacing, corner sizes], components, icons; plus the Planning board, a visual copy of `docs/ROADMAP.md` | Figma is the source of truth for components; code matches it 1:1 |
| **GitHub** | Stores the code; pull requests [a proposed change, reviewed then merged] keep history | Standard; `Main` is the branch the app is built from |

Retired or not used: the website (GitHub Pages) is frozen and only serves invite links; the `readLink` Cloud Function
exists in `functions/` but isn't deployed (it needs Firebase's paid Blaze plan; the iPhone app reads links itself).

---

## 3. How the pieces talk to each other

1. **Opening the app:** Capacitor starts a web view [a browser window inside the app] that loads the built files from
   `dist/`. The app shows data from the phone's offline cache immediately, then Firestore sends anything newer.
2. **Signing in:** the app opens Google's native sign-in sheet (`@capgo/capacitor-social-login`), gets a token
   [a short-lived proof of who you are], and hands it to Firebase Auth. From then on every database request carries
   that identity, and the security rules decide what it may do.
3. **Reading and writing data:** screens use hooks [small functions that fetch data and re-draw the screen when it
   changes] in `src/data/hooks.tsx`. They go through one `Store` interface (`src/data/store.ts`), implemented twice:
   `firebaseStore.ts` (real) and `localStore.ts` (demo mode, saved in the browser). That's why you can test the
   whole app with no account.
4. **Live sync:** Firestore "listeners" push changes to every phone on the trip within a second. Writes are saved
   on the phone first, so they work offline and upload later.
5. **Covers and flights:** the app calls `https://rove-api.adimenon9.workers.dev`. The Worker adds the secret key,
   calls Unsplash or AeroDataBox, caches the answer (a day for covers, 10 minutes for flights), and returns it.
6. **Saving a link:** inside the iPhone app, the page is fetched natively (`CapacitorHttp`, which isn't blocked like
   a website would be), its title is cleaned, and Photon finds the place, city and country.
7. **Sharing into Rove:** the share extension (`ios/App/ShareExtension`) opens `rove://save?url=…`, which the app
   turns into the Save a place sheet.
8. **Invites:** any traveller creates an invite code (12 random characters, valid 14 days). The link opens the old
   website's join page, which signs you in and adds you to the trip if the code is valid.

---

## 4. How the code is organised

```
src/app/        the app shell: routes (which screen for which address), Bottom navigation, swipe-back, chat alerts
src/data/       data types, the Store interface, Firebase and demo implementations, hooks
src/design/     tokens/ (primitives → semantic → typography) and components/ (Button, Sheet, Event card…)
src/features/   the screens: home, trip (Overview, Itinerary, Ideas, Photos, People, forms), saves, profile, auth
src/lib/        helpers: dates, currency, categories, links, countries, native (iPhone-only features)
server/         the Cloudflare Worker and its tests
ios/            the native iPhone project (Xcode), including the share extension
firestore.rules the database security rules (tests in tests/rules/)
```

**Design system in three layers:**
- **Base:** raw values, e.g. `--base-color-emerald-300` (Figma collection Base, `base/color/emerald/300`). Only other tokens use them.
- **Semantic tokens:** one set by role, e.g. `--text-primary`; the deep green areas use `--feature-*`. They switch automatically
  for dark mode.
- **Components:** built only from semantic tokens. They mirror Figma 1:1, and the `/#/design` page shows them all.

---

## 5. Rebuild Rove from scratch (the recipe)

1. **Tools:** a Mac, Xcode, Node.js (LTS), a GitHub account, a Google account, a Figma account.
2. **Project:** `npm create vite@latest rove -- --template react-ts`, then add `firebase`, `react-router-dom`,
   `leaflet`, the fonts, and the Capacitor packages (`@capacitor/core`, `cli`, `ios`, `app`, `haptics`, `keyboard`,
   `share`, `status-bar`, `@capgo/capacitor-social-login`). Pin native packages to releases at least two weeks old.
3. **Firebase:** create a project (free Spark plan) → add a Web app (copy the config into `.env.production`) →
   turn on Google sign-in → create a Firestore database → paste `firestore.rules` → Publish.
4. **Google sign-in for iPhone:** in Google Cloud, create an iOS OAuth client for the bundle ID; put its ID in
   `VITE_GOOGLE_IOS_CLIENT_ID` and the "reversed client ID" as a URL scheme in `ios/App/App/Info.plist`.
5. **iPhone app:** `npx cap add ios`, then `npm run ios` (builds, copies into `ios/`, opens Xcode). In Xcode pick
   your team, plug in the phone, press Run. Add the share extension target and the `rove://` URL scheme.
6. **Worker:** Cloudflare → Workers → create `rove-api` → paste `server/worker.js` → add secrets
   `UNSPLASH_ACCESS_KEY` and `RAPIDAPI_KEY` → put its address in `VITE_API_BASE`.
7. **Design system:** set up Figma variables (primitives, semantic, typography) and components first; mirror them
   in `src/design/tokens` and `src/design/components`.
8. **Every change:** build it in Figma first (components), then code. Then `npm run build`, test in demo mode with
   Playwright, open a pull request and merge to `Main`. To see it on your phone: pull `Main`, `npm run ios`, Run in
   Xcode.

---

## 6. Day-to-day commands

| Command | What it does |
|---|---|
| `npm run dev` | Test site at localhost:5173 (demo mode without `.env.local`) |
| `npm run build` | Type-check and build; fails on mistakes |
| `npm run ios` | Build, copy into `ios/`, open Xcode |
| `node server/worker.test.mjs` | Test the Worker |
| `cd tests/rules && npm test` | Test the security rules (needs Java) |

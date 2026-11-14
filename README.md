# Rove

A shared vacation planner. Create trips, invite friends, and plan together:

- **Itinerary**: day by day, with timed plans (flights, trains, buses, ferries, taxis, car rental, stays, restaurants, cafés, bars, activities, free time), locations, booking references, links and PDFs. Flights show live status (check-in open, on time, delayed, cancelled) once Rove's small server is set up.
- **Ideas board**: anyone can add ideas (with an optional price) and vote; organizers add the winners to a day.
- **Saved places**: save a place from a link or a search into your Collections (country → city → category), star favourites, and bring them into a trip's ideas.
- **Budgets**: an optional budget per person; bookings take a price per person and Overview shows what's left (rates by ExchangeRate-API). Ideas can have a price too.
- **Good to know**: emergency numbers, entry requirements, local time and currency per country, and maps of your plans.
- **Cover photos**: a photo of the place from Unsplash (credited to the photographer), or your own photo, shrunk on your device and saved with the trip.
- **Photos**: links to shared Google Photos or iCloud albums for the trip (those services don't allow embedding, so each album opens in its own app or tab).
- **People**: invite links, roles (owner / organizer / member), leave or remove people.
- **Home**: your next trip, your saves by country and what you saved recently. **You** has your travel stats, a map of places you've been, and favourites.

Edits sync live to everyone on the trip. It's an iPhone app (the website only serves invite links), has a bold, rounded look inspired by Wise with one emerald brand colour, supports light and dark mode, and meets WCAG 2.2 AA.

## Stack

React + TypeScript + Vite · Capacitor (iPhone app) · Firebase Auth (Google sign-in) + Firestore · Photon / Open-Meteo / Nominatim (places) · OpenStreetMap / Leaflet (maps). Everything runs on free tiers. The one bit of server code is [`server/worker.js`](server/README.md), a free Cloudflare Worker that keeps the Unsplash and flight-status keys secret.

Without Firebase config the app runs in **demo mode**: data stays in your browser's localStorage. Open a second tab, sign in with a different name and paste an invite link to try collaborating.

## Docs

- [How Rove is built](docs/HOW-ROVE-IS-BUILT.md): every platform, how they connect, and how to rebuild it
- [Dependencies and risks](docs/DEPENDENCIES-AND-RISKS.md): limits, costs and what breaks first as it grows
- [Security](docs/SECURITY.md): how people's data is kept safe, and what to watch

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill it in to use your real Firebase project locally.

## Go live (one-time setup, ~10 minutes)

1. **Create a Firebase project** at <https://console.firebase.google.com> (the free Spark plan is enough).
2. **Add a Web app** (Project settings → General → Your apps → `</>`). Copy the config values.
3. **Enable Google sign-in**: Build → Authentication → Sign-in method → Google → Enable.
4. **Create a Firestore database**: Build → Firestore Database → Create database (production mode, pick a nearby region).
5. **Publish the security rules**: Firestore → Rules → paste the contents of [`firestore.rules`](firestore.rules) → Publish.
6. **Authorize your domain**: Authentication → Settings → Authorized domains → add `<your-github-username>.github.io`.
7. **Add the config**: put the six values in [`.env.production`](.env.production) (already filled in for this project).
   These web keys are designed to be public; access is enforced by `firestore.rules`.
8. **Turn on Pages**: repo Settings → Pages → Source: **GitHub Actions**.
9. Push to the repository's default branch. The workflow in `.github/workflows/deploy.yml` builds and publishes to
   `https://<your-github-username>.github.io/<repo-name>/`.

## Optional: also host on Firebase (fixes sign-in on iPhone Safari)

Some browsers (notably Safari on iPhone) block the cross-site storage that Google sign-in needs when the site lives on `github.io`. Hosting the same site on Firebase (`https://travel-hub-a1aa2.web.app`) keeps sign-in on one domain, so it works everywhere.

1. Firebase console → Project settings → **Service accounts** → **Generate new private key**. This downloads a `.json` file.
2. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**. Name it `FIREBASE_SERVICE_ACCOUNT` and paste the whole contents of the file.
3. Re-run the "Deploy site" workflow. Every deploy then publishes to both addresses.

## Cloud Function: reading saved links

`functions/` holds `readLink`, which reads a shared link (its title, photo and site, and the place it's about, matched with a free place search). **It isn't deployed, by choice:** it needs Firebase's pay-as-you-go **Blaze** plan. It isn't needed for the iPhone app, which reads links itself (`readOnPhone` in `src/lib/links.ts`, native networking). Only the website (and demo mode) would use it; without it they save links with what the link itself shows. Deploy it only if the website ever needs full previews.

Deploy it (first time, and whenever `functions/` changes), from Google Cloud Shell, which is already signed in as you:

1. Open https://console.cloud.google.com/?project=travel-hub-a1aa2 and click the **Activate Cloud Shell** button (top right, `>_`).
2. Paste this and press Enter:
   ```bash
   rm -rf Travel-hub && git clone https://github.com/adimenonworks/Travel-hub.git && cd Travel-hub/functions && npm install && npx firebase-tools@15.34.1 deploy --only functions --project travel-hub-a1aa2
   ```
3. If it asks you to log in, run `npx firebase-tools@15.34.1 login --no-localhost`, follow the link, then run step 2's last command again.

## Sharing to Rove from other apps (iPhone)

`ios/App/ShareExtension` is the share extension: in Instagram, TikTok, Safari or Google Maps, Share → Rove. It opens Rove at `rove://save?url=<link>` and the Save to Rove sheet takes over (`onSharedLink` in `src/lib/native.ts`). The test site accepts the same at `#/save?url=<link>`.

## Design system

`src/design/` has three layers, and you can swap pieces at any of them:

| Layer | File | What's in it |
| --- | --- | --- |
| Primitives | `tokens/primitives.css` | Raw values: bright/deep colour pairs, neutrals (light and dark), Inter type scale, 4/8px spacing, radii, shadows, motion |
| Semantic tokens | `tokens/semantic.css` | Role-based names components use (`--text-primary`, `--surface-secondary`, `--button-primary-background`, `--border-subtle`, `--space-page-gutter`, `--size-tap`…), including dark mode; same names as the Figma "Color" collection |
| Components | `components/` | Button, IconButton, LinkButton, TextField/TextArea/Dropdown, Message, Card (default or accent), Section, List/ListRow, SegmentControl, Accordion, ColorPicker, Sheet, PageHeader, Tabs, Avatar(Stack), Badge, EmptyState, Spinner, Banner, Icon |

Navigation is a slim top bar (your profile) at every width; each trip has its own section tabs. Breakpoints: **compact** < 744px (bottom sheets), **regular** 744–1067px (modal sheets), **wide** ≥ 1068px (a day list beside the timeline). Every tappable element is at least 44×44px.

The live reference is at `/#/design` in the app.

## Project layout

```
src/
  app/         router + shell (top bar)
  data/        types, Store interface, Firebase + demo implementations, React hooks
  design/      tokens + components
  features/    home, saves, trip (itinerary, ideas, photos, people), profile, auth, design page
  lib/         dates, money/links, geocoding, time zones
firestore.rules
tests/rules/   security-rules tests (Firestore emulator)
```

## Testing the security rules

```bash
cd tests/rules
npm install
npm test
```

This needs Java (for the Firestore emulator).

## Roadmap

- Gmail import of reservations (read-only Gmail permission; limited to 100 test users unless Google verifies the app)
- File uploads for PDFs (needs Firebase's Blaze plan for Storage; for now, link to Drive or Dropbox)
- AI recommendations for nearby cafés, bars and activities
- More home-dashboard widgets

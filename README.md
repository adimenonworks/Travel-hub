# Rove

A shared vacation planner. Create trips, invite friends, and plan together:

- **Itinerary**: one tab per day with timed plans, locations, links/PDFs, costs, who's going, and comments.
- **Ideas board**: anyone can drop ideas and vote; organizers approve an idea and schedule it into a day.
- **Budget**: daily budget against planned spend for each day and the whole trip, either your share or the whole group's, plus flights, stays and other expenses.
- **Info**: weather for your dates (a live forecast within 16 days, otherwise last year's weather on the same dates), local headlines, and a map of your plans.
- **Cover photos**: pick a photo for each trip; it's shrunk on your device and saved with the trip (free, no Firebase Storage needed).
- **Photos**: links to shared Google Photos or iCloud albums for the trip (those services don't allow embedding, so each album opens in its own app or tab).
- **People**: invite links, roles (owner / organizer / member), leave or remove people.
- **Home**: trips grouped into happening now / upcoming / past, travel stats, and a map of places you've been.

Edits sync live to everyone on the trip. It works on phone, tablet and desktop, has a bold, rounded look inspired by Wise with one emerald brand colour, supports light and dark mode, and meets WCAG 2.2 AA.

## Stack

React + TypeScript + Vite · Firebase Auth (Google sign-in) + Firestore · GitHub Pages · Open-Meteo (weather), GDELT (news), OpenStreetMap / Leaflet / Nominatim (maps). Everything runs on free tiers with no server code.

Without Firebase config the app runs in **demo mode**: data stays in your browser's localStorage. Open a second tab, sign in with a different name and paste an invite link to try collaborating.

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

`functions/` holds `readLink`, which Save to Rove calls to read a shared link (its title, photo and site, and the place it's about, matched with a free place search). It needs Firebase's pay-as-you-go **Blaze** plan; at Rove's size it costs nothing. Until it's deployed (and in demo mode), the app still saves links: it reads what it can from the link itself.

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
| Semantic tokens | `tokens/semantic.css` | Role-based names components use (`--text-body`, `--surface-background-secondary`, `--interactive-primary`, `--border-subtle`, `--space-gutter`, `--size-tap`…), including dark mode; same names as the Figma "Color" collection |
| Components | `components/` | Button, IconButton, LinkButton, TextField/TextArea/Select, Card (default or accent), Section, List/ListRow, SegmentedControl, ColorPicker, Sheet, PageHeader, Tabs, Avatar(Stack), Badge, EmptyState, Spinner, Banner, Icon |

Navigation is a slim top bar (your profile) at every width; each trip has its own section tabs. Breakpoints: **compact** < 744px (bottom sheets), **regular** 744–1067px (modal sheets), **wide** ≥ 1068px (a day list beside the timeline). Every tappable element is at least 44×44px.

The live reference is at `/#/design` in the app.

## Project layout

```
src/
  app/         router + shell (top bar)
  data/        types, Store interface, Firebase + demo implementations, React hooks
  design/      tokens + components
  features/    home, trip (itinerary, ideas, budget, info, people), profile, auth, design page
  lib/         dates, money/links, weather, news, geocoding
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

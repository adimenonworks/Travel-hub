# Trip Hub

A shared vacation planner. Create trips, invite friends, and plan together:

- **Itinerary**: one tab per day with timed plans, locations, links/PDFs, costs, who's going, and comments.
- **Ideas board**: anyone can drop ideas and vote; organizers approve an idea and schedule it into a day.
- **Budget**: daily budget against planned spend for each day and the whole trip, either your share or the whole group's, plus flights, stays and other expenses.
- **Info**: weather for your dates (a live forecast within 16 days, otherwise last year's weather on the same dates), local headlines, and a map of your plans.
- **People**: invite links, roles (owner / organizer / member), leave or remove people.
- **Home**: trips grouped into happening now / upcoming / past, travel stats, and a map of places you've been.

Edits sync live to everyone on the trip. It works on phone, tablet and desktop, follows Apple's Human Interface Guidelines, and supports light and dark mode.

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

## Design system

`src/design/` has three layers, and you can swap pieces at any of them:

| Layer | File | What's in it |
| --- | --- | --- |
| Primitives | `tokens/primitives.css` | Raw HIG values: system colors (light and dark), type scale, 4/8pt spacing, radii, shadows, motion |
| Semantic tokens | `tokens/semantic.css` | Role-based names components use (`--color-label`, `--color-bg-grouped`, `--color-tint`, `--space-gutter`, `--size-tap`…), including dark mode |
| Components | `components/` | Button, IconButton, TextField/TextArea/Select, Card, Section, List/ListRow, SegmentedControl, Sheet, PageHeader, TabBar, Avatar(Stack), Badge, EmptyState, ProgressBar, Switch, Spinner, Banner, Icon |

Breakpoints: **compact** < 744px (bottom tab bar, bottom sheets), **regular** 744–1067px (sidebar, modal sheets), **wide** ≥ 1068px (sidebar plus a day list beside the timeline). Every tappable element is at least 44×44pt.

The live reference is at `/#/design` in the app.

## Project layout

```
src/
  app/         router + shell (sidebar)
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

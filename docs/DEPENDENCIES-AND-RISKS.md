# Dependencies, limits and things to watch as Rove grows

Everything Rove relies on, what happens when it runs out or breaks, and what to do about it. The limits below are the
free-plan limits as of November 2026. Check each provider's pricing page before you rely on them: they change.

---

## 1. What breaks first as more people use Rove

| # | Risk | When it bites | What you'd see | What to do |
|---|---|---|---|---|
| 1 | **Flight status quota** (AeroDataBox free plan, about 600 requests a month) | A few dozen travellers flying in the same month | Flight status stops updating; the app quietly shows times without a status | The Worker caches each flight for 10 minutes and the app only asks 24 h before to 1 h after. Next steps: a paid RapidAPI plan, or a longer cache |
| 2 | **Unsplash demo key** (50 requests an hour) | Many new trips in one hour | New trips keep the illustration cover until the next hour (failed lookups retry later) | Apply for Unsplash production approval (the app already meets their rules: credit, hotlinking, download ping) |
| 3 | **Firestore free reads** (50,000 a day) and writes (20,000 a day) | Roughly a few hundred daily active users. Every screen opened reads documents, and live listeners read again when something changes | The database stops answering until midnight Pacific time; the app shows cached data | Turn on billing (Blaze, pay as you go) before launch, set a budget alert, and keep listeners narrow |
| 4 | **Trip cover photos stored inside the trip document** (up to 500 KB of text) | Many trips with custom covers | Slow trip loads and more download data; Firestore documents can't exceed 1 MB | Move covers to Firebase Storage (needs Blaze) and store only a link |
| 5 | **OpenStreetMap tiles** (a volunteer-run service with a fair-use policy) | Real app traffic | OpenStreetMap may block the app's map tiles | Switch to a tile provider with a free tier (MapTiler or Stadia Maps) before the App Store launch |
| 6 | **Nominatim and Photon** (free, fair-use public services; Nominatim allows about 1 request a second) | Many people searching at once | Searches fail or are slow; saving a place can't find its country | Self-host Photon, or use a paid geocoder (Mapbox, Google Places) |
| 7 | **ExchangeRate-API open endpoint** (daily rates, fair use) | Heavy use; rates are cached on the phone for 24 h | Conversions don't show | Their free key-based plan, or cache rates in the Worker |
| 8 | **Cloudflare Worker** (100,000 requests a day free) | Very large scale | Covers and flight status fail | Workers Paid ($5/month) |
| 9 | **The Worker has no rate limit** [a cap on how often one person can call it] | Anyone who finds its address can call it and use up the Unsplash and flight quotas | Quotas run out early | Add a Cloudflare rate-limiting rule; optionally require a Firebase sign-in token on each request |

---

## 2. Platform and tooling risks

- **Apple Developer Program.** Without it, an app installed from Xcode stops opening after 7 days and must be
  re-installed. You also can't use TestFlight [Apple's beta testing app], push notifications or the App Store. It
  costs about A$149 a year and is needed before launch.
- **App Store review requirements:**
  - In-app **account deletion**: Apple requires it for apps with sign-in, and Rove doesn't have it yet.
  - A **privacy policy** link.
  - **Sign in with Apple** may be required alongside Google.
- **Google sign-in setup.** Rove depends on the iOS OAuth client ID and the URL scheme in `Info.plist`. If the bundle ID
  changes, both must be redone.
- **TypeScript 7 is very new.** Some tools don't support it yet (for example the knip [a tool that finds unused code]
  clean-up scanner failed to run). If a tool breaks, check its TypeScript support before debugging further.
- **Capacitor plugins** must stay on the same major version as `@capacitor/core` (8). Update them together, and only
  to releases at least two weeks old.
- **Firebase JS SDK updates** occasionally change offline-cache behaviour. Test sign-in, offline and sync after any
  upgrade.
- **The frozen website** must keep serving the join page (`PUBLIC_SITE`) until Universal Links [links that open the
  app directly] replace it. If GitHub Pages goes down, invite links break.

---

## 3. Data and memory

- **Live listeners are kept for the whole session** (so screens open instantly). That's fine for a few trips. With
  dozens of large trips, memory use on older iPhones grows: watch for slowness or reloads.
- **The offline cache** (Firestore keeps data on the phone) grows with use. It's capped by Firestore (40 MB by
  default), so old data is cleared automatically.
- **Comments and events have no size limits in the rules.** A very long note or comment is stored as-is, which costs
  reads for everyone on the trip. A sensible limit (for example 2,000 characters) could be added to the rules.
- **No backups on the free plan.** Firestore exports need Blaze. If data is deleted by mistake, it can't be restored.
  Turn on point-in-time recovery or scheduled exports once on Blaze.
- **Deleting a trip doesn't delete its sub-collections** [events, ideas and comments are stored under the trip]. Those
  documents stay in Firestore, unreachable. Fine for now; a clean-up Cloud Function can remove them later.

---

## 4. External services the app calls directly (no key)

| Service | Used for | If it disappears |
|---|---|---|
| Photon (photon.komoot.io) | Place search when saving | Saving still works; country and city must be picked by hand |
| Open-Meteo | City search, local time on the Country sheet | City pickers and local time stop working |
| Nominatim | Address → coordinates for events | Events save without a map pin |
| OpenStreetMap tiles | Maps | Grey maps |
| ExchangeRate-API | Price and budget conversions | Prices in other currencies aren't added to the budget (the card says so) |

---

## 5. A short pre-launch checklist

1. Join the Apple Developer Program; set up TestFlight.
2. Move Firebase to Blaze with a budget alert; turn on backups.
3. Get Unsplash production approval; choose a paid flight-status plan or accept limits.
4. Switch map tiles to a provider with a free tier.
5. Add a rate limit to the Worker.
6. Add in-app account deletion, a privacy policy, and Sign in with Apple.
7. Replace the website join page with Universal Links.

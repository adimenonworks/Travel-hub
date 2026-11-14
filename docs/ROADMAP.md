# Rove roadmap

**This file is the source of truth for where Rove is going.** The Figma Planning board (page Planning, `466:552`) is a visual copy of it, updated one way only: when this file changes, the board is redrawn to match (see `CLAUDE.md`). Nobody edits the board directly.

**Keep it current:** any change that builds, decides, adds or drops a feature updates this file in the same pull request. The reason goes in `docs/DECISIONS.md`. Bigger features only: small fixes and tweaks don't belong here.

Last updated: 14 Nov 2026.

| Column | Means |
|---|---|
| **Now** | Written up as a change prompt in `docs/changes/` and queued to build, in order |
| **Next** | Decided and close: waiting on the owner, or a small build |
| **Later** | Decided, but not now: needs money, an account or scale |
| **Needs a design first** | Don't invent it: design in Figma, then build |
| **Blue sky** | Ideas to explore. ◆ = suggested by Claude, not the owner |
| **Decided not to build** | So it doesn't creep back in. Each has its reason in `DECISIONS.md` |
| **Built** | What Rove does today |

Every card in Now, Next and Later has a **How we'd build it** line: the approach, the services or accounts it needs, a rough size (small / medium / large), and anything the owner must do.

---

## Now

Built in this order. Progress is in `docs/changes/PROGRESS.md`.

### 1. New trip stops and Home's main button
`docs/changes/rove-change-new-trip-stops.md`
- **Home:** Plan a trip is the Primary button, Save a place Neutral.
- **New trip takes several places** ("Add every stop, or just the first"); a trip covers its stops plus every place on its events. No stops list in Edit trip.
- **Bring your saves** only shows the trip's countries, and is skipped when nothing matches. Add from saved also offers other countries.

**How we'd build it:** the change prompt, run by Claude Code. A new `trip.stops` field (older trips read as their one place), possibly a rules update. Small to medium. Nothing for the owner beyond reviewing.

### 2. People, sharing and money
`docs/changes/rove-change-people-and-sharing.md`
- **One shared trip, everyone equal.** "Join", never "invited into my trip"; any traveller can edit or delete it (Recently deleted keeps it 30 days).
- **Travelling and Following** replace Planner and Viewer. Followers see the plan and chat, never prices or bookings.
- **Who's in, per event.** Being added means you're in; I'm out removes it from your itinerary only. Guests can join a single event.
- **Undo and per-event change history** with Restore.
- **In-app Notification centre** (lock-screen push stays in Later).
- **Itinerary shows only your events,** with a switch to see one other traveller's. It opens on today, with a Today chip.
- **Ideas:** To decide · Passed. A dated idea shows on its day as a suggestion with I'm in and Pass.
- **Bookings:** one shared event, with each person's own "Your booking" (reference, seat, bags, files).
- **Prices** are a total split by who's in (or "Each"), each in its own currency. **Budgets are personal and private,** in your Settings currency.
- **Trip edit:** the trip's places aren't edited after creation (see 1).

**How we'd build it:** the change prompt, run by Claude Code. Firestore rules and tests change with the model (prices, bookings and budgets in documents only their people can read). Large. The owner reviews the Collections storage plan and publishes the rules.

### 3. Trip polish, notifications, saving and Collections
`docs/changes/rove-change-polish-and-library.md`
- **Itinerary:** swiping between days follows your finger; no month markers.
- **Edit sheets:** sectioned and calmer; no automatic keyboard; no jumping. Type is changed with Change type.
- **Layovers:** one form for a whole journey. ⏸ Designed in Figma first.
- **People rows:** a role dropdown on each row.
- **Tabs:** switching keeps your place; everything moves gently.
- **Notification centre** on Home, and red badges.
- **Save a place:** the Trip tab saves to a trip's ideas, with an optional suggested day.
- **Feel:** one bigger toast on the dark inverse surface; saving feels instant.
- **Travel times:** from a real routing service, with the mode chosen sensibly. "No travel planned" when there's a gap with no journey.
- **Fewer grey boxes:** lists sit open on the page, and pressed rows fill their container.
- **Files & links:** favicons and file-type icons.
- **Trip edit:** a photo editing mode.
- **Collections:**
  - places never move out (Want to go · Planned · Been);
  - Favourites move into Collections;
  - areas (city or region) and a single save count;
  - Select → Add to trip ideas;
  - search, and the "…" menu with Share and Delete;
  - collection roles become Editor and Viewer.
- **Firebase security rules:** tested and published.

**How we'd build it:** the change prompt, run by Claude Code. Free routing service now (e.g. OpenRouteService through Rove's server); Apple Maps Server ETA later. Large. The owner approves the design gates (layovers, fewer grey boxes, Collections storage) and the rules diff.

---

## Next

### Unsplash production approval (owner)
Covers are live (checked 14 Nov: the server answers with Unsplash photos). Send screenshots of a cover and its credit, for about 1,000 requests an hour.
**How we'd build it:** apply on Unsplash's developer site with the screenshots. No code change. Small.

### Airbnb-style invite (owner designing)
A nicer share sheet, and an illustrated card that shows when the invite link is sent.
**How we'd build it:** the owner designs the sheet and card in Figma; then it's built from the Sheet, Card and Illustration components with the phone's share sheet. Medium. Invite links stay the same.

### Settings rows
Forward bookings, Notifications, and Support (Help & feedback, Privacy, Rate Rove). Each needs somewhere to go first.
**How we'd build it:** each row ships with its feature: Forward bookings with booking emails, Notifications with push, Support as links (Help → email, Privacy → the policy page, Rate Rove → the App Store page once listed). Small each.

### Universal Links
Invite links open the app (not the website) for people who have it.
**How we'd build it:** the Apple Developer Program, an `apple-app-site-association` file on the website, Associated Domains in Xcode, then the app opens `/join` links itself. Small to medium. The owner joins the program and flips the switch in Xcode.

---

## Later

### Lock-screen notifications
Chat messages, trip changes, check-in open. The in-app Notification centre (Now, 1) comes first, and its entries are shaped so they can be sent as push later.
**How we'd build it:** the Apple Developer Program (about A$149 a year), an APNs key, the push plugin, and a small function on Rove's server that sends a push when something arrives. Large. The owner joins the program and creates the key.

### TestFlight
Install and update Rove on other phones without Xcode or the 7-day expiry.
**How we'd build it:** Apple Developer Program → an app record in App Store Connect → Archive in Xcode → Upload → invite testers by email. Small once the account exists.

### Booking emails
Forward confirmations to your Rove address. Rove reads the booking reference, seats, bags, Manage booking link and multi-leg flights, and fills in "Your booking".
**How we'd build it:** a forwarding address (Cloudflare Email Routing → Rove's server), a reader for each confirmation (an AI model or per-airline templates), saved as events with the right type and category. Large. Needs an AI API key on the server.

### Widgets and Live Activities
"Leave in 12 min", today's next plan on the Lock Screen.
**How we'd build it:** a native Swift widget that reads the next event the app shares with it (an App Group); Live Activities add ActivityKit and push updates. Large. Apple Developer Program.

### Direct Gmail connect
Instead of forwarding.
**How we'd build it:** Google sign-in with read-only Gmail permission, Google's verification and yearly security assessment (about US$550), then the same reader as booking emails. Large. Booking emails come first.

### Apple Maps inside Rove
The map pictures, and travel times from Apple's ETA service (walking, driving, public transport), replacing the free routing service.
**How we'd build it:** swap Leaflet for Apple's MapKit JS in the one map adapter, and the routing adapter for the Apple Maps Server API ETA. Both use a MapKit key from the Apple program, with tokens signed by Rove's server. Medium. The owner creates the key.

### File uploads
PDFs and photos stored in Rove. Links work today.
**How we'd build it:** Firebase Storage (Blaze plan, pay as you go), uploads from Files & links, rules so only the people on an event can open its files. Medium. The owner switches to Blaze.

### Android
From the same code.
**How we'd build it:** add the Android project (Capacitor), Google sign-in for Android, test on a phone, publish with a Google Play account (US$25 once). Medium.

### The website, full version
Bring back the full web app, beyond the join-only site. This is why hover tokens are kept.
**How we'd build it:** turn off join-only mode for signed-in people, check every screen at desktop widths, and design the desktop layouts first. Large. Needs designs.

### A fourth tab
Wise-style, once its page exists.
**How we'd build it:** decide what it's for, design it in Figma, then add it to Bottom navigation and give it a page. Small once designed.

### Rate limit on Rove's server
Anyone who finds the server's address could use up the Unsplash and flight quotas.
**How we'd build it:** Cloudflare Security → WAF → Rate limiting, e.g. 60 requests a minute per person; optionally the app sends its sign-in token and the server checks it. Small. The owner adds the rule.

### App Check
Proves requests come from the real Rove app, so scripts can't hammer the database. Before launch.
**How we'd build it:** turn on App Check in Firebase with App Attest, add its SDK to the app, then enforce it for Firestore. Small to medium. Apple Developer Program.

### Add from an AI assistant (MCP)
Rove as a connector, so Claude or ChatGPT can add places, ideas and events by chat ("save this café to my Lisbon trip").
**How we'd build it:** a small MCP server on Cloudflare with tools like `add_place`, `add_idea`, `add_event`, writing to Firestore with the Firebase Admin SDK; assistants sign in with Google. Medium.

---

## Needs a design first

- **Booking import review:** forward, paste or upload; extracted fields beside the original; unsure fields; duplicates; multi-leg; changes and cancellations.
- **Invitations:** what someone without an account sees, and accepting an invite (the roles and link are decided in Now, 1; the Airbnb-style invite card is in Next).
- **Notification settings:** which alerts, day-before brief, leave-now (the in-app Notification centre is decided in Now).
- **Offline states:** a banner, what still works, queued saves.
- **Recap card:** a card at the end of a trip.
- **First run:** welcome, sign-in tagline, first empty states.
- **Itinerary warnings:** overlapping plans, and not enough travel time between them ("No travel planned" for a long gap is decided in Now, 2).
- **Place detail screen:** more than today's place sheet.
- **Trip edit screen:** name, dates and cover as a full screen (today it's a sheet; Now, 2 adds photo editing to the sheet).
- **Dark mode pass:** every screen checked in dark.
- **Desktop layouts:** for the full website (Later).

---

## Blue sky

- **Nearby recommendations:** AI suggestions for cafés, bars and things to do near where you'll be.
- **More Home widgets:** weather, what's next, countdowns.
- ◆ **Saves from video:** read the place out of a TikTok or Reel caption, not just the link.
- ◆ **Weather-aware days:** suggest swapping an outdoor plan for an indoor one when rain is forecast. The weather icons are kept in the library for this.
- ◆ **Smart day order:** reorder a day to cut travel time between plans.
- ◆ **Group decisions:** polls for dates or destinations before a trip exists.
- ◆ **Trip recap to share:** a story-style recap with the places you visited and your photos.
- ◆ **Offline maps for the trip:** download the trip's area before you fly.
- ◆ **A neutral selected Chip:** only the icon takes the type's colour, so Chip can drop its `Type` property (from the library cleanup).

---

## Decided not to build

| What | Instead / why |
|---|---|
| **Expenses, splitting, settle-up, daily allowances** | Rove isn't a bill-splitting app. Budgets are a personal planning total; a price share is what something costs you, not who owes whom |
| **To-do tracking:** booked / not-booked, to-book lists, trip tasks, packing lists | Out of scope; calm over complete |
| **A separate trip-day Home** | Home's "Happening now" and the Hero card change with the trip instead |
| **Dragging ideas onto days** | "Add to a day" (owner, 8 Nov) |
| **"Not sure yet" trip dates** | A trip without dates is just saved places (8 Nov) |
| **A check-in button** | Status only; airlines handle check-in |
| **A copy of the trip per person** | One shared trip; it feels like collaboration, and copies drift apart (13 Nov) |
| **A combined "everyone" itinerary view** | Unreadable on a phone with several people at once; one person's view at a time (13 Nov) |
| **A day-picker calendar, busy-day dots, or a jump-to-date calendar** | Opening on today, plus a Today chip, covers it (13 Nov) |
| **Moving a place out of Collections when it goes into a trip** | Collections stay the source of truth; states show Want to go / Planned / Been (13 Nov) |
| **"Fix areas" and "Move to another area" in Collections** | Rove couldn't fix them reliably, and the owner doesn't want them (13 Nov) |
| **The Country sheet on a collection** | Not useful there (13 Nov) |
| **Google for travel times** | Its terms restrict showing its routes with non-Google maps; Rove uses OpenStreetMap, then Apple (13 Nov) |
| **Celebration confetti** | The owner found it corny (14 Nov) |
| **Colour modes for the deep-green areas** | Too few tokens to warrant it; a small `feature/` group instead (14 Nov) |
| **Others** | Trip templates, calendar feed, date finder, arrivals board, airline-app link, plugs / eSIM info, generated wallet passes |

Reversed (once on this list, now planned): **per-event "who's going"** and **activity history** (now per-event change history). Both are in Now, 1, and in `DECISIONS.md` (13 Nov).

---

## Built

What Rove does today (on Main, in the iPhone app).

- **Saving places:** from any app (Share → Rove) or a pasted link. Rove reads the link and finds the place, city and category; "Saving to · Change", Undo toast, works offline, merges duplicates. Share to Rove can also add to a trip (11 Nov; Now, 2 narrows the Trip tab to ideas).
- **Collections:** every place filed country → city → category; links & notes per country; Map card; Visited ✓ and favourite ★.
- **Shared collections** (11 Nov): share a country's collection by link, as Can edit or Can view; "Saved by you and Sam"; enforced by the rules.
- **Planning a trip:** full-screen New trip (where; exact dates or a rough month; who; bring your saves), then the celebration.
- **Trips library:** Upcoming · Collections · Past with Hero cards, the remembered segment, empty states.
- **A trip:**
  - Overview: Next stop, Bookings, Recently viewed, Good to know;
  - Itinerary: day cards, travel times, now line, hold for Edit / Delete;
  - Ideas: votes, Add to a day;
  - Photos: shared album links;
  - People: Planner and Viewer roles, invite links.
- **Events:** 6 types and 46 categories; the category sets the icon, colour and behaviour (journey, span, at a place, open time, note). **Colour-coded event types** everywhere.
- **Layovers and time zones:** connections as one Journey card; each event keeps its place's time zone.
- **Event chat:** Messages-style comments, alerts while the app is open, "new message" tags, read state synced across devices.
- **Budgets** (10 Nov): a per-person trip budget, prices per person on bookings, and an Overview Budget card. Now, 1 makes it personal and private.
- **Country sheet:** emergency numbers, official entry rules (29 countries hand-checked), local time, currency.
- **You:** profile, travel stats and map, Favourites, Settings (home city, currency, maps app, appearance), Recently deleted (30 days), Delete account, privacy policy.
- **Join-only website** (11 Nov): sign in, accept the invite, open the app.
- **Feel:** both screens move on navigation, swipe back with the real previous screen, swipe between days, haptics, rubber-band bounce, sheets that rise with the keyboard, dark mode, iPhone text sizes, 24-hour times.
- **Behind the scenes:** Firebase sign-in and database, offline cache, security rules with tests, share extension, Rove's small server (Unsplash covers, live flight status; set up by the owner, live since 10–11 Nov).
- **Design system** (13–14 Nov): component library cleanup and library v2. Tokens are Base · Color · Layout · Typography · Motion; every value comes from a variable; Figma and code match 1:1 (`docs/token-migration.md`).

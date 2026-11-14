# Rove decisions

**Why Rove is the way it is.** Decisions with their date and reason, newest first. **This file holds the current month only**; older months are in `docs/decisions/` (one file per month, e.g. `2026-11.md`). Search those when you're changing something and need the reason behind it.

**What goes in** (owner, 14 Nov 2026), anything someone might later question or be tempted to undo:
- a rule ("every value comes from a variable");
- a real choice between options, with what was turned down;
- a reversal of an earlier decision;
- something deliberately **not** built.

**What doesn't:** bug fixes, tweaks and small adjustments (a spacing value, a renamed label). The reference files say how things are now, and the pull request records the change.

**Keep it current:** a change that makes, changes or reverses a decision adds an entry in the same pull request. A reversal says what it replaces, and the old entry gets a "Reversed on …" note. Don't delete old entries.

**Each month:** in the first change of a new month, move the previous month's entries to `docs/decisions/YYYY-MM.md` (word for word), leaving this file with the new month only.

- **How Rove works now** is in `CLAUDE.md` and the reference files it links to.
- **Where it's going** is in `docs/ROADMAP.md`.
- **What's being built** is in `docs/changes/`.

**Entry format:** a short title, then **Decision**, **Why** (when known), and **Replaces** or **Where** when useful. "Owner" means Rove's owner decided it; the rest were proposed by Claude and agreed by the owner.

---

## 14 Nov 2026

### Keep the docs every session reads short (owner)
- **Decision:**
  - `DECISIONS.md` only takes decisions someone might question or undo (rules, real choices, reversals, things not built), and holds the current month; older months move to `docs/decisions/`.
  - `PROGRESS.md` only holds the prompt being worked on; finished prompts and their results move to `docs/changes/done/`.
  - Sessions read the roadmap only when planning, and only the part of a reference file that touches the work.
  - Screenshot checks are compared by a pixel-diff script; Claude only opens the ones that differ.
- **Why:** every session reads these first. After two days they were about 30,000 words a session (DECISIONS 4,600, PROGRESS 8,400), which makes every session slower and costlier. Nothing is deleted; it's just not all read every time.

### Travelling and Following: built (people and sharing, item 2, first part)
- **Decision:** Add people opens a sheet with two Option cards, Travelling and Following (each with its one line), then Share link makes a link carrying that role and opens the share sheet ("Join us on <trip> in Rove", or "Follow <trip> in Rove" for a Following link). The join page says what a follower gets. People is one list with a role dropdown on each row (List item "Show Button", a Ghost Button) that opens the Context menu: Travelling, Following (the current one ticked) and Remove from trip, or Leave trip on your own row. Followers see roles as plain text and leave with a button at the end. Changing a role confirms with a Toast with Undo.
- **Settled while building:** there's always at least one traveller: the last one can't make themselves Following (a Toast says to make someone else Travelling first), since only travellers can change anything. The rules check the role against the link: a Following link can only make you a follower; links from older app versions carry no role and still mean travelling.
- **Split:** item 2's Undo-on-everything and per-event change history come next as their own pull request; "only people in an event edit it" and "Just me / Remove for everyone" need item 3's who's in, so they're built with item 3.

### Page header: the meta line sits with the title (owner)
- **Decision:** the meta (a trip's dates) moves into the title's column, after the subtitle, 12px apart; with no subtitle it sits where the subtitle would. Polish prompt G11.
- **Why:** it was placed under the whole title row, so the edit button or the category icon pushed it far from the title. The owner spotted the real cause.
- **Replaces:** the same day's plan to shrink the gap to 8px (the gap was never the problem).

### Control heights: minimum height plus padding, Small buttons 36px (owner)
- **Decision:**
  - Buttons, Chips and Tags are built with a minimum height and padding (as Button already was), so icons never change their shape and they grow with larger text.
  - Small buttons (and Icon button Small) go from 32 to 36px, padding 8 / 16. Large stays 48.
  - Chip and Tag share a new role token, `size/pill` (28). Every minimum height in Figma is linked to a variable.
  - Polish prompt G10.
- **Why:** 32px felt tight on a phone; 36 is a bit roomier while staying clearly smaller than Large (40 was considered, but would blur Small and Large and make section headers taller). Figma's Chip was 30px unselected and 28px selected, and Button's minimum heights were typed-in numbers.

### One trip, everyone equal: built (people and sharing, item 1)
- **Decision:** no owner anywhere. Two roles, **Travelling** (`traveller`) and **Following** (`follower`). Any traveller edits the trip, adds people, changes roles, removes someone and deletes the trip; anyone can leave. Who started the trip is kept as `createdBy`, a record only.
- **Details settled while building:** deleting goes to Recently deleted for everyone, and any traveller restores it or (after 30 days) clears it for good; the rules only allow deleting for good from Recently deleted. The last traveller leaving deletes the trip into Recently deleted, and they stay on it so they can restore it. Deleting your account leaves every trip; a trip with no other traveller is deleted. Older trips are migrated by the first traveller who opens them (owner, editor, member → traveller; viewer → follower; `ownerId` → `createdBy`), since there's no server; until then the app and the rules read the old names the same way.
- **Copy:** "Join us on <trip> in Rove"; the join screen reads "<Name> wants you to join <trip>" with **Join trip**; "invite" is gone from what people read.
- **Replaces:** "Delete account hands trips to the next member" (10 Nov) and the creator-only delete.

### Edit trip keeps Budget and Local currency until item 8 (owner)
- **Decision:** removing Budget per person and Local currency from Edit trip and New trip moves from item 1 to item 8 of the people and sharing prompt, where personal budgets and per-price currencies replace them.
- **Why:** removing them first would leave the Budget card with nothing to show until item 8.

### Your travels counts every city (owner)
- **Decision:** a past trip's cities are its first stop plus every city its events were in, worked out like its countries. Older events get their city from their map position, once. Polish prompt G9.
- **Why:** after New trip stops, countries counted every country visited but cities only the first stop ("2 countries, 1 city" for Tokyo → Kyoto → Seoul).

### Home: Plan a trip is the main button (owner)
- **Decision:** Plan a trip is Primary and on the left; Save a place is Neutral. Never two Primary buttons side by side.
- **Why:** most saves arrive through the iPhone share sheet, but a trip can only be started in the app. Two emerald buttons would compete; Wise and iOS keep one main action.
- **Replaces:** Save a place as the Primary quick action.

### New trip takes several stops (owner)
- **Decision:** step one is "Where are you going?" ("Add every stop, or just the first. You can add more later.") and adds places to a list. Saved as `trip.stops`; the first stop is still `destination` (name and cover). A trip's countries are its stops plus every place on its events.
- **Why:** trips often cross several countries. With one place only, "Bring your saves" and Good to know would miss every other country until events were added there. "Where are you starting?" alone was considered and rejected for that reason.

### The trip's countries look after themselves (owner)
- **Decision:**
  - Edit trip doesn't list or edit the stops.
  - Overview's "Good to know" becomes **"Countries you're visiting"**: the live list (stops plus event places), each row opening the Country sheet. A stop with no events says "No plans yet".
  - After the trip ends, only countries with events count (the first stop is kept if there are none). Worked out on the fly, nothing deleted. You → Your travels counts countries this way.
  - No prompt to remove unvisited countries.
- **Why:**
  - Removing a place must never delete events, and events already add countries.
  - A read-only list doesn't belong in an edit sheet; Overview already had a row per country.
  - Unvisited stops would otherwise inflate your travel stats.
  - A prompt mid-trip would nag about countries you haven't reached yet.
  - To bring in saves from a country added later, Ideas → Add from saved also lists other saved countries.
- **Replaces:** the people change's read-only "Started in Lisbon" line in Edit trip. The owner's idea of a removal prompt in notifications was considered and dropped.

### Bring your saves matches the trip (owner)
- **Decision:** the New trip step only offers saves from the trip's countries, and is skipped when none match.
- **Why:** offering every save was noise; the step should only appear when it's useful.

### New trip stops before the people change (owner)
- **Decision:** `rove-change-new-trip-stops.md` runs before `rove-change-people-and-sharing.md`.

### Page header keeps its simple back button and trailing button
- **Decision (owner):** no separate "Back label" property and no free-form trailing slot on the Page header. The back label stays the label of the Button nested inside it, and the trailing spot stays one Icon button, shown or hidden.
- **Why:** the back label can already be changed in Figma by editing the nested Button, and the app only ever puts the edit button on the right. Both would be settings nothing uses.
- **Replaces:** the component library prompt's ask for both (13 Nov 2026), which wasn't built.

### Two Figma mismatches go into the polish prompt
- **Decision (owner):** Dropdown gets Size Small / Large in Figma (replacing code's `compact`), and Figma's Text area is drawn at its real height. Both are G8 in `rove-change-polish-and-library.md`.
- **Why:** components must always match exactly; library v2 found both and left them.

### The transparency documents
- **Decision:**
  - `docs/ROADMAP.md` is the source of truth for the roadmap. The Figma Planning board is a visual copy, redrawn one way only from the file.
  - `docs/DECISIONS.md` (this file) records every decision and its reason.
  - `CLAUDE.md` is split: rules and pointers stay in it; reference detail moves to `docs/`.
  - New rule: **read first** (before planning or new work, read `CLAUDE.md`, `DECISIONS.md`, `ROADMAP.md`, the change documents and `PROGRESS.md`) and **write after** (update them in the same change as the decision).
- **Why:** total transparency. Any AI, or any person, can read the repo and understand the present, the past and the plans. It also stops decisions made in one chat being invisible to another. `CLAUDE.md` had reached about 10,000 words, read in full every session.

### Session start: check and ask, never pull automatically
- **Decision:** a Claude Code start-up check only looks. If the local copy is behind Main, Claude says so and asks before pulling. It points out unsaved changes first.
- **Why:** an automatic pull felt too risky to the owner, because Claude Code works directly in the owner's folder.
- **Replaces:** a proposed automatic pull (rejected the same day).

### How the owner works with two Claudes
- **Decision:**
  - A claude.ai chat (the Rove project) reviews ideas, pushes back, audits Figma against the code, and writes and merges the change documents.
  - Claude Code, running locally on the owner's Mac (the desktop app's Code tab, not a worktree), builds them.
  - Every session starts by checking whether the local copy is behind Main; it pulls only after the owner says yes, then re-reads `CLAUDE.md` (see "Session start: check and ask" above).
- **Why:** planning and checking separate from building. Local Claude Code sees changes immediately in Xcode, can run the app, and has fewer restrictions than the cloud.

### The project left iCloud
- **Decision:** the repo lives outside iCloud Drive.
- **Why:** iCloud's syncing of thousands of small files broke Xcode ("failed to load Package.swift").

### Library v2: one token system
- **Decision:**
  - Collections: **Base** (raw values, never used by components directly) · **Color** (Light / Dark) · **Layout** · **Typography** · **Motion** (new).
  - One colour set with no `on-light` / `on-mid` / `on-dark` / `on-accent` prefixes.
  - Deep-green areas use a small `feature/` group, not a mode.
  - Hover tokens are kept.
  - "error" becomes "danger"; `tag/brand` becomes `tag/category`; `interactive/*` becomes `button/*` and `control/*`.
- **Why:**
  - Feature group, not modes: only about 8 dark-green tokens were actually used, and the owner felt modes weren't worth the complexity for a system this size.
  - Hover tokens: the full website is coming back, and it's used with a mouse.
- **Where:** `docs/token-migration.md` (every old name and new name).

### Every value comes from a variable (owner's rule)
- **Decision:** in Figma and code, every colour, spacing, corner, size, border width, text value and timing inside a component comes from a variable or style.
- **Allowed exceptions:**
  - screen frame widths on the Figma Screens page;
  - text-relative sizes written `calc(Nrem / 17)`;
  - `0`;
  - media query widths;
  - numbers passed as component props;
  - artwork.
- **Why:** that's the point of a token library.

### Sizes: no one-off component size tokens
- **Decision:**
  - **Role tokens** only where a meaning is shared: tap, icon, control, avatar, category icon, tab bar, content max.
  - **Everything else** uses a numbered scale, `size/{step}`, like spacing.
- **Why:** per-component names (`size/day-card`, `size/badge`) would grow into a long list nobody reuses.

### Size names: Small / Large, Medium when there are three (owner)
- **Decision:** no "Regular". Button and Icon button are Small / Large; Avatar and `.Category icon` are Small / Medium / Large.
- **Why:** consistent, and matches iOS.

### Naming rules (owner)
- **Decision:**
  - Full names, not abbreviations (Information, Document, Sign out, Bottom navigation).
  - Sentence case everywhere.
  - Booleans read "Show <thing>", using the component's name when the thing is a component ("Show Icon button").
  - Every layer name starts with a capital.

### Token decisions from the migration review
- **Next card's Tag:** the plain white Tag, as Figma draws it. The dark grey pill was an accident of the old re-pointing.
- **Selected Chips:** emerald-700 like every other selected control, so there's one `control/selected`.
- **Your chat bubbles:** deep green (`feature/*`); they read better in dark mode.
- **Map pin:** its own `map/pin` and `map/pin-icon` tokens, so restyling buttons can't change it by accident.
- **Favourite star:** emerald (`icon/brand`), like every other filled icon.
- **Motion:** every existing duration kept exactly, for now. The polish prompt consolidates them.
- **Deleted as unused:** `feature/text-brand`, `overlay/image`, `illustration/warm`, `space/550`, `radius/800`.

### Celebration confetti removed (owner)
- **Decision:** no confetti. The rest of the celebration (illustration, count-up, haptic) stays.
- **Why:** the owner found it corny. It was also the last use of the on-accent colours.

### Text field, Text area and Dropdown are three components (owner)
- **Why:** three different things in the input category.
- **Replaces:** one Text field with a Layout property.

### Message is a real component
- **Decision:** the chat bubble is a design component in Figma and code, matching 1:1.

### Unused icons are kept (owner)
- **Decision:** the weather icons and others the app doesn't use stay in the library.
- **Why:** icons are always useful; weather-aware days are on the Blue sky list.

### Component section headers are very large (owner)
- **Decision:** each group header on the Foundations Components section is readable at a glance when zoomed out.

### Polish and feel (agreed for the polish prompt)
- **One toast size,** the larger one, on the dark inverse surface; Danger for errors.
  - **Why not deep green:** deep green already means "Next" and feature surfaces, and a green toast reads as "success" even when it isn't.
- **Saving closes the sheet immediately,** and the write finishes in the background; Retry if it fails.
  - **Why:** waiting for the server made every save feel slow.
- **Travel times come from a real routing service** through Rove's server, cached per pair of places: a free service now, Apple Maps Server ETA later. The mode is chosen by distance and a Settings preference. "No travel planned" shows when two places are far apart with no journey between them.
  - **Why:** the old estimate was a straight line × 1.3 at a fixed speed, often wrong, and missing when a place had no coordinates.
  - **Why not Google:** its terms restrict showing its routes with non-Google maps.
- **Fewer grey boxes:** grey means one object (an event, a trip, a place); lists of rows that lead somewhere sit open on the page with a chevron.
  - **Why:** the owner felt too much sat in grey boxes. "Grey means tappable" would be fragile; affordance comes from chevrons and pressed states.
- **Pressed rows fill their container,** the iOS inset-grouped way.
- **No sticky hover on iPhone:** every `:hover` rule goes inside `@media (hover: hover)`.
- **Favicons come through Rove's server,** so people's links aren't sent to a third-party favicon service.
- **Trip edit photo** moves only in an explicit Edit photo mode.
  - **Why:** swiping the sheet kept moving the photo by accident.

### Trip edit (owner, refined)
- **Decision:**
  - Any traveller can edit the trip, but its location is locked after creation.
  - A trip covers its starting location plus every place on its events.
- **Why:** the lock alone would trap a trip that grows beyond its first city.

### Money: per-price currency, personal budgets (owner, refined)
- **Decision:**
  - No trip currency. Every price has its own currency, pre-filled from the event's place.
  - Shares and budgets convert to each person's Settings currency.
  - Budgets are set on the Budget card, not in Edit trip or the New trip flow.
- **Why:** trips can span several countries.

### Library v2 before change two (owner)
- **Decision:** the token restructure ran before the people and sharing change.
- **Why:** otherwise new components would be built on old tokens and migrated straight away.

---

## 13 Nov 2026

### Challenge the owner's requests (owner's standing rule)
- **Decision:** every request is first checked for a better, more on-brand, more standard or more native way, proposed before building.
- **Why:** the owner wants Rove to be excellent, and their ideas are a starting point.
- **Also:** rules the owner sets explicitly are absolute.

### People: one shared trip, everyone equal (owner)
- **Decision:**
  - One trip, the same for everyone. No visible owner.
  - "Join" wording.
  - Any traveller can edit, invite, change roles or delete (Recently deleted keeps it 30 days).
- **Why:**
  - **Not a copy per person:** copies drift apart, and changes don't reach everyone.
  - The owner wanted collaboration that feels like "our trip", not "my trip you're invited into".
- **Replaces:** Planner / Viewer with a hidden creator rank (11 Nov).

### Travelling and Following
- **Decision:** two trip roles.
  - **Travelling:** on the trip; plans everything.
  - **Following:** family at home, or a friend not on the trip; sees the plan and chats, never prices or bookings, changes nothing.
- **Why:** "Viewer" didn't say whether someone was on the trip.

### Who's in, per event
- **Decision:**
  - Each event has a list of who's in.
  - **Defaults:** plans added by hand include everyone; bookings include only you; an idea added to a day includes its voters.
  - **Being added means you're in.** Silence is yes, and I'm out removes it from your itinerary only.
  - **Guests** can join a single event.
- **Why:** people on one trip do different things. Silence-is-yes means a couple never has to answer anything.
- **Replaces:** "Per-event who's going: not to build" (10 Nov).

### Editing, undo and history
- **Decision:**
  - Only travellers in an event edit it.
  - Deleting a shared event offers "Just me" (the default) or "Remove for everyone".
  - Every edit has an Undo toast, and each event keeps a change history with Restore.
- **Why:** with everyone able to edit, mistakes must be easy to undo.
- **Replaces:** "Activity history: not to build".

### Notification centre now, push later
- **Decision:** an in-app Notification centre (the bell) for additions, changes, joins and messages. Lock-screen push waits for the Apple Developer Program.

### Itinerary: yours, or one person's
- **Decision:**
  - The Itinerary shows only your events, with who's in.
  - A person switcher shows one other traveller's itinerary at a time.
  - There's no combined view.
- **Why:** several people's plans at the same time can't be shown well on a phone.

### Bookings: one shared event, personal details
- **Decision:**
  - One event per real thing (everyone on the same flight shares it).
  - Each person has a private "Your booking" section: reference, seat, bags, files.
  - Same flight number and date merge into one event.
- **Why:** time changes and live status reach everyone, while personal details stay personal.

### Prices and budgets
- **Decision:**
  - An event's price is a total, split by who's in. "Each" mode is for per-person tickets.
  - Only people in the event see prices.
  - Budgets are personal and private.
  - Prices live in database documents only their people can read.
- **Why:** costs are private to the people sharing them. Firestore sends whole documents, so hiding a price only in the interface wouldn't protect it.

### Ideas: To decide and Passed only (owner)
- **Decision:**
  - **No Planned segment:** an idea on a day is an event.
  - **An undated idea** gets "Add to a day".
  - **A dated idea** shows on its day as a suggestion with I'm in and Pass. The first I'm in makes it an event, and it leaves Ideas for everyone. Others stay opt-in.
  - **Pass** hides it for you only. It moves to Passed once all others pass, or the suggester passes it.
  - Suggestions don't count in going counts, budgets or Next up.

### Itinerary opens on today (owner)
- **Decision:**
  - During a trip it opens on today; before or after a trip, on the first day.
  - A Today chip appears when today is out of view.
  - **No** day-picker calendar, busy dots or jump-to-date calendar.
- **Why:** jumping to any date is niche. Opening on today, plus a way back to it, covers almost every case.

### Collections are the source of truth (owner)
- **Decision:**
  - Places never leave Collections when they go into a trip. Their state is worked out: Want to go · Planned · Been.
  - Places on events you're in join your Collections automatically.
  - Favourites move into Collections.
- **Why:** moving places out would shrink collections, lose passed places, and leave ✓ and ★ with nowhere to live.

### Collections: areas, counts and actions (owner)
- **Areas:** grouped by area (a city, or a state or region), counting only total saves.
- **"Collections"** everywhere.
- **A trip row**, and **Select → Add to trip ideas / Change category / Remove**.
- **Search,** and **tapping the source reopens the original link.**
- **The "…" menu** has Share and Delete only.
- **No** "Fix areas", "Move to another area" or Country sheet.

### Collection roles: Editor and Viewer (owner)
- **Decision:** sharing asks the role first, then sends the link. "Member" is renamed Editor. The people list works like the trip's, with role dropdowns.

### People list: one list with role dropdowns
- **Decision:** no Travelling / Following sections. Each row has a role dropdown, and roles are set when inviting.
- **Why:** sections repeat what each row already shows, and felt clunky.

### Save a place: Trip tab saves to ideas only (owner)
- **Decision:**
  - Both tabs share one layout.
  - The Trip tab picks the trip, adds to its ideas, and offers an optional suggested day.
  - No "new event" or "add to an event".
  - The ideas lightbulb is neutral, not brand-coloured.

### Polish decisions (owner)
- **Day swipe** follows the finger, with no month markers.
- **Edit sheets** open on the details; Change type holds the type picker.
- **No automatic keyboard** when a sheet opens.
- **Edit sheets are sectioned.**
- **Layovers** are one form in the journey's edit sheet. ⏸ Designed in Figma first.
- **Switching trip tabs keeps your place.**
- **Nothing jolts:** motion tokens everywhere.
- **Red badges** on tabs, day cards, Bottom navigation and Hero cards.

### Component library cleanup
- **Merges:**
  - Card + Empty state;
  - Location card + Collection header → Map card, with no progress bar;
  - Trip header → Page header;
  - Hero card as one component;
  - Journey details + Span card + Layover block → Journey card;
  - Search field → Text field;
  - Cover scene → Illustration.
- **Event type lives only in `.Category icon`.** Chip is the one exception.
- **Removed:** Hover variants in Figma, Flow screen as a component, Tile's colour variants, Tag's Tint.
- **Why:** a lighter library that's easier to reuse.

### Segment labels always stay on one line (owner)
- **Decision:** labels shrink to fit, then drop their count, and never wrap.

### One account, merge after every item
- **Decision:** each finished item is its own merged pull request, and `PROGRESS.md` records where work is.
- **Why:** a new session can always continue from Main.

---

## 12 Nov 2026 and earlier

From the repo's history and `CLAUDE.md`. Fewer reasons were recorded then.

| Date | Decision |
|---|---|
| 11 Nov | **Planner / Viewer trip roles,** with the creator's rank hidden *(replaced 13 Nov by Travelling / Following)* |
| 11 Nov | **The website is join-only;** the app is the product |
| 11 Nov | **Shared collections** (Can edit / Can view) |
| 11 Nov | **Recently deleted** keeps trips, events and places for 30 days (the owner called it an archive) |
| 11 Nov | **Event types are colour-coded** ("Option D"): Getting around sky, Stays violet, Food & drink yellow, Activities pink, Notes emerald, Free time neutral |
| 11 Nov | **Flights folded into Getting around** (6 types) |
| 11 Nov | **Saved places use event categories** |
| 11 Nov | **Trip tabs and Segment controls are tap only.** No row swipes; hold an event for Edit / Delete. Sideways swipes belong to changing day |
| 11 Nov | **Edit sheets** put Save at the top and Discard at the bottom |
| 11 Nov | **Both screens move on navigation,** like iOS ("planted, smooth, premium") |
| 11 Nov | **Every Next and Later card has a "How we'd build it" line** |
| 11 Nov | **Neutral is the everyday second button** (light grey) |
| 11 Nov | **Share to Rove:** Collections or a trip *(the Trip tab narrowed to ideas on 13 Nov)* |
| 10 Nov | **Budgets come back** as a per-person planning total. No expenses or splitting *(made personal on 13–14 Nov)* |
| 10 Nov | **The Figma Screens page is the source of truth** for the core screens |
| 10 Nov | **Components always match exactly; screens don't** (definition of done) |
| 10 Nov | **The Planning board tracks only bigger features** *(the roadmap moved to the repo on 14 Nov)* |
| 10 Nov | **No Secondary (light emerald) button:** too weak on grey surfaces |
| 10 Nov | **Event types, categories and behaviours; layovers as one journey; each event keeps its place's time zone** |
| 10 Nov | **Event chat** messages are up to 150 characters |
| 10 Nov | **Delete account** hands trips to the next member; plus a privacy policy *(reversed 14 Nov: there's no owner; you leave, and a trip with no other traveller is deleted)* |
| 10 Nov | **Per-event "who's going" not to build** *(reversed 13 Nov)* |
| 9 Nov | **The website no longer deploys on every merge** |
| 8 Nov | **Ideas use "Add to a day",** not dragging |
| 8 Nov | **No "Not sure yet" dates:** a trip without dates is just saved places |
| 7 Nov | **Collections are separate from trips;** a trip is never created from a collection |
| 7 Nov | **Budgeting removed,** with prices only on ideas *(budgets reversed 10 Nov)* |
| 7 Nov | **Figma is the source of truth;** always keep a backup of unpushed work |
| 7 Nov | **Links are read on the iPhone itself,** so no paid Firebase plan is needed |
| 6 Nov | **The app was rebuilt from the new Figma design** |
| — | **Not built:** expenses and splitting; to-do tracking; a separate trip-day Home; a check-in button (airlines handle check-in) |

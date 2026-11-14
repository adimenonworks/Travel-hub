# Rove — change prompt: trip polish, notifications, saving and Collections

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` (Foundations, Screens `500:508`, Planning `466:553`) and the code on Main.

**Precedence:** this prompt sits alongside **"Rove — change prompt: people, sharing and money"** (`rove-change-people-and-sharing.md`). **Where the two overlap, that prompt wins.** Overlaps are called out inline as **[People prompt]**.

**Order of work:**
1. The **component library cleanup** prompt (`rove-change-component-library.md`) first.
2. Part E, step 1 to 3, with today's rules (written but not yet published).
3. The **people, sharing and money** prompt.
4. Parts B, C, D, F, G and H of this prompt.
5. Part E again, for the final rules.

Component names in this prompt are the **new** names from the library cleanup (e.g. Page header, Journey card, Number card, Map card, Banner).

**How to work:**
- **Figma first, then code.** Change the components on Foundations, update Screens, and put new screens on a section called **"Polish — draft"**. Keep drafts plain: the designer will polish them.
- **Wait for approval where marked.** Items marked **⏸ Design gate** stop after Figma: show screenshots and wait for approval before writing code.
- **Make one commit per numbered item.**
- **The existing build rules still apply:** components and tokens only, 44 × 44 touch targets, no clipping, the nested radius rule, and the haptics map.
- **If something is unclear, or conflicts in a way this file doesn't cover, stop and ask.**


## Standing rule: challenge my requests (add this to `CLAUDE.md`)

Every time I ask for a change, first check whether it's a good idea, and whether there's a better, more meaningful, more on-brand, more standard or more native (iOS) way to do it. If there is, say so and propose it **before** building, with the reason. My ideas are a starting point and we work them out together. **Rules I set explicitly are absolute**, and this is one of them.

## How the work is saved (read first)

One Claude Code account does this work now (owner, 13 Nov 2026), so the old two-account branch rule is gone. A session may still stop partway, and a new one picks up from Main alone. So:

1. **Work on the session's own branch** (the one Claude Code gives it). There is no `changes/<prompt-name>` branch.
2. **Open and merge a pull request after each finished item** (for the component library prompt: the standing rule, A1, A2, each A3 merge, A4), following `CLAUDE.md`: build and checks pass, nothing needs the owner's attention, then merge without asking. Stop and ask first at any design gate.
3. **Commit `docs/changes/PROGRESS.md` with each merge,** so a new session can continue from Main. It should hold:
   - the prompt being worked on;
   - the items done, with their pull requests;
   - the item in progress, and exactly what's left in it;
   - Figma changes made so far (node ids), and anything half-done in Figma;
   - questions waiting for me, and any design gate you're stopped at.
4. **When starting, read `PROGRESS.md` first** and continue from it. Don't redo finished items. If it disagrees with the code or Figma, trust the code and Figma, and update it.
5. **When the whole prompt and its Check everything list are done,** mark the prompt finished in `PROGRESS.md`.

---

## Part B — Trip pages

### B1. Itinerary: swiping between days
- **The day panel follows your finger:**
  - while you drag sideways, the next (or previous) day's event cards come in from the side, tracking the finger 1:1;
  - release past about 30% of the width, or with a quick flick, and it settles on that day with a soft spring (about 350ms, transform-only);
  - otherwise it eases back.
  - Lock the axis after the first few pixels, so vertical scrolling never turns into a swipe.
  - The first and last days rubber-band.
- **The day strip follows along:**
  - its selected card changes when the swipe settles, with a selection haptic;
  - the strip scrolls to keep it in view.
- **Remove the month markers** between day cards. The strip goes back to plain Day cards (now Number cards, from the library cleanup).
- **Reduce Motion:** a crossfade instead of the drag-follow.
- **[People prompt]** The Itinerary's opening day, the Today Chip and the person switcher come from that prompt. Swiping changes the day, never the person.

### B2. Edit event: no type chips
- **The edit sheet opens on the details, not the type and category chips.** The type and category are already decided.
- **The sheet header** shows the category's icon and name, with a **Change type** button.
- **Change type** opens the existing type → category picker. Picking a new one swaps the fields for the new behaviour, keeping every value that still applies.

### B3. Edit sheets: calmer and sectioned
1. **No automatic keyboard.** Nothing gets focus when a sheet opens; the keyboard only appears when a field is tapped. Remove every `autoFocus` on sheet fields, including "Ends (optional)" in `ActivityForm.tsx`. This replaces the older "focus the field as the sheet opens" rule.
2. **No jumping:**
   - find and fix every cause, including focus on open, fields appearing or disappearing as values change, and content height changing while the keyboard moves;
   - the sheet opens at its full height once;
   - sections that appear later expand smoothly (height and opacity, about 250ms);
   - the keyboard rule stays: `resize: "none"`, then move the sheet up by `keyboardHeight` with the keyboard's own timing.
3. **Sections with a clear title and a one-line subtitle.** Each section is a Section header plus its fields grouped together, in this order, showing only what the behaviour needs:

| Section | Subtitle | Fields |
| --- | --- | --- |
| **Where** | "Where it is" / "Where you're going" | At a place or Span: the place. Journey: From → To for the **whole** journey, plus legs and layovers (B4) |
| **When** | "Dates and times, in local time" | Date, start, end. Span: start date/time and end date/time. Journey: departs and arrives (per leg when there are layovers) |
| **Details** | "Name and anything to remember" | Title (prefilled), notes |
| **Who's in** | — | **[People prompt]** item 3 |
| **Price** | "The total. It's split between everyone who's in" | Amount, currency, Total / Each. **[People prompt]** item 8. Collapsed to an "Add a price" row when empty |
| **Your booking** | "Only you can see this" | Reference, seat, bags, files, Manage booking link. **[People prompt]** item 7: personal, not shared. Collapsed to "Add booking details" when empty |

- **Flight numbers and service numbers belong to the journey,** in Where / When, per leg. They're shared, not personal. Seats and references stay in Your booking.
- **Show this layout as a Figma draft before coding** (at least an At-a-place event, a Span stay, and a flight with one layover).

### B4. Flights and journeys with layovers ⏸ Design gate
Design this in Figma first and stop for approval. It replaces the separate "Add connection" screen.

**Editing:**
- **One form.** The Where section's From → To is the **whole** journey (e.g. Melbourne → Lisbon). For a direct journey, the When section asks for departs, arrives and the number.
- **Add a layover:**
  - a button under the journey fields splits it into legs, inside the same section: no new page and no new sheet;
  - each leg shows From → To, departs → arrives, and the number;
  - the **first leg's From and the last leg's To are locked** to the journey's From and To;
  - the layover city fills in both the previous leg's To and the next leg's From;
  - each layover sits between its legs as a compact row: city, worked-out duration, tight or overnight warning, Add a stay;
  - layover rows have a **Remove** action that joins the two legs back into one;
  - adding another layover inserts a stop.
- **Fix the existing bugs:** layovers can't be deleted when editing again, and adding a connection creates an extra component.

**The detail page** shows one **Journey card** (from the library cleanup) with every leg and stop inside it. There are no separate Layover blocks.

**On the Itinerary:** one Journey card for the whole journey, showing:
- "Melbourne → Lisbon · 1 stop";
- the layover in the meta ("2h 35m in Dubai");
- departure from the first leg and arrival from the last, with "+1" if needed;
- the arrival marker on a later day, as already built.

**Model:** keep each leg as its own event grouped by `journeyId` (live status stays per leg). The form edits them together.
- **[People prompt]** Who's in is set once for the whole journey, and applies to every leg.
- **[People prompt]** Your booking holds a seat per leg.
- **[People prompt]** Merging a second person's forwarded booking happens per journey, when every leg's number and date match. If only some legs match (someone joining at the layover), it stays as their own journey.

**Done when:** a flight with 0, 1 and 2 layovers can be created, edited and reduced back to direct in one form, and shows correctly in the Itinerary and on the detail page.

### B5. People rows
- **Each row:** avatar, name, and on the right a **dropdown** showing the person's current role (Travelling or Following), so the row clearly does something.
- **The dropdown** opens a Context menu with Travelling, Following and **Remove from trip** (Destructive). It only shows the options you're allowed to use: **[People prompt]** any traveller can change anyone's role or remove them; followers see the role as plain text with no dropdown.
- **Your own row** offers **Leave trip** instead of Remove.
- **[People prompt]** The People tab is one list with no sections (travellers first). Adding people stays as that prompt describes: Add people → Travelling or Following → share link.
- **Shared collections use the same pattern** (F9): one list of people, each with a role dropdown.

### B6. Switching trip tabs keeps your place
- **The Tab bar is sticky.** When you switch tabs:
  - if you've scrolled far enough that the Tab bar is stuck, it **stays stuck**, and the new tab's content starts at its top, directly under it;
  - if the new tab's content is too short to keep the Tab bar stuck, the page **eases** back (about 300ms, ease-out), never jumping.
  - If you haven't scrolled, nothing moves.
- **This replaces "remember each tab's scroll position".**

### B7. Everything moves gently
- **Motion tokens.** Use the Motion collection for every transition: `duration/*` (Figma Number, ms; code `--duration-*`) and `easing/*` (Figma String; code `--easing-*`), with the code-only `--motion-*` shorthands built from them (`src/design/tokens/motion.css`).
  - **Library v2 already made the Motion collection** (`duration/*`, `easing/*`; see `docs/token-migration.md`, A6), keeping every value the code used. Use those. **Consolidate the Motion durations to a tighter scale** (e.g. 200/220/250 and 400/420 are near-duplicates); show before/after (owner, 14 Nov 2026).
- **Nothing is instant.** No position or size change happens instantly, including scroll resets, sheets, cards appearing, sections expanding and toasts.
- **Reduce Motion:** crossfades instead of movement.
- **Audit every screen and list each jolt you find and fix.**

---

## Part C — Notifications

**[People prompt]** item 4 defines the in-app list as "Inbox". Its name is now **Notification centre**, and this part adds badges.

### C1. Notification centre
- **A bell Icon button** sits top right on the Home Page header, on the same line as the title. The Trip header keeps one too ([People prompt]).
- **The screen** is a time-stamped list, newest first, grouped by trip. It covers:
  - messages, with a preview;
  - new ideas;
  - events you were added to;
  - changes;
  - people joining;
  - suggestions waiting for an I'm in.
- **Tapping an entry** takes you straight to the thing: the event, scrolled to the message, or the idea.

### C2. Badges (red dots, iOS-style)
- **Add a token** `notification/badge` (red, from the existing red primitive) and a small `.Badge` dot component. Nav item, `.Tab`, Day card, Hero card and Icon button get a `Show badge` boolean.
- **Where dots show,** each cleared once you've seen the thing:
  - **Trip tabs:** Ideas (a new idea), Itinerary (a new message, an event you were added to, or a suggestion waiting), People (someone joined);
  - **Day cards** in the strip, on days with something unread, so you can find the message;
  - **Event cards** keep the existing "new message" Tag;
  - **Bottom navigation Trips** and the trip's **Hero card**, when anything in that trip is unread;
  - **the bell**, with a count.
- **"Seen" syncs across devices,** using the same read state as messages.

---

## Part D — Save a place

The Save sheet keeps its **Collections · Trip** segment, and **both tabs now share one layout**:
1. the place preview: name (editable), place, location, category chips, note;
2. a **Where** row;
3. a one-line helper;
4. one Primary button.

| | Collections tab | Trip tab |
| --- | --- | --- |
| **Where row** | "Japan · Tokyo · Change" (as today) | The trip: "Portugal & Spain · 7–17 Nov · Change". Change lists upcoming and happening trips. The default is the trip that covers the place's city, otherwise the soonest |
| **Helper** | "Saved to your collections, sorted by country and city." | "Added to this trip's ideas for everyone to see and vote on." |
| **Extra** | — | **Suggest a day** (optional date and time). **[People prompt]** item 6: a dated idea appears on that day as a suggestion |
| **Button** | "Save to Japan" | "Add to ideas" |

- **Remove from the Trip tab:** "new event" and "add to an existing event". Saving to a trip only makes an **idea**.
- **The Trip tab shows whenever there's an upcoming or happening trip**, for places, links and notes alike.
- **A Trip-tab save is also filed in Collections,** as today, so the place stays in one place.
- **The "Add to ideas" icon** (the lightbulb) is **neutral**, not brand-coloured, everywhere it appears.

---

## Part F — Collections

### F1. Count saves, group by area
- **Grouping:** places are filed country → **area** → category. An area is a city, or a state, province or region when the place has no city. The data already allows this.
- **Counting:** count only **total saves**, e.g. "24 saves". No city or area counts anywhere.
- **One count everywhere:** Home tiles, Collections tiles, the collection header and the filter chips all show the same number for the same collection. Today the Japan figures disagree: "9 places", "All 4" and "4 saves".

### F2. "Collections" everywhere
- Use **Collections** for saved places in every label, back link and line of copy.
- The Trips segment becomes **Upcoming · Collections · Past**.

### F3. Collections are the source of truth (places never move out)
- **Nothing leaves your Collections when it goes into a trip.** A place's state is **worked out**, never set:
  - **Want to go:** saved, not on any trip you're in;
  - **Planned:** on an upcoming event you're in;
  - **Been:** on an event you were in, now in the past (the existing ✓ visited rule).
- **Places come in from trips too.** Every place on an event you're in appears in your Collections automatically, under its country, area and category. It carries a small Tag naming the trip (e.g. "Portugal & Spain").
  - This includes places someone else added, once you're in that event.
  - It excludes journeys, free time and notes, which have no place to keep.
- **Removing a place from your Collections** only hides it there. Events and ideas that use it are untouched.
- **Filter chips** on a collection: **All · ★ Favourites · Want to go · Planned · Been**, plus one **Type** chip that opens a menu of event types.
- **Favourites move to Collections:**
  - the **Collections** grid gets a **★ Favourites** tile first, which opens the existing Favourites screen (by country, then area) from there;
  - on **You**, the separate Favourites page is removed;
  - the "Favourite places" section on You keeps its top 3, and its **See all** opens that tile.
- **Storage:**
  - a Place stays the single source of truth;
  - your Collections list the places you saved **plus** the places on events you're in, **by reference, never copied**;
  - propose how to store this, including the rules: places are personal today, so check who can read a place someone else saved;
  - **ask before migrating.**
- **[People prompt]** "In" means `people` on the event. Followers and guests get nothing added to their Collections.

### F4. Connect Collections to trips
- **Trip row:** when an upcoming or happening trip covers the country, the top of the collection shows a row such as "Japan · 3–17 Mar · 2 places in ideas", which opens the trip.
- **Select:** a **Select** mode on a collection lets you tick places and act on them in bulk:
  - **Add to trip ideas** (choose a trip if more than one covers it);
  - Change category;
  - Remove.

### F5. Long collections
- **Area sections:**
  - each is collapsible, with its save count;
  - a row of area Chips under the header jumps to an area (only when there are 3 or more areas).
- **Order:** Want to go first, then Planned, then Been.

### F6. Map
- **Pins are coloured by event type,** matching the category icons.
- **Tapping the map** opens a full-screen map, with the list in a Sheet you can pull up.
- **Keep the map behind an adapter** (Leaflet and OpenStreetMap today), so it can switch to **Apple MapKit JS** later without touching screens. MapKit JS needs the Apple Developer Program key, and its tokens would be signed by Rove's Worker.

### F7. Search
- A Text field (search, with a leading icon: there is no Search field component) at the top of the Trips tab's **Collections** segment searches every collection: place names, areas, notes and types.
- Results show the country and area in the meta.

### F8. Open the source
- On a place, the source ("from TikTok", "from Google Maps") is tappable. It reopens the original link outside Rove.

### F9. Replace Edit with Select and a menu
- **The header's Edit (pencil) is replaced by:**
  - **Select** (F4);
  - an Icon button **"…"** opening a Context menu with two options:
    - **Share**;
    - **Delete collection** (Destructive). This goes to Recently deleted, and places used by trips stay referenced.
  - There's no "fix areas" option.
- **Share works like Add people on a trip:**
  - a Sheet with two Option cards, **Editor** ("Adds, recategorises, stars and removes places") and **Viewer** ("Sees the places, stars them and opens them in Maps");
  - then the link and the share sheet.
  - Rename the existing collection role **Member** to **Editor** everywhere, in the UI, types, rules and migration. **Viewer** stays.
- **Who it's shared with:**
  - the collection header shows "Shared with Sam and Priya";
  - tapping it opens a list of people, each with a role **dropdown** (Editor, Viewer, Remove), the same pattern as the trip's People tab;
  - only the owner and Editors can share, change roles or remove people.

---

## Part G — Feel, surfaces and feedback

### G1. One toast, bigger and clearer
- **The large toast** (today's `size: 'large'`, used for chat messages) **becomes the only toast.** Remove the small one.
- **Surface:** the **inverse** surface (dark neutral, `feature/*` text and icons, white icon). Errors keep the Danger tone.
  - It's not deep green: deep green already means "Next" and feature surfaces, and a green toast would read as "success" even for neutral messages.
- **Timing:** 4 seconds, or 6 seconds when it has an action (Undo, Open) or carries a message.
- **Everything else stays:** position clear of the Dynamic Island, aria-live, haptics.
- Update the Toast component in Figma (`Size` goes away) and in code.

### G2. Saving feels instant
- **The cause:** today every save waits for the server to confirm (`await store.updateSub(…)` in `ActivityForm.tsx`, and the same pattern elsewhere) before the sheet closes and the toast shows.
- **The fix:** Firestore's offline cache applies the write locally and instantly. So, after validating:
  - **close the sheet and show the toast straight away**;
  - let the write finish in the background;
  - if it fails, show an error toast with **Retry**, keeping the edits so nothing is lost;
  - offline, the toast reads "Saved. It'll sync when you're back online".
- **Apply this to every save in the app:** events, ideas, votes, trip edits, comments, places, roles, budgets.

### G3. Travel time between events
- **What happens today** (`travelEstimate` in `src/lib/trips.ts`):
  - a straight-line distance × 1.3, at a fixed 5 km/h walking (under 2 km) or 25 km/h "by car";
  - nothing at all when either event has no coordinates, is a note or free time, is under 50 m away or over 300 km away.
  - So it's often wrong, and connectors go missing when a place was typed but never matched to coordinates.
- **Use a real routing service behind an adapter,** called from Rove's Worker and cached per pair of places:
  - **Now:** a free routing service for walking and driving (for example OpenRouteService). Show the provider's required credit.
  - **Later, with the Apple Developer Program:** the **Apple Maps Server API ETA**. It covers walking, driving and public transport, uses the same token as MapKit JS, and fits the planned move to Apple Maps.
  - **Not Google:** its routes may not be shown with a non-Google map, and Rove's maps are OpenStreetMap now and Apple later.
- **Pick the mode sensibly:**
  - walking when it's under about 20 minutes on foot;
  - otherwise public transport when the provider has it, or driving;
  - a new Settings row **"Getting around: Walk and public transport / Drive"** sets the preference;
  - the connector's icon and words match the mode ("12 min walk", "25 min by public transport", "40 min drive").
- **Long gaps:**
  - when two events are in different cities or countries **and a journey event sits between them**, show no connector: the journey is the connection;
  - when there's **no** journey between them, show a quiet connector: "No travel planned to Madrid · Add a journey". It opens the add-event picker on Flights or Getting around.
- **Missing places:** every event with a place must have coordinates. Match typed places when saving, and list any existing events that still have none.
- **Cost control:** work out each pair once when either event changes, never on every render.

### G4. Fewer grey boxes
- **The new rule:**
  - a grey container (`surface/secondary`) means **one object**: an event, a trip (Hero card), a place, a map, a journey, a budget, a stat strip, a tile;
  - **lists of rows that lead somewhere sit open on the page**, with no container: icon, title, meta, chevron, and no dividers (Wise style);
  - a grey fill doesn't mean "tappable". The chevron and the row's pressed state show that.
- **Open up these lists:**
  - Overview: **Bookings**, **Recently viewed** and **Good to know**;
  - Home: **Recently saved**;
  - Collections: the place lists in each area;
  - the trip's **People** list, and **Who's in** on event detail;
  - the **Notification centre**;
  - **Files & links** on event detail.
- **Keep in containers:**
  - Event cards, Hero cards, Tiles, the Map card, the Journey card, the Budget card, the Number card strip, the comment thread, Idea rows (they carry a vote button);
  - **Settings and Support on You**: iOS users expect grouped settings.
- **Icon holders in open rows** become `surface/secondary` circles, because a white circle disappears on a white page. Inside containers they stay white.
- **Show before and after screenshots** of every changed screen in Figma, and stop for approval before coding.

### G5. Pressed states fill their container
- **The bug:** in a List group, a pressed row shows a rounded highlight inset from the group's edges, with a sliver of the group visible around it.
- **The fix** (the iOS inset-grouped pattern):
  - the List group has no inner padding;
  - each row owns its padding;
  - the pressed fill covers the row's full area edge to edge;
  - the first row's top corners and the last row's bottom corners take the group's radius, so the highlight follows the container's shape;
  - a single-row group takes the radius on all four corners.
  - Do it with per-row radius, not clipping.
- **Open rows** (G4) get the same full-width pressed fill with a small radius.
- **No sticky hover on iPhone.** Several components' `:hover` rules (tabs, chips, rows, tiles, day cards) sit outside `@media (hover: hover)`, so on iPhone the hover look sticks after a tap. Move every `:hover` rule inside `@media (hover: hover)`. Touch feedback comes only from the pressed state (`:active`).

### G6. Files & links show what they are
- **Links show the site's favicon,** in the icon holder:
  - fetched through Rove's Worker and cached, so people's links aren't sent to a third-party favicon service;
  - when there's no favicon, the Link icon.
- **Files show their type:**
  - PDF: Document icon;
  - image: Image icon;
  - email or confirmation link: Mail icon;
  - calendar file: Calendar icon;
  - wallet pass: Ticket icon;
  - maps link: Map icon;
  - anything else: the generic File icon.
- Add any missing icons to the Icons grid.

### G7. Time zones: check today's behaviour
This is built ("Layovers & time zones"); confirm it:
- **Trip days are local calendar dates.** A flight leaving Melbourne on Day 1 sits on Day 1. If it lands on a later local date, the arrival marker shows at the top of that day.
- **"Today" and the Itinerary's opening day** use the local date **where you are** (that night's stay, or your last arrival), not the phone's time zone.
- **Countdowns and the now-line** compare real moments in UTC.
- **Report any case that breaks, and fix it.**

### G8. Two components that don't match Figma (found 14 Nov 2026)
Library v2 left two places where the code and Figma disagree. Figma first, then code, as always.
- **Dropdown's smaller size.** The code has `Dropdown compact` (44px, used beside a small button), but Figma's Dropdown has no such size. Add **Size: Small / Large** to Figma's Dropdown, like Button: Large is today's default height, Small is the compact one, both from the `size/*` variables. In code, replace `compact` with `size="small" | "large"` (default Large) and update every caller. Show both sizes on `/#/design`.
- **Text area's height.** Figma draws Text area at the same height as a one-line Text field; in the app it's taller and grows with its text. Redraw Figma's Text area at the app's real minimum height, with its sizes from variables, so the two match. No code change unless the comparison finds one.
- Compare each side by side (Figma screenshot vs `/#/design`) before the pull request.

### G9. Your travels counts every city (found 14 Nov 2026)
**Today:** You → Your travels counts countries from every past trip's events (New trip stops, 14 Nov 2026), but **cities only from each trip's first stop**. A trip Tokyo → Kyoto → Seoul shows 2 countries but 1 city.

**The change:** count cities the same way as countries.
- **A past trip's cities** are its first stop's city plus the city of every place its events were in, start and end of journeys included. Stops never visited don't count, just like countries.
- **A city is a city and its country together,** so two cities with the same name in different countries both count.
- **Events don't always store a city.** Work it out from the event's map position, the same way `useFixPostcodeCities` (`src/features/saves/fixCities.ts`) fixes saved places: once, in the background, saved on the event so it's never looked up twice. New events save their city when their place is saved. Never a postcode.
- **Put it in one helper beside `tripCountries`** (for example `tripCities`) and use it in `ProfilePage.tsx`.
- Check the Stat strip with a demo past trip that crosses several cities and countries.

### G10. Control heights: bigger Small buttons, every minimum height a token (owner, 14 Nov 2026)
Buttons are built with a **minimum height plus padding**: the text sits in the middle, removing an icon never changes the shape, and the control grows when someone uses larger text. Keep that, make Small buttons a little bigger, and give Chip and Tag the same treatment.

- **Small buttons become 36px** (were 32). `size/control-small` → 36 (`base/size/36`), with padding **8 top and bottom** (`space/200`) and **16 at the sides** (`space/400`); gap and 16px icons stay. Icon button Small shares the token, so it becomes 36 too (16px icon), and still keeps its 44px tap area. Large stays 48.
- **Chip and Tag get a minimum height:** a new role token **`size/pill`** = 28 (`base/size/28`), shared by Chip and Tag. In code, Chip's `min-height: var(--size-650)` becomes `var(--size-pill)`; Tag gets the same `min-height`. In Figma, both get the minimum height linked to `size/pill`, so every state and every version with or without an icon is the same height. **Found:** Figma's Chip is 30px unselected and 28px selected today; this fixes it.
- **Every minimum height is linked to its variable in Figma.** Button's 32 and 48 are typed-in numbers today (missed by library v2); link them to `size/control-small` and `size/control-large`. Check every component with a minimum height by script.
- **Figma first** (Foundations: the tokens, Button, Icon button, Chip, Tag; then the Screens frames that use them), then code. Update `/#/design`, `docs/DESIGN-SYSTEM.md` (Button sizes, Icon button Small, Chip, Tag) and the 44px tap-area maths that uses `size/control-small`.
- **Check** every screen at 320 and 390px, text 17 and 33, light and dark: nothing clipped, section headers and rows still line up, and a button and an Icon button side by side are level. Show the owner a before and after of Home and a section header before merging.

### G11. Page header: meta closer to its title (owner, 14 Nov 2026)
The line under a page title (a trip's dates, "Show meta", and the subtitle under the title) sits **12px** below it (`space/400`), the same gap as between separate things. It belongs to the title, so it should sit closer.

- **The gap becomes 8px** (`space/300`), for both the meta line and the subtitle, in Size Large and Small.
- **Only that gap changes.** In code, `.header`'s gap also sets the space between the back button and the title row: keep that at 12 and give the meta its own spacing, so nothing else moves. (The CSS comments in `Bars.module.css` say "12" for gaps that are now 12px; check each one is still right afterwards.)
- **Figma first:** Page header on Foundations (`160:1684`), both sizes, linked to `space/300`; then code.
- **Check** that descenders (g, p, y) on a wrapped or shrunk title never touch the meta, at text 17, 23 and 33, at 320 and 390px. Show the owner the trip header and the event page before and after; if 8 still looks loose, try 4 (`space/200`) and show both.

## Part H — Trip edit

**[People prompt]** Any traveller can edit the trip. The location is read-only after creation. Budget and currency are removed from Edit trip.

### H1. Cover photo editing
- **The photo can't be dragged by default,** so swiping the sheet never moves it by accident.
- **Buttons under the photo:**
  - left-aligned: **Change photo** and **Edit photo** (both Neutral);
  - right-aligned: **Remove**, as a Ghost button.
  - **Edit photo** replaces "Re-centre".
- **Edit photo mode:**
  1. **Edit photo** unlocks the photo and becomes **Save**.
  2. An overlay sits on the photo: a 4-way move icon and "Drag to move".
  3. Touching the photo hides the overlay and lets you drag. Letting go brings the overlay back.
  4. **Save** keeps the new position. The button goes back to **Edit photo** and the photo locks again.
  5. Closing the sheet without saving keeps the old position.
- **Behaviour:**
  - while editing, the sheet doesn't respond to swipe-to-close;
  - the overlay fades in and out gently (motion tokens).
- **Works the same for Unsplash covers and your own photos.**

---

## Part E — Firebase security rules

1. **Install and use Firebase's agent skills:**
   - install the Firebase plugin for Claude Code;
   - if that isn't available, run `npx skills add firebase/agent-skills`;
   - use these skills for every Firebase task.
2. **Write and validate the rules** against the model after the people-and-sharing prompt (**[People prompt]**, Rules section):
   - every rule has a test in `tests/rules`, run with the Firestore emulator;
   - include the open security items in `docs/SECURITY.md` and `docs/ROADMAP.md`: author-only comments, size limits on events, ideas and comments, and handing a trip over.
3. **Deploy:**
   - with `firebase deploy --only firestore:rules`, only after every rules test passes;
   - show me the rules diff first, and wait for my go-ahead;
   - if the Firebase CLI isn't signed in, stop and tell me exactly what to run (e.g. `firebase login`) or what to click in the Firebase console;
   - deploy once now with today's tested rules, then again after the people-and-sharing changes.
4. **Update `docs/SECURITY.md`** and `docs/ROADMAP.md` (then redraw the Figma Planning board from it).

---

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line. Compare changed screens with Figma at 393 × 852.

**Trip pages**
- [ ] Day swipe tracks the finger and shows the next day's cards mid-swipe; settles or snaps back gently; no month markers
- [ ] The edit sheet opens without type chips; Change type works and keeps the values that still apply
- [ ] No keyboard until a field is tapped; the sheet never jumps; edit sheets are sectioned as in B3
- [ ] Layovers (after design approval): one form; locked ends; add and remove stops; one Journey card in the Itinerary and on the detail page; old layover bugs gone
- [ ] People rows have the role dropdown with only the allowed options
- [ ] Switching tabs keeps the stuck Tab bar in place, or eases back; never jumps
- [ ] Motion tokens in use; jolt audit list attached

**Notifications**
- [ ] Bell on Home (and in the trip header); the Notification centre lists everything with times and opens the exact item
- [ ] Red dots on trip tabs, day cards, the Trips nav item and Hero cards; they clear once seen and sync across devices

**Save**
- [ ] Both tabs share one layout; the Trip tab picks the trip, saves only to ideas, offers Suggest a day, and also files the place in Collections
- [ ] The lightbulb is neutral

**Collections**
- [ ] Area grouping (city or region); one total save count, identical everywhere
- [ ] "Collections" in every label; Trips segment reads Upcoming · Collections · Past
- [ ] Places never leave Collections; Want to go / Planned / Been are worked out; places on events you're in appear with a trip Tag; removing only hides
- [ ] Filters: All · ★ · Want to go · Planned · Been · Type; Favourites tile in Collections; You's separate Favourites page removed
- [ ] Storage proposal approved before any migration
- [ ] Trip row; Select with Add to trip ideas, Change category, Remove
- [ ] Collapsible areas; area Chips at 3+ areas
- [ ] Map pins by type; full-screen map with a list Sheet; map behind an adapter
- [ ] Search across all Collections; tappable source; "…" menu with Share and Delete only
- [ ] Share asks Editor or Viewer first; Member renamed to Editor; the people list has role dropdowns

**Feel, surfaces and feedback**
- [ ] One toast size; inverse surface; Danger for errors; 4s, or 6s with an action
- [ ] Every save closes the sheet and shows its toast immediately; failures show Retry and keep the edits; offline wording
- [ ] Travel times come from a routing service via the Worker, cached per pair; mode chosen sensibly and set in Settings; no connector across a journey; "No travel planned" when a long gap has no journey; every event with a place has coordinates
- [ ] Grey containers only for objects; listed rows open on the page; open-row icon holders are grey; before/after approved
- [ ] Pressed rows fill their container edge to edge, with matching corners and no sliver
- [ ] Links show favicons (via the Worker); files show their type icon
- [ ] Time zone checks reported, and any failures fixed
- [ ] Dropdown has Size Small / Large in Figma and code (no `compact`); Text area drawn at its real height in Figma; both compared side by side
- [ ] Your travels counts cities from every past trip's events (city + country, never a postcode); older events get their city once, in the background
- [ ] Small buttons and Icon button Small are 36px (8 / 16 padding); Chip and Tag use `size/pill` (28) as a minimum height; every minimum height in Figma is linked to a variable; before and after shown
- [ ] Page header: meta and subtitle 8px under the title (Figma and code); back button spacing unchanged; before and after shown

**Trip edit**
- [ ] The cover only moves in Edit photo mode, with the overlay; Save locks it again; Change and Edit on the left, Remove as a Ghost button on the right; no swipe-to-close while editing

**Firebase**
- [ ] Skills installed; every rule tested in the emulator; diff shown; deployed

**Report:** what changed per item, anything not done and why, and every conflict found between the code, Figma, this file and the people-and-sharing prompt.

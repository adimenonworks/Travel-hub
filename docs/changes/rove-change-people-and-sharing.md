# Rove — change prompt: people, sharing and money

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` (components on **Foundations**, core screens on **Screens** `500:508`, decisions on **Planning** `466:553`) and the code on Main. Older handover docs don't apply wherever they disagree.

**What this changes:** how people share a trip. That covers roles, who's in each event, personal booking details, prices and budgets, undo and history, an in-app inbox, and guests on a single event.

**This reverses three earlier decisions.** They're already recorded in `docs/DECISIONS.md` (13 Nov) and `docs/ROADMAP.md` (Now). When each is built, move it to *Built* in `ROADMAP.md` and redraw the Figma Planning board from it:
- per-event "who's going" moves from *Decided not to build* to *Built*;
- "activity history" moves from *Others / not to build* into this work, as per-event change history;
- "Notifications" moves from *Needs a design first* into this work, as an **in-app** inbox only. Lock-screen push stays in *Later*.

## How to work

1. **Read before changing anything:**
   - `src/data/types.ts` (Role, Trip, Activity, Price, Invite);
   - `useRole` in `src/data/hooks.tsx`;
   - `src/features/trip/People.tsx`, `ActivityPage.tsx`, Itinerary, Ideas, Overview and its Budget card;
   - `firestore.rules` and `tests/rules`;
   - the matching Figma frames.
2. **Figma first, then code.** For each item:
   - change or add the components on Foundations;
   - update the affected screens on Screens;
   - put any new screens on a new section **"People & sharing — draft"**.
   Build them only from existing components and tokens, and keep them plain: the designer will polish them. Then build the code to match.
3. **Make one commit per numbered item.** Rules and rule tests change in the same commit as the model they protect.
4. **The existing build rules still apply:** components and tokens only, 44 × 44 touch targets, no clipping, the nested radius rule, no flash on tab or day changes, and the haptics map.
5. **If something is unclear, or the code conflicts with this file in a way it doesn't cover, stop and ask.** Don't guess.

## The model in short

- A trip is **one shared trip**, the same for everyone on it, and everyone on it is equal.
- People are either **Travelling** or **Following**.
- Every event has a list of **who's in**.
- An event can carry **bookings**, which hold each person's own details: reference, seat, bags and files.
- An event's **price is a total, split among who's in**. Each person's share counts against **their own private budget**.
- A **guest** can be added to a single event without joining the trip.


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

## 1. One trip, everyone equal

- **No owner, anywhere.** Remove the hidden creator rank (`isOwner`, `role === 'owner'`) from permissions and the UI. Keep `createdBy` as a record only.
- **Any traveller can:**
  - edit the trip's name, dates and cover (Following can't);
  - add people and change roles;
  - remove someone;
  - delete the trip.
- **The trip's places can't be edited after creation** (built in `rove-change-new-trip-stops.md`, which runs first):
  - Edit trip has no place picker and no list of stops (owner, 14 Nov 2026).
  - The countries a trip "covers" (used for Good to know, Bring your saves, Add from saved, the Save sheet's trip default, and Collections' trip row) are its **stops** from New trip **plus** every place on its events (`tripStops`, `tripCountries`). Keep using those helpers.
  - The cover photo is still changed with Change photo.
- **Edit trip loses two fields:** **Budget per person** (now personal, on the Budget card, item 8) and **Local currency** (each price has its own currency, item 8). Remove both from Edit trip and from the New trip flow, and delete `trip.currency` and `trip.budget` after migrating them.
- **Deleting a trip:**
  - it goes to Recently deleted for 30 days, for everyone on it;
  - any traveller who was on it can restore it;
  - the confirm sheet names who else is on the trip.
- **Leaving:** any traveller can leave. If the last traveller leaves, the trip is deleted, into Recently deleted as usual.
- **Copy is about joining, never being invited into someone's trip:**
  - share text: "Join us on <trip> in Rove";
  - the join screen reads "<Name> wants you to join <trip>", with the button **Join trip**;
  - after joining, the trip sits on everyone's Home and Trips exactly the same way.
- **Migration:** `owner`, `editor` and `member` become `traveller`; `viewer` becomes `follower`.

**Done when:** no screen, rule or line of copy treats one person as the trip's owner.

## 2. Travelling and Following

| Role | Who | Can |
| --- | --- | --- |
| **Travelling** | Anyone on the trip, even for part of it | Plans everything, joins events, has their own bookings and budget |
| **Following** | Family at home, or a friend who isn't on the trip | Sees the plan (each event's title, date and time, place and who's in) and chats. Never sees notes, links, files, event comments, prices, booking details or budgets. Can't add, change, vote or delete |

- **Add people:**
  - opens a Sheet with two Option cards, **Travelling** and **Following**, each with one line:
    - Travelling: "On the trip. Plans with everyone and has their own bookings and budget."
    - Following: "Not on the trip, like family at home. Sees the plan and chats, but never prices or bookings, and can't change anything."
  - then makes the link and opens the share sheet;
  - the link carries the role.
- **The People tab is one list,** with no sections: travellers first, then followers.
  - Each row: avatar, name, and a role **dropdown** on the right (Travelling or Following).
  - The dropdown opens a Context menu with Travelling, Following and **Remove from trip**; your own row offers **Leave trip** instead.
  - Followers see roles as plain text, with no dropdown.

### Who can edit and delete events

| What | Who can change it |
| --- | --- |
| Trip details, photo albums | Any traveller |
| An idea | Only the traveller who suggested it edits or deletes it (owner, 15 Nov 2026). Every traveller votes |
| An event's shared details (title, date, time, place, notes, total price, who's in) | Any traveller **who is in that event**. Travellers who aren't in it see it read-only, with **I'm in** |
| Your booking details and your own seat or bags | Only you, plus the person who made the booking if it covers you |
| Anything | Followers and guests can't change anything |

**Deleting an event:**
- If you're the only one in it, it's deleted and goes to Recently deleted, which already exists. Show who deleted it there.
- If others are in it, a confirm sheet offers **Just me (I'm out)**, the default, or **Remove for everyone**.

### Undo and history

- **Every edit, delete, I'm in and I'm out** shows a Toast with **Undo** for about 6 seconds.
- **Each event keeps a change history:**
  - who changed what and when, with the before and after values;
  - covers title, date, time, place, total price and who's in;
  - shown at the bottom of event detail as **Changes**, collapsed, with the last 20 entries.
- **Each change has a Restore action.** It puts that field back, and the restore is recorded as a change too.
- **Storage:** history lives in an append-only subcollection, `…/events/{id}/history`, written in the same batch as the change. Rules: only travellers in the event can append it, and nobody can edit or delete it.

**Done when:** an accidental edit or delete by anyone can be undone straight away, or restored later from Changes or Recently deleted.

## 3. Who's in, per event

- **Every event stores `people`,** the travellers who are in, and `guests` (item 9). The existing per-event field is `attendeeIds` (set in `ActivityForm.tsx`): migrate it to `people`, and remove the old field.
- **Adding or editing an event shows a "Who's in" row:**
  - an avatar Chip for each traveller, which toggles them in or out;
  - you are always ticked when you add it.
- **Defaults** (these are what stop this becoming admin):
  - **Plans added by hand:** every traveller ticked.
  - **Bookings** (forwarded, imported, or a flight or stay added by hand): only you, or the people the booking names.
  - **An undated idea added to a day:** the people who voted for it, plus you.
  - **A suggested (dated) idea:** the suggester plus whoever says I'm in (item 6).
- **Being added means you're in. Silence means yes**, so a couple never has to respond to anything.
  - The event appears on your itinerary straight away, at its day and time.
  - Until you open it, the card carries a Tag **"New · added by Sam"**.
  - The card offers **I'm out**, as an action and as a swipe.
  - The addition also lands in your Notification centre (item 4).
- **I'm out:**
  - removes the event from your itinerary only;
  - the event stays for everyone else;
  - you can find it in that person's itinerary (item 5) and tap **I'm in** to rejoin.
- **I'm in** appears on any event you're not in, on its card in someone else's itinerary and on its detail page.
- **Cards show who's in** with an Avatar Stack. "2 of 4 going" counts travellers in `people`.

## 4. Notification centre (in-app notifications)

- **Where:**
  - a Bell Icon button in the Home Page Header and in the Trip header;
  - it shows a dot with a count when something is unread;
  - it opens a **Notification centre** screen, newest first, grouped by trip.
- **Entries:**
  - "Sam added you to Dinner at Ramiro · Thu 12 Dec" (tapping it opens the event, where I'm in / I'm out is; see R2);
  - "Priya moved Tram 28 to 14:00";
  - "Jo is out of Fado night";
  - "Sam joined Portugal & Spain";
  - "Priya added a guest to Fado night".
  - Fold the existing new-chat-message alerts into the Notification centre.
- **Scope:** only events you're in, plus trip-wide changes such as joins, role changes and date changes.
- **Read state** syncs across devices, the same way `ChatReads` does.
- **Push later:** shape each entry so the same entry can be sent as a lock-screen push later (Later: Apple Developer Program).

## 5. Itinerary: yours, or one person's

- **By default** the Itinerary shows **only your events**, each with who's in.
- **Person switcher** at the top of the Itinerary:
  - a Chip row with **Me**, then each traveller (avatar and first name);
  - choosing someone shows **their itinerary only**;
  - **on their events you're not in, you see only the title, date and time, place and who's in** (owner's rule, 14 Nov 2026). No notes, links, files, comments, prices or bookings. The same holds wherever you meet an event you're not in, including its event page: the event's details stay with the people going. Tapping **I'm in** shows the rest;
  - on their events you're also in, a Tag **"You're in"**;
  - on their events you're not in, an **I'm in** button.
- **There is no combined "everyone" view.**
- **Followers** have no "Me". They default to the traveller who added them, and their choice is remembered.
- **Behaviour:**
  - the choice is remembered per trip;
  - switching person uses the same no-flash panel slide as days and tabs, with a selection haptic;
  - the day strip follows the chosen person.
- **Overview's Next stop and Home's Next up** are always yours.

## 6. Ideas and the Itinerary

**Ideas have two segments: To decide · Passed.**
- **Remove the Planned segment.** Once an idea is on a day, it's an event and lives in the Itinerary, not in Ideas.
- **Migration:** ideas currently marked Planned leave the Ideas list; their events stay as they are.
- **Voting is thumbs up and thumbs down** on To decide ideas (owner, 15 Nov 2026): **thumbs down is Pass**, with the same rules as Pass below. There's no separate downvote. Both show their counts, on the idea card and in its sheet (R7).

**An idea can be suggested with or without a day.** When adding an idea, the date and time are optional fields.

**An idea with no day:**
- The row's trailing action is **Add to a day**: the existing flow to choose a date and time.
- It becomes an event straight away and leaves Ideas.
- Who's in: the people who voted for it, plus you (item 3).

**An idea with a suggested day and time:**
- **In Ideas:** the row's meta starts with the day, e.g. "Thu 12 Dec, 20:00 · Activity · Sam", and its trailing action is **Go to day**.
- **In the Itinerary:** it shows on that day, in time order, as a **suggested** Event card:
  - the Note-style white card with a dashed border;
  - an "Idea · from Sam" Tag;
  - two actions, **I'm in** and **Pass**.
- **Go to day** opens the Itinerary on that day, scrolls to the suggestion and briefly highlights it (a short tint fade, or a plain fade with Reduce Motion). You answer right there, with no going back to Ideas.
- **I'm in:**
  - the first I'm in turns it into a real event, with the suggester and you in it;
  - it **leaves Ideas for everyone**, so there's one place to answer: the day;
  - every traveller who hasn't answered still sees it on that day as a Suggested card, with **I'm in** and **Pass**, and gets a Notification centre entry ("Sam and Priya are going to Fado night · Thu 12 Dec") that opens that day with the card highlighted.
  - **It stays opt-in.** Unlike an event someone adds you to directly (item 3, where silence means yes), people who haven't answered are **not** counted as in until they tap I'm in.
  - The suggested card shows who's in so far ("2 going").
- **Pass:**
  - hides it from your itinerary only, whether it's still an idea or already an event others are in;
  - while it's still an idea, it moves to **Passed** for everyone once every other traveller has passed, or straight away if the suggester passes it;
  - a passed idea can be moved back to To decide.
- **A suggested idea isn't an event.** It doesn't count towards "2 of 4 going", budgets or Next up.

**Itinerary opening day**
- **The Itinerary always opens on today** during the trip. Before or after the trip, it opens on the first day.
  - Don't restore a previously selected day when the tab is opened again.
  - Go to day and links from Home and the Notification centre open on their own day.
- **Back to today:**
  - while the trip is on, a small **Today** Chip appears at the end of the day strip whenever today isn't the selected day or has scrolled out of view;
  - tapping it scrolls the strip back and selects today, with a selection haptic;
  - it's hidden when today is selected and visible.
  - There's no jump-to-date calendar.

## 7. Bookings: one event, everyone's own details

- **One event per real thing.** Everyone on the same flight shares one event, so time changes and live status reach everyone. People on different flights have different events.
- **What differs per person is a booking,** shown inside the event:

  ```
  Booking = { id, eventId, holderId, covers: uid[], ref, perPerson: { [uid]: { seat?, bags? } }, files, manageUrl?, price? }
  ```

- **Event detail gets a "Your booking" section**, showing the booking that covers you:
  - reference (tap to copy), your seat, your bags, files and **Manage booking**;
  - "Booked by Sam" when someone else holds it;
  - with no booking: **Add your booking details** (reference, seat, file), which creates a booking covering you.
- **One booking, a seat for each person on it** (owner, 15 Nov 2026):
  - adding or editing a booking on a travel event (flight, train, ferry, coach and so on) asks **Who's on this booking?**: avatar toggle Chips, everyone in the event ticked by default;
  - then one **Seat** field (and Bags) **per person on it**, all under the one reference;
  - people in the event who aren't on it booked separately, and add their own booking the same way;
  - everyone on a booking sees its reference and every seat on it; nobody else does.
- **Privacy:** a booking is visible only to the people it covers and its holder. Other people's bookings are never shown.
- **The Journey details card shows only shared information:** times, terminals, gate, status and duration. Seats move into Your booking.
- **Merging:** when a second person forwards or adds the same flight (same number and date), add them to the existing event with their own booking, rather than creating a new event. Do the same for trains and ferries that have a service number.

## 8. Prices and personal budgets

- **An event's price is a total**, stored in the currency it was entered in. It's entered once, on the event or on a booking.
- **Every price has its own currency.** There's no trip currency any more.
  - The price field always shows a currency picker beside the amount.
  - It's pre-filled with the **local currency of the event's place** (a café in Riyadh starts in SAR), otherwise your own currency from Settings. It can always be changed.
  - Ideas work the same way.
- **Everything converts to your own currency.** Shares and budgets are shown in **your Settings currency**, converted at today's rate (ExchangeRate-API, cached 24 hours, as now). Example: a 300 SAR event, split two ways, adds 150 SAR to each person's budget, shown as its AUD equivalent to someone whose Settings currency is AUD. A traveller whose currency is EUR sees the same share in EUR.
  - Event detail shows the original price and the conversion: "300 SAR · about A$120 · your share A$60".
- **Split:** your share is the total ÷ the number of people in (travellers plus guests). It's worked out again whenever someone is in or out. A €200 booking costs its booker €200 alone, and €100 each once a second person is in.
- **Price field toggle, Total / Each:**
  - **Total** is the default;
  - **Each** is for per-person tickets: everyone in pays that amount, with no split.
- **Who sees prices:**
  - **people in the event:** the total, the split and their own share ("€200 · €100 each");
  - the Event card shows **your share** only;
  - **nobody else**: not travellers who aren't in it, and never followers.
- **Ideas:** keep their price with the same Total / Each toggle, visible to travellers only. When the idea is added to a day, its price becomes the event's price.
- **Budgets are personal:**
  - each traveller sets their own amount, **in their Settings currency**, with an **Edit** action on the Budget card, which opens a Sheet;
  - with no budget set, the Budget card shows **Set your budget**. The New trip flow no longer asks for one;
  - nobody else can see it;
  - the Budget card shows your budget, the total of your shares so far, what's left, and the split by category.
  - Remove `trip.budget`. Migration: copy an existing trip budget into each traveller's personal budget.
- **Still not built:** settling up, or tracking who owes whom. A share is what something costs *you*.
- **Privacy has to be real, not just hidden in the interface.** Firestore sends whole documents, so a price inside the event document can be read by anyone who can read the event.
  - Store prices in documents the rules only let people in the event read.
  - **The same goes for an event's notes, links, files and comments** (owner's rule, 14 Nov 2026, item 5): keep only the title, date and time, place and who's in in the event document every trip member reads, and move the rest into documents only the people in the event can read. Add it to the migration and the rules tests.
  - Store budgets where only their owner can read them, e.g. `trips/{id}/budgets/{uid}`.

## 9. Guests on a single event

- **Adding a guest:** event detail → Who's in → **Add a guest** makes a link to this event only. It's valid for 14 days and requires sign-in.
- **What a guest sees** (owner, 14 Nov 2026): that event **in full, like anyone in it**: title, date and time, place, who's in, notes, links, files, comments, the price with **their own share**, and **their own booking** if one covers them (other people's bookings stay private, as for everyone). They see nothing else on the trip. The rules let a guest read the event's private documents (item 8) for that event only.
- **What a guest counts as:**
  - listed in Who's in with a **Guest** Tag;
  - counted in the price split;
  - can tap **I'm out**;
  - can't edit;
  - not listed on the People tab.
- **On the guest's own Home**, the event shows in an **"Invited to"** section until it has passed.
- **Making a guest a full member:** any traveller can choose **Add to trip** from Who's in, which offers Travelling or Following.

## Owner's review (15 Nov 2026): do these next

Items 1–5 are built. The owner reviewed them on the phone. Do **R1–R6 next, as one pull request each**, then item 6 together with R7. Figma first wherever a component or core screen changes. Add a dated `DECISIONS.md` entry for R2, R3, R5 and R7 (each changes an earlier decision).

### R1. A press never sticks when you scroll (everywhere)
- Starting a scroll on something tappable (an event card, a list row, a button) leaves it looking pressed. Fix it once, in the shared press handling, so every component gets it.
- **Like iOS:**
  - the pressed look appears only after a short delay (about 80–100 ms), or straight away on a quick tap;
  - it's cancelled as soon as the finger moves more than about 10px, or the page scrolls, or on `pointercancel` / `touchcancel`;
  - a cancelled press never fires the tap.
- Holding for the Edit / Delete menu cancels the same way when the finger moves.
- Test with Playwright touch drags on the Itinerary, Ideas, Trips, People and Collections, at 320 and 430px. After a drag, nothing should look pressed and nothing should open.

### R2. Notifications have no buttons (owner's rule, 15 Nov 2026)
- **No entry in the Notification centre carries an action** (no I'm out, I'm in, Pass, View, Approve or Decline). Tapping an entry opens exactly what it's about:
  - an event, on its event page;
  - a suggested idea, on its day with the card highlighted;
  - a join, on the People tab.
- **Read and unread:**
  - an unread entry has a small dot (`status`-style, with an accessible label "Unread") and a bold title;
  - a read entry has no dot, a regular-weight title and secondary text colour, still at least 4.5:1 contrast;
  - never colour alone.
- **Entries are kept for 30 days,** then deleted (the rules let the person they're addressed to delete their own).
- Figma: the Notification centre's List item variants lose their buttons and gain the unread dot.

### R3. I'm in / I'm out on the event page
- The event page has a **Segment control: I'm in | I'm out**, with your current answer selected. One tap switches, with a selection haptic and the Undo toast. It's the place to change your mind.
- Travellers who aren't in see it with **I'm out** selected. Followers and guests don't get it, except that a guest can choose I'm out on their own event.
- It replaces the I'm out Button in the Who's in row, and the separate I'm in button on the event page. Cards keep their own I'm in / I'm out actions.

### R4. Event page order
From the top:
1. title, date and time;
2. **Who's in** (Avatar stack and names) and the **price** (total, and your share);
3. the I'm in | I'm out Segment control (R3);
4. then the place, the map and everything else as now.

Update the Event core screen in Figma (`506:1221`).

### R5. Changes: subtle, at the very bottom
- Changes moves to the **end of the event page, below Comments**.
- Make a new **Accordion** variant, `Tone = Subtle`, in Figma then code:
  - no container, fill or border;
  - the header in Body small, secondary text, with a small chevron;
  - rows in secondary text, smaller and lighter than the rest of the page.
- It's there when needed, not a focus. Keep Restore as a Ghost Small button.

### R6. Person picker: a subtle dropdown, not a Chip row
- Remove the Chip row of people above the day strip.
- Put a **subtle dropdown** next to the Add event button:
  - Ghost Small Button: your Avatar (small) plus **Me**, with a Chevron down;
  - it opens a Context menu listing Me, then each traveller (avatar and first name), with the current one ticked;
  - when viewing someone else, the button shows **their** avatar and first name, so it's always clear whose itinerary it is.
- Everything else from item 5 stays the same.
- Followers see the same dropdown without Me.
- Update the Itinerary core screen in Figma, and remove the Person switcher component from Figma and code if nothing else uses it.

### R7. The idea sheet and idea card (with item 6)
- **Tapping an idea opens a simpler Sheet:**
  - no Favourite button;
  - **Edit** (in the Sheet's header) only for the person who suggested it. Delete is in Edit, and also only theirs;
  - a row of **Icon buttons**: **Open in Maps** (hidden when the idea has no place), **thumbs up** (keen) and **thumbs down** (Pass), each with its count;
  - the chosen vote shows as a filled icon plus its accessible state, never colour alone;
  - below them: **Go to day** (Ghost Large) and **Add to a day** (Primary Large), side by side when the idea has a suggested day. **Add to a day alone, full width,** when it has none.
- **The idea card in the Ideas tab** gets the thumbs down next to the thumbs up, each with its count, **shown even at 0**, as long as both keep 44 × 44 tap areas at 320px and at the largest text. If they don't fit, keep thumbs up on the card, keep both in the sheet, and say so in the report.
- Followers see the sheet with Open in Maps only.
- Rules: only the suggester can update or delete an idea (votes and passes still by any traveller, on their own entry). Add tests.

---

## Figma changes (checklist)

**Components to change:**
- **Event card:**
  - Tag "New · added by <name>";
  - an I'm out action;
  - an I'm in button for events you're not in;
  - a Who's in Avatar Stack;
  - the price shows your share;
  - a "You're in" Tag;
  - a Guest Tag.
- **Idea row:** the suggested day in the meta, and a trailing action of Go to day or Add to a day.
- **Event card:** a new `Suggested` state (white, dashed border, "Idea · from" Tag, who's in so far, I'm in and Pass).
- **Day strip:** the Today Chip.
- **Budget card:** personal, with Edit.
- **Option card:** used for the role choice.
- **Avatar:** a Guest variant.
- **List item:** variants for Notification centre entries and Changes entries.
- **Icon button:** a Bell with a count dot.

**New components:**
- **Who's in row:** avatar toggle Chips.
- **Person switcher:** avatar Chips.
- **Your booking section.**
- **Changes list.**

**Screens to update or add:**
- People (one list with role dropdowns);
- Add people sheet;
- Join screen;
- Itinerary: Mine, and another person's;
- Event detail (Who's in, Your booking, Changes, Add a guest);
- Ideas: To decide · Passed, with dated and undated ideas;
- Add idea, with an optional date and time;
- Itinerary with the Today Chip;
- Notification centre;
- Budget edit sheet;
- Guest's view of an event;
- Home's "Invited to" section.

## Rules, migration and tests

- **Rules**, each with tests in `tests/rules`:
  - travellers vs followers;
  - only people in an event edit it;
  - bookings visible only to the people they cover and the holder;
  - prices visible only to people in the event;
  - budgets visible only to their owner;
  - history is append-only;
  - a guest can read one event only;
  - followers can never read prices, bookings or budgets.
- **One migration for existing trips:**
  - roles;
  - old going field → `people`;
  - trip budget → personal budgets;
  - seats and booking references on events → bookings;
  - prices → the private price documents.

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line. Compare each changed screen with its Figma frame at 393 × 852.

- [ ] No owner shown or enforced anywhere; any traveller can edit, invite, change roles and delete the trip; deleting goes to Recently deleted
- [ ] All invite and join copy says "Join"
- [ ] Add people asks Travelling or Following first, and the link carries the role; People is one list with a role dropdown on each row
- [ ] Followers never receive prices, bookings or budgets from the database, not just on screen (test with the rules emulator)
- [ ] Only travellers in an event can edit it; others see it read-only with I'm in
- [ ] On an event you're not in (another person's itinerary, its event page, as a follower), only the title, date and time, place and who's in reach the phone; notes, links, files, comments, prices and bookings don't (test with the rules emulator)
- [ ] Deleting a shared event offers "Just me" (the default) or "Remove for everyone"
- [ ] Every edit and delete has an Undo toast; Changes shows history with Restore; Recently deleted shows who deleted
- [ ] New events default to everyone; bookings default to you; ideas default to their voters
- [ ] Being added puts the event on your itinerary with "New · added by"; I'm out removes it from yours only; I'm in brings it back
- [ ] The Notification centre shows additions, changes, outs, joins and chat; the Bell count clears when read and syncs across devices
- [ ] The Itinerary shows only your events by default; the person switcher shows one traveller at a time; there's no combined view; followers default to the traveller who added them
- [ ] Ideas has only To decide · Passed; ideas already on a day are gone from Ideas, and their events are untouched
- [ ] An undated idea offers Add to a day (date and time), which makes an event and removes the idea
- [ ] A dated idea shows Go to day, and appears on that day as a Suggested card with I'm in and Pass; Go to day lands on it, highlighted
- [ ] R1: after a drag starting on anything tappable, nothing looks pressed and nothing opens (everywhere)
- [ ] R2: no Notification centre entry has a button; tapping opens its event, day or People; unread entries have a dot and bold title; entries older than 30 days are gone
- [ ] R3–R5: the event page has the I'm in | I'm out Segment control; Who's in and price sit above the place; Changes is the subtle Accordion at the very bottom
- [ ] R6: the person picker is a dropdown next to Add event, showing whose itinerary it is; no Chip row
- [ ] R7: the idea sheet has Maps, thumbs up and thumbs down (Pass), and Go to day / Add to a day as described; Edit and Delete only for the suggester (rules emulator); the card shows thumbs down at 0 if it fits
- [ ] A booking on a travel event asks who's on it and has a seat for each of them
- [ ] The first I'm in turns a suggestion into an event and removes it from Ideas for everyone; travellers who haven't answered still see it on the day as a Suggested card (with who's in so far) plus a Notification centre entry, and aren't counted as in until they tap I'm in
- [ ] Pass hides it for you only; an idea moves to Passed once all others have passed, or when the suggester passes it
- [ ] Suggestions don't count in going counts, budgets or Next up
- [ ] There's no day-picker calendar, busy indicator or jump-to-date calendar
- [ ] The Itinerary opens on today during the trip, and on the first day before or after it; the Today Chip appears only when today isn't selected or visible, and brings it back
- [ ] One event per real flight; Your booking shows only your details; adding the same flight twice merges into one event
- [ ] Price is a total split by who's in, and updates live when someone is in or out; Each mode doesn't split; cards show your share
- [ ] Budgets are personal and private, set in your Settings currency with Edit on the Budget card; no budget in Edit trip or the New trip flow; old trip budgets migrated
- [ ] No trip currency; every price has its own currency (defaulting to the place's local currency); shares and budgets convert to each person's Settings currency
- [ ] Any traveller can edit the trip's name, dates and cover; the location is read-only after creation; a trip covers its starting location plus every place on its events
- [ ] A guest sees one event in full (notes, links, files, comments, price and their share, their own booking) and nothing else on the trip, counts in the split, and can be added to the trip
- [ ] The migration runs on an existing trip without losing events, people, prices or bookings
- [ ] `docs/ROADMAP.md` updated (built items moved to Built) and the Figma Planning board redrawn from it; any new decisions added to `docs/DECISIONS.md`
- [ ] Report: what changed per item, anything not done and why, and every conflict found between the code, Figma and this file

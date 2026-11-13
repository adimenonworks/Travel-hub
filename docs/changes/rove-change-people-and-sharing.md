# Rove — change prompt: people, sharing and money

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` (components on **Foundations**, core screens on **Screens** `500:508`, decisions on **Planning** `466:553`) and the code on Main. Older handover docs don't apply wherever they disagree.

**What this changes:** how people share a trip. That covers roles, who's in each event, personal booking details, prices and budgets, undo and history, an in-app inbox, and guests on a single event.

**This reverses three earlier decisions.** Update the Planning board to match:
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

## Working across two accounts (read first)

This work is shared between two Claude Code accounts. Either one may stop partway through when it runs out of usage, and the other picks up from the repo alone. So:

1. **Work on one branch per prompt,** named `changes/<prompt-name>` (e.g. `changes/component-library`). If it already exists, check it out and continue on it. Don't start a new one.
2. **Push after every commit.** Unpushed work is lost when the account switches.
3. **Keep `docs/changes/PROGRESS.md` up to date.** Rewrite it after every commit, and push it in the same commit. It should hold:
   - the prompt being worked on, and its branch;
   - the items done, with their commit hashes;
   - the item in progress, and exactly what's left in it;
   - Figma changes made so far (node ids), and anything half-done in Figma;
   - questions waiting for me, and any design gate you're stopped at.
4. **When starting, read `PROGRESS.md` first** and continue from it. Don't redo finished items. If it disagrees with the code or Figma, trust the code and Figma, and update it.
5. **Open the pull request** only when the whole prompt and its Check everything list are done. Then mark the prompt finished in `PROGRESS.md`.

---

## 1. One trip, everyone equal

- **No owner, anywhere.** Remove the hidden creator rank (`isOwner`, `role === 'owner'`) from permissions and the UI. Keep `createdBy` as a record only.
- **Any traveller can:**
  - edit the trip's name, dates and cover (Following can't);
  - add people and change roles;
  - remove someone;
  - delete the trip.
- **The trip's location is locked after creation.**
  - Edit trip shows it as read-only text ("Started in Lisbon, Portugal"), with no picker.
  - So that the lock never traps anyone, the trip's places come from its events. The countries and cities a trip "covers" (used for Good to know, Bring your saves, Add from saved, the Save sheet's trip default, and Collections' trip row) are the starting location **plus** every place on its events.
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
| **Following** | Family at home, or a friend who isn't on the trip | Sees the plan and chats. Never sees prices, booking details or budgets. Can't add, change, vote or delete |

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
| Trip details, ideas, photo albums | Any traveller |
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
  - "Sam added you to Dinner at Ramiro · Thu 12 Dec", with **I'm out** and **View**;
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
  - choosing someone shows **their itinerary only**, as they see it, minus prices and booking details unless you're in that event;
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
- **Voting stays as it is** on To decide ideas.

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
  - every traveller who hasn't answered still sees it on that day as a Suggested card, with **I'm in** and **Pass**, and gets a Notification centre entry ("Sam and Priya are going to Fado night · Thu 12 Dec", with I'm in and Pass).
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
  - Store budgets where only their owner can read them, e.g. `trips/{id}/budgets/{uid}`.

## 9. Guests on a single event

- **Adding a guest:** event detail → Who's in → **Add a guest** makes a link to this event only. It's valid for 14 days and requires sign-in.
- **What a guest sees:** only that event (title, date, time, place, who's in, chat) and **their own share** of the price. They see nothing else on the trip.
- **What a guest counts as:**
  - listed in Who's in with a **Guest** Tag;
  - counted in the price split;
  - can tap **I'm out**;
  - can't edit;
  - not listed on the People tab.
- **On the guest's own Home**, the event shows in an **"Invited to"** section until it has passed.
- **Making a guest a full member:** any traveller can choose **Add to trip** from Who's in, which offers Travelling or Following.

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
- [ ] Deleting a shared event offers "Just me" (the default) or "Remove for everyone"
- [ ] Every edit and delete has an Undo toast; Changes shows history with Restore; Recently deleted shows who deleted
- [ ] New events default to everyone; bookings default to you; ideas default to their voters
- [ ] Being added puts the event on your itinerary with "New · added by"; I'm out removes it from yours only; I'm in brings it back
- [ ] The Notification centre shows additions, changes, outs, joins and chat; the Bell count clears when read and syncs across devices
- [ ] The Itinerary shows only your events by default; the person switcher shows one traveller at a time; there's no combined view; followers default to the traveller who added them
- [ ] Ideas has only To decide · Passed; ideas already on a day are gone from Ideas, and their events are untouched
- [ ] An undated idea offers Add to a day (date and time), which makes an event and removes the idea
- [ ] A dated idea shows Go to day, and appears on that day as a Suggested card with I'm in and Pass; Go to day lands on it, highlighted
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
- [ ] A guest sees one event and their share, counts in the split, and can be added to the trip
- [ ] The migration runs on an existing trip without losing events, people, prices or bookings
- [ ] Planning board updated (the three reversals at the top)
- [ ] Report: what changed per item, anything not done and why, and every conflict found between the code, Figma and this file

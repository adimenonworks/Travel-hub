# Rove — change prompt: New trip stops and Home's main button

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` (Foundations; Screens `500:508`) and the code on Main.

**What this changes:**
- **Home:** Plan a trip becomes the main (Primary) button.
- **New trip, step one:** it takes several places, not one.
- **"Bring your saves?":** it only offers saves from the trip's countries, and is skipped when there are none.

The owner decided all of it on 14 Nov 2026. The reasons are in `docs/DECISIONS.md`.

**Order:** run this before `rove-change-people-and-sharing.md` (owner, 14 Nov 2026). That prompt has already been updated to build on the trip's stops.

## How to work

- Follow `CLAUDE.md`, including the read-first rule.
- Work on this session's own branch. Open and merge one pull request per numbered item, with `docs/changes/PROGRESS.md` committed in each.
- **Figma first, then code,** wherever a component or core screen changes.
- Stop and ask if the code conflicts with this file in a way it doesn't cover.

---

## 1. Home: Plan a trip is the main button

**Today:** Home's two quick actions are Save a place (Primary) and Plan a trip (Neutral).

**The change:**
- **Plan a trip** becomes **Primary** and moves to the **left**. It keeps its calendar icon.
- **Save a place** becomes **Neutral**, on the right. It keeps its plus icon.
- Only one Primary button. Both buttons still hug their labels and sit left-aligned.

**Why:** most saves arrive through the iPhone share sheet (Share → Rove from Instagram, TikTok or Maps), but a trip can only be started in the app. Two Primary buttons side by side would compete, so only one is emerald.

**Where:**
- **Figma Screens, Home frame:** swap the two Button instances and their Tones, using component instances only.
- **Code:** `src/features/home/Home.tsx`.
- **Docs:** update Home's line in `docs/APP-SPEC.md`.
- The accent "Plan your next trip" card (shown when there's no trip) doesn't change.

## 2. New trip, step one: several places

**Today:** step one, "Where to next?", picks one place (a city or a country). It's saved as `trip.destination`, and the trip's other countries only come from its events (`tripCountries` in `src/lib/countries.ts`).

**The change:**
- **Title:** "Where are you going?"
- **Subtitle:** "Add every stop, or just the first. You can add more later."
- **Picking a place** from the search results, or from your saved countries, adds it to a list of stops. The list sits under the search field, in the order the stops were added.
  - Each stop is a row with its flag, name and country, and a remove button. That's a Ghost Icon button with the cross icon, named "Remove <place>" for screen readers.
  - After a pick, the search field clears so the next place can be typed straight away.
  - A saved country that's already a stop shows as selected; tapping it again removes it.
  - The same place can't be added twice.
  - Use existing components only (Text field with its leading icon, List group, List item, Icon button). If a new component or variant seems needed, stop and ask.
- **Continue** works as soon as there's one stop.
- **A long trip** (six or twenty countries) just makes the list longer. Nobody has to add everything up front.

**Data:**
- New field `trip.stops: Place[]`: every stop picked, in order.
- `trip.destination` stays, and is always the **first** stop, so the trip's default name, its cover photo and older code keep working.
- Older trips have no `stops`: read them as `[destination]` through one helper, `tripStops(trip)`. Nothing is migrated.
- Cap the list at 30 stops.
- Check `firestore.rules` allows the new field on create and on update. If the rules change, update `tests/rules` and run them. Tell the owner if the rules need publishing.

**A trip's countries:** `tripCountries` becomes the countries of the trip's **stops, in order, plus every place on its events** (as today). Ideas don't count. Everything that asks which countries a trip covers uses it:
- Good to know;
- Bring your saves;
- Ideas → Add from saved;
- the Save sheet's trip default;
- Collections' trip row (polish prompt F4).

## 3. "Bring your saves?" only shows the trip's countries

**Today:** this step lists every country you've saved in, with the trip's country first. It's skipped only when you have no saves at all.

**The change:**
- **Show only saves in the trip's countries:** places, plus that country's links and notes. Countries appear in the order of the stops.
- **Skip the step** when none of your saves match. The step bars must count the right number of steps from the start, and update as stops are added or removed in step one.
- Everything else about the step stays the same. Nothing comes along until it's picked, and Skip for now still works.

## 4. No list of places in Edit trip (owner, 14 Nov 2026)

- Edit trip gets **no** place picker and **no** list of stops.
- The trip's countries keep themselves up to date: the stops from step one, plus the places on its events.
- Adding an event in a new country adds that country. Deleting events never removes a stop.
- A stop picked at the start and never visited stays on the trip. That's accepted: it only adds a Good to know row and suggests that country's saves.

## 5. Ideas → Add from saved: other countries too

**Why:** with no list of stops in Edit trip, someone who adds a country after creating the trip, before booking anything there, still needs a way to bring in their saves from it.

**The change:**
- "Add from saved" keeps the trip's countries first, as today.
- Below them, add one section, **"Other saved places"**, with your other saved countries. Each country is one collapsed Accordion, so it stays short.
- Picking a place from another country makes an Idea, as usual. Ideas don't change the trip's countries.

---

## Write after

In the same pull requests:
- `docs/APP-SPEC.md`: Home's buttons, the New trip flow, Bring your saves, Add from saved, and what a trip's countries are.
- `docs/DECISIONS.md` already has the decisions. Add an entry only if something changes while building.
- `docs/ROADMAP.md`: move "New trip stops" from Now to Built when done, then redraw the Figma Planning board.
- `docs/changes/PROGRESS.md`: progress, then mark this prompt finished, with **Next** set to `rove-change-people-and-sharing.md`.

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line.

- [ ] Home: Plan a trip is Primary on the left, Save a place Neutral on the right, in Figma (Screens) and code
- [ ] Step one adds several stops: rows with flag and remove, no duplicates, the field clears after each pick, Continue after one, a cap of 30
- [ ] `trip.stops` saved in order; `destination` is the first stop; older trips read through `tripStops`; rules allow it (tested if changed)
- [ ] `tripCountries` = stops plus event places, and every "which countries" use goes through it
- [ ] Bring your saves shows only the trip's countries, in stop order, and is skipped (with the right step count) when nothing matches
- [ ] Edit trip has no stops list or picker
- [ ] Add from saved: the trip's countries first, then "Other saved places" as collapsed Accordions
- [ ] Demo mode with Playwright: one stop, three stops, a stop removed, no matching saves (step skipped), at 320 and 390px, text 17 and 33, light and dark
- [ ] `APP-SPEC.md`, `ROADMAP.md` and `PROGRESS.md` updated; Planning board redrawn

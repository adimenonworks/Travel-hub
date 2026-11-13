# Rove — change prompt: component library cleanup

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` (components on Foundations, section `88:7142`; core screens on Screens `500:508`; Planning `466:553`) and the code on Main.

**Run this first,** before the other two change prompts ("people, sharing and money" and "trip polish, notifications, saving and Collections"). Those prompts add new components, and they should land in a tidy library. **Don't build their features here.** Only tidy, rename, merge and delete. Where they mention a component by an old name, they mean its new name from this prompt.

**How to work:**
- **Figma first, then code.** Every rename, merge and deletion is mirrored 1:1 in `src/design/components`, in every screen that uses it, and on `/#/design`.
- **Screens shouldn't look different afterwards.** This is a cleanup, not a redesign. Compare every screen on the Screens page, and in the app at 393 × 852, before and after.
- **Make one commit per numbered item** (A1–A4).
- **If a merge would change how a screen looks, or something is unclear, stop and ask.**

The Components section (`88:7142`) has grown messy. The goal is fewer, more reusable components with one naming system. **Code components must mirror the result 1:1** (rename, merge and delete in code too, and update `/#/design`).

## Standing rule: challenge my requests (add this to `CLAUDE.md` in your first commit)

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

### A1. Tidy the canvas
- **Layout:**
  - lay every component set out on a grid inside the Components section, grouped by kind: Controls · Navigation · Content & lists · Cards · Trip · People · Feedback · Media;
  - inside a group, order by size and then state;
  - leave fixed gaps (`space` tokens) between sets, with nothing overlapping or touching.
- **Icons and flags:**
  - icons sit in a strict grid in the Icons section, alphabetical, with new icons added at the next free cell;
  - flags are handled the same way, in their own grid.
- **Delete or archive strays:**
  - the instance "Sheet · edit (example)", which overlaps Search field;
  - the three loose image rectangles at around x 3130–3830, y 7159–8633 on Foundations;
- **Keep the "Backup icons" section.** Move it, unchanged, to a new page called **Backup artifacts**.
- **Section names:**
  - fix the "Primtives" typo to "Primitives";
  - two sections are both called "Typography": merge them, or name them by what they hold.

### A2. Naming and glossary
- **Sentence case everywhere:** components, frames, properties and values. For example: Hero card, Day card, Page header, Text field, Avatar stack, Nav item, Bottom nav, Cover scene; `Title large`, `Title small`.
- **Prefix nested-only parts with "."** so they're hidden from publishing:
  - `.Context menu item`, `.Nav item`, `.Calendar day`, `.Vote button`, `.Message`, `.Category icon`, `.Leg`, `.Stop` (A3);
  - `.Tab` and `.Segment` already follow this.
  - Only prefix a part that is never placed on a screen by itself. Check the Screens page before renaming.
- **Glossary of property names.** Use exactly these, and nothing else:

  | Property | Means | Values |
  | --- | --- | --- |
  | `Type` | Event type (sets the colour) | Neutral · Travel · Stays · Food & drink · Activities · Notes |
  | `Tone` | Colour role, not event type | Default · Accent · Neutral · Success · Warning · Danger (only what's used) |
  | `Size` | Size | Small · Regular · Large |
  | `State` | Interaction or status | Default · Pressed · Disabled · Selected · Focus · Filled · Next · Done · Suggested |
  | `Layout` | Structural variant | Per component |
  | `Show <thing>` | Boolean visibility | — |

  - Chip's `Category` property becomes `Type`.
  - Avatar's `Kind` becomes `Type`, unless it clashes with event Type (decide, then record it in the glossary).
- **Rename components whose names now mean something else:**
  - **Notification** (the in-page banner) becomes **Banner**, so "Notification" belongs only to the Notification centre;
  - **Tags** becomes **Tag**;
  - **Timeline** (the current-time marker) becomes **Now line**.
- **Write the glossary on Foundations** as a text block (component names, property names, the event type names, product words such as Trip, Collection, Idea, Event, Traveller, Follower, Guest), and copy it to `DESIGN.md` in the repo.

### A3. Merge and remove

| Change | Detail |
| --- | --- |
| **Delete Flow screen** (and its Celebration variant) | Build the New trip steps and the celebration as screens from tokens (`on-dark/*`) plus existing components (Icon button, Step progress, Option card, Calendar, Button). In code, `FlowScreen` and `CelebrationScreen` become screens, not design-system components |
| **Tile: remove Orange, Green, Yellow, Pink** | Only used on `/#/design`. Keep Default. Turn Add into a boolean (`Add`, a dashed "New place to go") |
| **Merge Card and Empty state into Card** | `Tone` Default / Accent; a top `Media` slot (illustration, photo or cover scene); title, body; `Show actions` with Primary/Secondary buttons |
| **Merge Location card and Collection header into Map card** | Map viewport (clipped) → title and meta → a `Trailing` slot (preferred instances: Avatar stack, Icon button star) → a `Footer` slot (preferred: a Button pair). **Remove the visited progress bar.** "2 of 9 visited" becomes meta text |
| **Merge Stat and Day card into Number card** | Big number plus a label underneath. `Tone` Default / On dark (stats sit on `on-dark/surface/sunken`). `State` Default / Selected. Stat strip's slot then takes Number cards |
| **Merge Trip header and Page header into Page header** | Props: `Show back` and Back label, `Size` Large / Small title, `Show leading icon` (the event page's category icon), `Show meta`, a `Trailing` slot (Edit Icon button, Notification bell). Deprecate Trip header |
| **Hero card: one component** | Drop `Size`. Use one cover height everywhere, plus booleans `Show heads-up`, `Show people`, `Show countdown`. If one cover height doesn't work on both Home and Trips, stop and show both |
| **Merge Journey details card, Span card and Layover block into Journey card** | A slot of `.Leg` (from → to, times, terminals, number, status) and `.Stop` (a layover: city, duration, warning, Add a stay) rows. Span card's start and end are a Journey card with start/end labels instead of from/to. Needed for B4 |
| **Event type lives only in `.Category icon`** | Event card (42 variants), List item (12), Idea row (6), Chip (12) and Option card (14) all multiply by `Type`. Remove `Type` from all of them and nest a `.Category icon` instance whose own `Type` sets the colour. Target: Event card is `Layout` × `State` only |
| **Drop Hover states** | Rove is touch-first. Button: Default / Pressed / Disabled. Text field: Default / Focus / Filled (merge Typing into Focus) |
| **Merge Search field into Text field** | It's a Text field with a leading icon, and Text field already has an `Icon` swap |
| **Tag: remove Tint** | Unused, and brand-tinted tags are banned |
| **Merge Cover scene into Illustration** | `Size` Spot / Cover, so there's one illustration set |
| **Profile card becomes a List item** | `Size` Large with Avatar media, if the result matches visually. Otherwise keep it and say why |

### A4. Then delete what's unused
After A3, list every component with **zero instances** on Screens and in other components, and **zero uses in `src/features`** (ignore `/#/design`). Delete those from Figma and code. Report the list before deleting anything that is used in code but not in Figma, or the other way round.

**Done when:** no overlaps on the canvas; every name follows A2; every merge in A3 is done in Figma and code; `/#/design` shows the new library; and the variant count is reported before and after.


---

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line.

- [ ] No overlapping sets; grouped grid; icons and flags in grids; strays and duplicate sections cleaned
- [ ] Sentence case everywhere; nested-only parts start with "."; glossary on Foundations and in DESIGN.md
- [ ] Every A3 merge done in Figma and code; variant count before and after reported; unused components deleted after reporting
- [ ] The Backup icons are on the new Backup artifacts page, unchanged
- [ ] Every screen looks the same before and after (side-by-side screenshots at 393 × 852)
- [ ] `/#/design` and `DESIGN.md` match the new library

**Report:** the variant count before and after, everything renamed, merged and deleted, anything you didn't do and why, and every conflict found between the code and Figma.

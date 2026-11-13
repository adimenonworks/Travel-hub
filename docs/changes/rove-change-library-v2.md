# Rove — change prompt: library v2 (tokens, names and component fixes)

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` (components on Foundations, section `88:7142`; core screens on Screens `500:508`) and the code on Main.

**Where this comes from:** an audit of Figma against the code on 14 Nov 2026, and the owner's decisions on it the same day.

**Order:** run this **next**, before `rove-change-people-and-sharing.md` and `rove-change-polish-and-library.md`. Those two will be built on the tokens and names set here. Part E updates their wording to match.

**Precedence:** where this file disagrees with `CLAUDE.md`, `DESIGN.md` or the other change documents, this file wins. Update them as part E says.

## How the work is saved (read first)

A session may stop partway, and a new one picks up from Main alone. So:

1. **Work on the session's own branch** (the one Claude Code gives it).
2. **Open and merge a pull request after each finished item** (A1, A2, … in order), following `CLAUDE.md`: build and checks pass, nothing needs the owner's attention, then merge without asking. **Stop and ask first at any design gate (⏸).**
3. **Commit `docs/changes/PROGRESS.md` with each merge,** so a new session can continue from Main. It should hold:
   - the prompt being worked on;
   - the items done, with their pull requests;
   - the item in progress, and exactly what's left in it;
   - Figma changes made so far (node ids), and anything half-done in Figma;
   - questions waiting for the owner, and any design gate you're stopped at.
4. **When starting, read `PROGRESS.md` first** and continue from it. Don't redo finished items. If it disagrees with the code or Figma, trust the code and Figma, and update it.
5. **When the whole prompt and its Check everything list are done,** mark the prompt finished in `PROGRESS.md`.

## Rules for this prompt

- **Figma first, then code, always matching 1:1:** names, variants, properties and variables.
- **Screens must look the same afterwards,** except where an item says otherwise. This is a restructure, not a redesign. Compare in demo mode, before and after, at 320, 375, 393 and 430px, light and dark, and at 17, 23 and 33px text.
- **The standing rule in `CLAUDE.md` applies:** if something here looks wrong, or there's a better way, say so before building it.
- **If a step would change how a screen looks, or something is unclear, stop and ask.**

---

## Part A — Tokens

### A1. Work out the full mapping first ⏸ Design gate

Before changing anything:
1. Write `docs/token-migration.md`, a table of **every** current variable (Figma) and CSS variable (code), with what it becomes under A2–A7, or "deleted" and why. Include the code-only tokens (motion, shadow, size, spacing aliases, `--font-*`, `--type-*`).
2. List every component whose Figma variables or code CSS change.
3. **Stop and show the owner the table.** The owner knows token structures well and will review it. Build nothing until it's approved.

### A2. Collections

| Collection | Modes | Holds | Used directly by components? |
|---|---|---|---|
| **Base** | one | Raw values: `base/color/{palette}/{step}`, `base/space/{px}`, `base/radius/{px}` | **No,** only by other variables |
| **Color** | Light · Dark | The one semantic colour set (A3) | Yes |
| **Layout** | one | Spacing, corners, sizes, border widths (A4) | Yes |
| **Typography** | one | Fonts, weights, sizes (A5) | Yes |
| **Motion** | one | Durations (Number variables) and easing curves (String variables) (A6) | Yes |

- **Base** replaces "Primitives".
  - Keep every colour palette and step: the owner wants the full palettes available.
  - Drop raw spacing and corner values that nothing uses, such as the unused negative spaces. This also removes today's `radius/0` clash between Primitives and Layout.
- **Shadows stay as Figma effect styles,** because variables can't hold shadows. Delete `Shadow/Subtle`, which is unused.
- **There are no surface modes.** Dark-green areas use the small `feature/` group (A3).

### A3. Color: one set, no `on-*` prefixes

Remove the `on-light/`, `on-mid/`, `on-dark/` and `on-accent/` structure. Everything becomes one set:

| Group | Tokens |
|---|---|
| `surface/` | primary (page), secondary (cards), sunken, raised (sheets) |
| `text/` | primary, secondary, brand, link, link-hover, link-pressed |
| `icon/` | primary, secondary, brand |
| `border/` | subtle, bold, focus, brand · plus `divider` |
| `status/` | success, warning, danger, each with a `-subtle` version. **"error" is renamed "danger"** to match the Tone names |
| `feature/` | surface, surface-secondary, surface-sunken, text, text-secondary, text-brand, icon, divider, border-focus: the deep-green feature surfaces (A3.1) |
| `button/` | primary, neutral, inverse, tertiary, ghost, destructive, each with background, background-hover, background-pressed, text, icon, border (where used), disabled-background, disabled-text |
| `control/` | selected and unselected, each with background, background-hover, background-pressed, text, icon, border (where used). They replace `interactive/selected/*` and `interactive/unselected/*`: chips, tabs, segments, day cards, nav items |
| `input/` | background, background-hover, border, border-focus, label, value, placeholder, hint |
| `tag/` | neutral, success, warning, danger, category, each with background, text, icon. **`tag/brand/*` becomes `tag/category/*`** |
| `category/` | travel, stays, food-and-drink, activities, notes, each with surface, icon, surface-on-feature and icon-on-feature (`-on-dark` is renamed `-on-feature`) |
| `overlay/` | scrim, bar, image |
| `illustration/` | the existing 8 |

- **Hover tokens stay** (owner, 14 Nov 2026). The website will come back, and it's used with a mouse. They still apply only inside `@media (hover: hover)` in code, and Figma still has no Hover variants.
- **Keep only what's used.** If A1 shows a token in this table is unused, flag it rather than creating it.

#### A3.1. Feature surfaces (deep green)

- **Where they appear:** the Event card's Next state, the accent Card, the Stat strip, initials Avatars, your own chat bubbles, and the New trip flow and its celebration.
- **How:** each uses `feature/*` tokens **directly.** Delete the `.surface-dark` class in `src/design/base.css`, which re-points 24 variables inside dark areas, and its use in `Card.tsx` and `Rows.tsx`.
- **Why no mode** (owner's decision): only about 8 dark-green tokens are actually used, so a mode isn't worth the complexity.

#### A3.2. Remove on-accent with the confetti

- **The owner wants the celebration confetti removed.** Delete it from `NewTripScreens.tsx` and its CSS. The rest of the celebration (illustration pop-in, count-up, success haptic) stays.
- **That removes the last use of `on-accent/*`,** so delete the whole set. Category colours aren't affected: they live in `category/*`, built on the Base palettes.
- **Delete `on-mid/*`** (used in 3 places; move those to the right token in A3).

### A4. Layout

| Group | Tokens |
|---|---|
| `space/` | `100`…`1000` (the old `space/default/*`, dropping "default"), `negative/200` |
| `space/page/` | `gutter` (24), `section` (40), `top`, `bottom` (96). These are code-only today (`--space-gutter`, `--space-stack`, `--space-page-top`); `CLAUDE.md` wrongly says Figma has `space/page/s` |
| `radius/` | `100`…`900` and `full` (the old 1000) |
| `size/` | `tap` (44), `icon-small` (16), `icon-large` (24), `control-small` (32), `control-large` (48), `avatar-small`, `avatar-medium`, `avatar-large`, `category-icon-small`, `category-icon-medium`, `category-icon-large`, `tab-bar`, `content-max`. Use the real values from the code. Add any other fixed component dimension A1 finds |
| `border-width/` | `thin` (1), `medium` (1.5), `thick` (2), `focus` (3) |

### A5. Typography

- **Collection:** `font/body` (Manrope), `font/display` (Poppins), `weight/{regular, medium, semibold, bold, black}`, `size/{display, display-small, heading-1, heading-2, heading-3, heading-4, body, body-small}`, and line heights as variables if the text styles need them.
  - `size/display tiny` becomes `size/display-small`.
  - Delete `size/display secondary` (unused).
  - Names use hyphens, not spaces.
- **Text styles:** "Body Small" becomes **"Body small"**, and "Display tiny" becomes **"Display small"**. Check every style for sentence case.
- **The Label style hard-codes its size in code** (`calc(14rem / 17)`). It must use `size/body`.

### A6. Motion (new collection in Figma)

- **Contents:**
  - `duration/quick` (150), `duration/regular` (250), `duration/gentle` (350), as Number variables in ms;
  - `easing/standard` and `easing/spring`, as String variables holding the curves.
  - Add any other duration or curve the code uses today.
- **Code:** consolidate today's `--duration-*`, `--ease-*` and `--motion-*` into these names, keeping the existing animations exactly as they are.
- **The polish prompt's B7** asks for motion tokens: these are them. Part E updates its wording.

### A7. Every value comes from a variable (owner's rule, 14 Nov 2026)

- **In Figma:** every colour, spacing, corner, size, border width and text value inside a component is linked to a variable or style. The only exception is screen frame widths on the Screens page, which are canvas layout, not component values.
  - The audit found unlinked values in Toast, Event card, Tile, Option card, Message, Map card, Budget card, `.Category icon` (its corner radius), `.Context menu item`, Context menu, Accordion and Journey card. Link them all.
- **In code:** the same rule, through CSS variables.
  - Fixed component dimensions use `size/*`, border widths use `border-width/*`, and the 3px focus outline uses `border-width/focus`.
  - The few remaining raw values (for example in `Field.module.css` and `shared.module.css`) become variables or `calc()` of variables.
- **Add the rule to `CLAUDE.md`,** replacing the old "fixed widths and heights are the exception" wording.

---

## Part B — Components

### B1. Sizes: Small / Large, and Medium when there are three

| Component | Now | Becomes |
|---|---|---|
| Button | Regular / Large | **Small / Large** |
| Icon button | Small / Regular | **Small / Large**. Code: replace the `small` boolean with `size="small" \| "large"` |
| List item | Small / Regular | **Small / Large** |
| Avatar | Small / Regular / Large | **Small / Medium / Large** |
| `.Category icon` | Small / Regular / Large | **Small / Medium / Large** |
| Toast | Regular / Large | Leave it: the polish prompt (G1) removes Toast's Size |

Code values follow: `'small' | 'large'`, or `'small' | 'medium' | 'large'`.

### B2. Names

- **Full names, not abbreviations,** unless a name gets really long.
  - Icons: Information (`info` in code), Document (`doc`), Sign out (`signout`). Code keys become `information`, `document`, `sign-out`.
  - Check every component, property, variable and icon name for other abbreviations, and list any you'd leave short, with the reason.
- **Sentence case everywhere:** components, properties, values, variables, styles, layers. Check inner layer names too; the last cleanup didn't finish them.
- **Booleans** read "Show <thing>". When the thing is a component, use the component's name as written, starting with a capital: **"Show Icon button"**, "Show Avatar stack", "Show Tag". Otherwise it's sentence case: "Show meta", "Show leading icon".
- **Layer names** start with a capital letter.
- **`Stat` becomes `.Stat`.** It's only ever used inside Stat strip.
- **Update the glossary** in `DESIGN.md` and on Foundations with these rules.

### B3. Remove orphaned icons

Now line, Map card (its star Icon button) and Idea row (the "Most votes" Tag) still contain old icon components that are on no page: `fi-rr-time-oclock` (`128:582`) and `fi-rr-star` (`128:570`). Swap them for **Icon/Clock** and **Icon/Star** from the library. Check nothing else uses them.

### B4. Remove variant options with only one choice

| Component | Option to remove |
|---|---|
| Day card | `Layout=Strip` |
| Avatar stack | `Size=Regular` |
| Now line | `Size=Small` |
| List group | `Tone=Default` |

### B5. Card: remove or merge its extra code props

Code `Card` has `icon`, `flush` and `action`, which Figma's Card doesn't. For each one, check where it's used:
- if it's needed, add it to Figma;
- if `media` or `actions` already covers it, merge it in;
- otherwise remove it.

Report what you did and why.

### B6. Message becomes a real component

- **Today:** the chat bubble is drawn inside `features/shared/Comments.tsx`.
- **The change:** make it a design component, `Message` in `src/design/components`, matching Figma's Message (`452:3461`: Layout Theirs / Mine, Show meta, Show avatar). Use it in Comments.
- **Mine bubbles** use `feature/*` tokens.
- **Show it on `/#/design`.**

### B7. Text field, Text area and Dropdown: three components

- **Figma:** split Text field's `Layout` (Input / Text area / Dropdown) into **three components: Text field, Text area, Dropdown.** Each keeps its states and props.
- **Code:** `TextField`, `TextArea`, and `Select` renamed **`Dropdown`**.
- **Put them together** under the Controls group on the canvas.

### B8. Keep the unused icons

The weather icons (cloud, rain, snow, bolt), mask, comment-user and train-side aren't used today. Keep them as normal library icons, in both Figma and code.

---

## Part C — The Components section on Foundations

- **Group headers:** each kind of component (Controls, Navigation, Content & lists, Cards, Trip, People, Feedback, Media) gets a header that's **readable at a glance when zoomed out**: very large text (around 200px), linked to a text style or variables like everything else.
- **Check the layout:** every set in its kind's row, a clear grid, nothing overlapping, sets in a sensible order (most used first, then alphabetical), new components added at the end of their row.
- **Screenshot the section** at a zoom where the whole thing is visible, and include it in the PR.

---

## Part D — Code tidy-ups the audit found

- **Delete what nothing uses:** once A1 is approved, delete every code token the mapping marks "deleted".
- **Update `/#/design`** to show the new collections and names, and drop anything deleted.

## Part E — Update everything that names tokens or components

In the same PRs as the changes:
- **`CLAUDE.md` and `DESIGN.md`:** new token and component names, the new rules (A7, B1, B2). Remove the stale lines the audit found:
  - screens "on the Flows page" (it's gone);
  - weather and news in the intro;
  - the Destination header;
  - "Secondary button";
  - country chips on the Hero card and Trip header;
  - "focuses its first field as it opens" (reversed in the polish prompt).
- **`docs/changes/rove-change-people-and-sharing.md` and `docs/changes/rove-change-polish-and-library.md`:** replace old token and component names with the new ones (for example `on-light/surface/secondary` becomes `surface/secondary`, `on-dark/*` becomes `feature/*`, Search field becomes Text field, and Size names follow B1). Don't change what they ask for, only the names.
- **`docs/token-migration.md`:** keep it as the record of old and new names.

---

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line.

- [ ] `docs/token-migration.md` written and approved before any change
- [ ] Collections: Base, Color (Light/Dark), Layout, Typography, Motion, in Figma and code
- [ ] No `on-light`, `on-mid`, `on-dark` or `on-accent` tokens anywhere; no `.surface-dark` re-pointing
- [ ] `feature/*` used by every deep-green area; confetti gone; celebration otherwise unchanged
- [ ] `status/danger` replaces error; `tag/category` replaces tag/brand; `control/*` replaces interactive/selected and unselected; hover tokens kept
- [ ] Every value in every Figma component is linked to a variable or style (checked by script); the same in code (search for raw hex, px and ms values)
- [ ] Motion collection in Figma; the code uses its names; animations unchanged
- [ ] Sizes are Small / Large (Medium where there are three) in Figma and code; Icon button has `size`
- [ ] Full names (Information, Document, Sign out, plus any others found); sentence case; "Show <Component>" booleans; layer names capitalised; `.Stat`
- [ ] No orphaned icons inside library components
- [ ] No single-choice variant options
- [ ] Card's extra props resolved and explained; Message is a real component; Text field, Text area and Dropdown are three components
- [ ] Group headers readable when zoomed out; section screenshot in the PR
- [ ] Every screen looks the same as before (demo mode, all widths, light and dark, all three text sizes), except the confetti
- [ ] `CLAUDE.md`, `DESIGN.md`, `/#/design` and the two other change documents updated; stale `CLAUDE.md` lines removed
- [ ] Variant and token counts before and after reported
- [ ] Report: what changed per item, anything not done and why, and every conflict found between the code, Figma and this file

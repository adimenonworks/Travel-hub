# Token migration (library v2, A1)

**Status: approved by the owner on 14 Nov 2026, with the answers below. A2 and A3 are built.** The tables show the approved names. The original questions are kept under "Decisions" for the record.

This is the record of every token's old name and new name for `docs/changes/rove-change-library-v2.md` (A2–A7). It was made on 14 Nov 2026 from Main (`185d1fa`) and the Figma file `cXoK1GzmzgqY0cmcgJw66W`.

How the use counts were made:
- **Code:** every `var(--name)` in `src/` (CSS, TSX) and `index.html`. The 24 lines of `.surface-dark` in `base.css` are counted separately: they aren't real uses, they're the re-pointing that A3.1 deletes.
- **Figma:** every variable bound to a node inside the Components section (`88:7142`, 6,726 nodes, hidden layers included). Text styles use the Typography variables too.

What "used" means below: **C** = used in code, **F** = bound in a Figma component, **–** = used nowhere (only defined).

Before → after counts:

| | Figma now | Figma after | Code now | Code after |
|---|---|---|---|---|
| Collections | 4 (Primitives, Color, Layout, Typography) | 5 (Base, Color, Layout, Typography, Motion) | 3 files | same 3 files, new names |
| Colour variables (semantic) | 228 | about 135 (see the Color tables) | 266 | about 135 |
| Text styles | 12 | 12 (2 renamed) | 12 | 12 |
| Effect styles | 5 | 4 (Shadow/Subtle deleted) | 3 shadows + 1 blur | 2 shadows + 1 blur |

The exact final counts go in the A2–A7 PRs once the decisions at the end are made.

---

## The owner's answers (14 Nov 2026)

1. The Next card's Tag is the plain white Tag, as Figma draws it (no new Tag tokens). Add `feature/icon-secondary`, `feature/border-subtle` and `feature/status-warning`.
2. Yes: one scoped focus-ring rule on a `feature` class.
3. Keep `surface/brand`.
4. Don't create `surface/raised`.
5. Selected Chips become emerald-700 like the rest: one `control/selected`, no `selected-strong`. Keep `selected-ghost` and `unselected-ghost`.
6. "Mine" bubbles use `feature/*`.
7. The New trip close button: Icon button tone **On feature**, `feature/surface-sunken` + `feature/icon`. The map pin: new `map/pin` and `map/pin-icon` (today's Primary button values), not `button/primary/*`.
8. The Event card star: `icon/brand`.
9. Noted.
10. Keep every Motion value as proposed, and the code-only `--motion-*` shorthands built only from Motion variables. The polish prompt's B7 gets a note to consolidate the durations to a tighter scale.
11. Both use `feature/surface-secondary`.

Also:
- Delete `feature/text-brand`, `overlay/image` and `illustration/warm` (unused).
- Merge `space/550` into `space/700`, delete `radius/800`, don't add `size/heading-4`, and rename Layout's mode to "Value".
- Sizes (A7): no one-off component size tokens. Role tokens only where a meaning is shared (`tap`, `icon-*`, `control-*`, `avatar-*`, `category-icon-*`, `tab-bar`, `content-max`), plus a numbered size scale (`base/size/{px}` in Base, `size/{step}` in Layout, like spacing) for everything else.

## Decisions (the questions as asked, 14 Nov 2026)

The standing rule says to challenge the prompt where something looks wrong. These came out of the audit. Each one has my recommendation; nothing is built until you answer.

1. **Removing `.surface-dark` carries more than 8 tokens.** Today it quietly re-points 24 tokens inside the Next Event card and the accent Card. Things nested in those cards use them without anyone noticing: the time and place icons (icon/secondary), the journey line (border/subtle), the "Check-in open" status text (status/warning), the focus ring, and the **Tag** ("1 new message"), whose white background turns dark grey (`neutral-900`) on the Next card.
   **Recommendation:** add `feature/icon-secondary`, `feature/border-subtle` and `feature/status-warning` to the feature group (so 12 tokens, not 9), and give Tag a feature look the Next card asks for explicitly (`.Tag` on a feature surface = `tag/neutral` on `feature/surface-sunken`?). The simplest no-change option is: the Next card's Tag keeps today's look (a dark grey pill), as `feature/tag-background` + `feature/tag-text`. **Please pick: keep the dark grey pill (no visual change), or make it the plain white Tag.**
2. **Focus rings inside feature surfaces.** Without re-pointing, `:focus-visible` everywhere uses `border/focus` (emerald-700), which is nearly invisible on deep green. **Recommendation:** one small rule, `.feature :focus-visible { outline-color: var(--feature-border-focus) }`, on a `feature` class that the dark-green components already add. That's a single scoped override, not a re-pointing of 24 tokens. OK?
3. **The prompt's `surface/` list has no `brand`, but it's used** (light emerald, `on-light/surface/brand`, 6 uses in code, 16 in Figma: the calendar range, a voted Vote button, Card's media tile, the accent Note). **Recommendation:** keep `surface/brand`.
4. **`surface/raised` (sheets) would be new and unused.** Sheets use `surface/primary` today. Per "keep only what's used", **recommendation: don't create it.**
5. **Chips use a different selected colour from everything else.** A selected Chip is `emerald-800` (`interactive/selected/secondary`); a selected Day card, Segment pill and Calendar day are `emerald-700` (`interactive/selected/primary`); a selected Tab is a coloured underline and text (`interactive/selected/ghost`). One `control/selected` set would change one of them.
   **Recommendation:** keep the three looks as `control/selected/*` (filled: Day card, Segment, Calendar), `control/selected-strong/*` (Chip), `control/selected-ghost/*` (Tab text and underline, Segment labels), and `control/unselected/*` (white Chip) + `control/unselected-ghost/*` (Tab, Day card, row highlights). **Or** make Chips `emerald-700` like the rest (a one-step colour change, then it's one `control/selected`). **Which?**
6. **"Mine" chat bubbles would change colour.** The prompt says they use `feature/*`. Today they use `interactive/selected/primary`: `emerald-700` in light, **bright `emerald-300` in dark mode**. `feature/surface` is `emerald-800` in both. So the light bubble gets one step darker and the dark-mode bubble changes from bright to deep green. **Recommendation:** do it (it matches the Next card and reads better in dark mode), but it's a visible change, so it needs your yes.
7. **The map pin and the Icon button "On brand" use `on-mid/*`, which is deleted.**
   - The home pin and the map's accent colour (`on-mid/surface/primary` + `on-mid/icon/primary`: bright emerald with a near-black icon; dark mode deep emerald with a pale icon). **Recommendation:** `button/primary/background` + `button/primary/icon` (the Primary button's colours). Light mode is the same; in dark mode the pin becomes bright emerald like the Primary button (more visible on a dark map). Visible in dark mode only.
   - The New trip close button (`IconButton tone="on-brand"`, `on-mid/surface/sunken` + `on-mid/icon/primary`: 10% black over the green screen, near-black ✕). It sits on the deep green flow, where a near-black ✕ is low contrast. **Recommendation:** rename the tone to **On feature** and use `feature/surface-sunken` + `feature/icon` (a white ✕ on a 10% white circle), which matches the flow's white titles. That's a visible change on the New trip flow; **OK?**
8. **The Event card's favourite star is orange in Figma but emerald in code.** Figma's Event card draws its Favourite star with `on-accent/surface/orange` (7 variants); code's filled icons use `on-light/icon/brand` (emerald). Since on-accent is deleted, Figma needs a new colour anyway. **Recommendation:** `icon/brand`, like every other filled icon in the app (code wins, no screen change). If you want stars orange (they read as "favourite" more clearly), it'd be a new `icon/favourite` token in both. **Which?**
9. **A broken variable in Figma.** The eight group headers in the Components section ("Group · Controls" …) are filled with `text/brand` (`VariableID:41:22`) from an old collection (`3:57`) that no longer appears in the file's collection list. Part C rebuilds those headers, so they'll get `text/brand` from the new Color collection. Nothing to decide; noted so it's not a surprise.
10. **Code has motion values Figma's new Motion collection needs.** The prompt names quick 150, regular 250, gentle 350 and two curves. The code actually uses 150, 200, 220, 250, 400, 420, 520 ms and seven curves (table A6). **Recommendation:** keep every value the code uses (animations must stay exactly the same), named by role, and **don't** create a 350 that nothing uses. See A6. **OK?**
11. **Hero card's cover frame** uses `on-dark/surface/secondary` (`emerald-600`) for its countdown pill and the New trip screen background. That isn't in the prompt's feature list. **Recommendation:** it's `feature/surface-secondary`, which the prompt does list. Just confirming it covers both.

---

## A2. Collections

| Figma now | Figma after | Code now | Code after |
|---|---|---|---|
| Primitives (129) | **Base** (115 after A2) | `primitives.css` | `primitives.css`, variables renamed `--base-…` (the file keeps its name, since `src/design/base.css` already exists) |
| Color [Light, Dark] (228) | **Color** [Light, Dark] | `semantic.css` | `semantic.css` |
| Layout [Regular] (27) | **Layout**, its one mode renamed "Value" (owner; done in A2) | `semantic.css` | `semantic.css` |
| Typography [Small] (15) | **Typography** | `typography.css` | `typography.css` |
| — | **Motion** (new; created in A6 with its values) | `primitives.css` (code-only) | `motion.css` (new file, A6) |
| Effect styles: Shadow/Raised, Shadow/Overlay, Shadow/Subtle, Blur/Overlay, Elevation/Floating bar | Shadow/Subtle **deleted** (unused in both) | `--shadow-*`, `--blur-overlay`, `--elevation-floating-bar` | `--shadow-subtle` deleted |

## A2. Base (was Primitives)

Every colour palette and step is kept (owner). Names gain `base/` in Figma and `--base-` in code.

| Now (Figma / code) | After (Figma / code) | Used | Note |
|---|---|---|---|
| `color/{palette}/{step}` / `--color-{palette}-{step}` (emerald, green, orange, red, yellow, pink, sky, violet, neutral; 113 values) | `base/color/{palette}/{step}` / `--base-color-{palette}-{step}` | via semantic | **all kept.** Green has no 50, orange no 50: unchanged (not adding new colours) |
| `space/-40, -24, -16, -10, -8, -4, -2` / `--space--40` … | **deleted** | – | unused negative spaces |
| `space/-6` / `--space--6` | `base/space/-6` | via `space/negative/200` | kept |
| `space/0, 2, 4, 6, 8, 12, 16, 18, 20, 24, 32, 40, 48, 96` | `base/space/{px}` | via Layout | kept |
| `space/10`, `space/120` | **deleted** | – | nothing refers to them |
| `radius/0` (Primitives) | **deleted** | – | the clash with Layout `radius/0`. Layout `radius/0` is also unused (see A4) |
| `radius/2, 4, 8, 12, 16, 24, 32, 48, 64, 999` | `base/radius/{px}` | via Layout | kept |
| `radius/20, 40, 80, 96` | **deleted** | – | nothing refers to them |
| `--font-manrope`, `--font-poppins` (code) | moved to Typography (`--font-body`, `--font-display` hold the stacks directly) | C | |
| `--font-mono` (code) | kept, code only (moves to `typography.css` in A5) | C 1 | **correction:** A1 said unused; /#/design uses it for token names |
| `--duration-*`, `--ease-*` (code) | moved to Motion (A6) | C | |

## A3. Color

One set; no `on-*` prefixes. Light / Dark values are unchanged unless a decision above says otherwise. ✱ = needs a decision above.

### surface/

| Now | After | Used |
|---|---|---|
| `on-light/surface/primary` | `surface/primary` | C 34 · F 114 |
| `on-light/surface/secondary` | `surface/secondary` | C 22 · F 66 |
| `on-light/surface/sunken` | `surface/sunken` | C 8 · F 14 |
| `on-light/surface/brand` | `surface/brand` ✱3 | C 6 · F 16 |
| — | ~~`surface/raised`~~ ✱4 | not created |

### text/, icon/, border/

| Now | After | Used |
|---|---|---|
| `on-light/text/primary` | `text/primary` | C 42 · F 180 |
| `on-light/text/secondary` | `text/secondary` | C 40 · F 204 |
| `on-light/text/brand` | `text/brand` | C 6 · F 16 |
| `on-light/link/default` | `text/link` | C 4 · F 6 |
| `on-light/link/hover` | `text/link-hover` | C 1 (base.css underline hover is thickness only; kept for the website) |
| `on-light/link/pressed` | `text/link-pressed` | – kept: hover/pressed pairs stay (owner) |
| `on-light/icon/primary` | `icon/primary` | C 12 · F 498 |
| `on-light/icon/secondary` | `icon/secondary` | C 6 · F 36 |
| `on-light/icon/brand` | `icon/brand` | C 9 · F 378 |
| `on-light/border/subtle` | `border/subtle` | C 13 · F 36 |
| `on-light/border/bold` | `border/bold` | C 3 · F 2 |
| `on-light/border/focus` | `border/focus` | C 7 · F 4 |
| `on-light/border/brand` | `border/brand` | C 1 · F 2 |
| `on-light/divider/default` | `border/divider` | C 5 · F 10 |

### status/ ("error" → "danger")

| Now | After | Used |
|---|---|---|
| `on-light/status/success` / `-subtle` | `status/success` / `status/success-subtle` | C 1/1 · F 2/2 |
| `on-light/status/warning` / `-subtle` | `status/warning` / `status/warning-subtle` | C 2/1 · F 12/2 |
| `on-light/status/error` / `-subtle` | `status/danger` / `status/danger-subtle` | C 8/2 · F 14/4 |

### feature/ (deep green; values from today's `on-dark/*`, same in both modes except where shown)

| Now | After | Light / Dark | Where |
|---|---|---|---|
| `on-dark/surface/brand` | `feature/surface` | emerald-800 / emerald-800 | Next Event card, accent Card, Stat strip, initials Avatar, celebration, Message (mine ✱6), Map card, Hero card |
| `on-dark/surface/secondary` | `feature/surface-secondary` ✱11 | emerald-600 / emerald-600 | New trip screens, Hero card countdown pill, Now line |
| `on-dark/surface/sunken` | `feature/surface-sunken` | white 10% | Stat tiles, `.Category icon` On feature, Next card |
| `on-dark/text/primary` | `feature/text` | white / emerald-50 | everywhere above |
| `on-dark/text/secondary` | `feature/text-secondary` | emerald-100 | |
| `on-dark/text/brand` | **deleted** (owner) | | only reached through the re-pointing |
| `on-dark/icon/primary` | `feature/icon` | white / emerald-50 | Step progress, Next card |
| `on-dark/icon/secondary` | `feature/icon-secondary` ✱1 | emerald-100 | Next card's time/place icons, journey mode icon |
| `on-dark/border/subtle` | `feature/border-subtle` ✱1 | white 20% | Next journey card's line |
| `on-dark/divider/default` | `feature/divider` | white 15% | Step progress, Next card route |
| `on-dark/border/focus` | `feature/border-focus` ✱2 | emerald-200 / emerald-300 | focus ring on deep green |
| `on-dark/status/warning` | `feature/status-warning` ✱1 | orange-200 / orange-300 | "Check-in open" on the Next card |
| `on-dark/surface/primary`, `text/brand`, `link/*`, `icon/brand`, `border/bold`, `border/brand`, `status/success*`, `status/warning-subtle`, `status/error*` | **deleted** | | only reached through the re-pointing; nothing inside a feature surface uses them |

### on-mid/, on-accent/ (deleted)

| Now | After | Why |
|---|---|---|
| `on-mid/surface/primary` (C 3: map home pin, MapView accent, /#/design sample · F 2: Map card) | `map/pin` (new; emerald-300 / emerald-300, today's Primary button values) | owner ✱7 |
| `on-mid/icon/primary` (C 3 · F 4: Icon button) | `map/pin-icon` (new; emerald-800, the pin) / `feature/icon` (the close button) | owner ✱7 |
| `on-mid/surface/sunken` (C 1 · F 4: Icon button On brand) | `feature/surface-sunken` ✱7 | |
| every other `on-mid/*` (21) | **deleted** | unused in both |
| `on-accent/surface/{yellow, orange, green, pink}` (C 4: confetti; F 14: Event card star) | **deleted** | confetti removed (A3.2); star ✱8 |
| every other `on-accent/*` (26) | **deleted** | only /#/design shows them |

### button/ (was `interactive/button/*`)

Each tone keeps `background`, `background-hover`, `background-pressed`, `text`, `icon`, `disabled-background`, `disabled-text` (was `disabled-foreground`, which also colours the icon); `border` only where used.

| Now | After | Used (C / F) |
|---|---|---|
| `interactive/button/primary/*` (7) | `button/primary/*` | all used |
| `interactive/button/inverse/neutral/*` (7) | `button/neutral/*` | all used |
| `interactive/button/inverse/brand/*` (7) | `button/inverse/*` | all used |
| `interactive/button/tertiary/*` (8, incl. `border`) | `button/tertiary/*` | all used |
| `interactive/button/ghost/*` (7) | `button/ghost/*` | all used (also by Card, Accordion, Context menu press tints) |
| `interactive/button/ghost/text-inverse`, `icon-inverse` | **deleted** | unused in both |
| `interactive/button/destructive/*` (7) | `button/destructive/*` | all used |

### control/ (was `interactive/selected/*`, `interactive/unselected/*`)

Owner ✱5: selected Chips become emerald-700 (a one-step colour change), so one `control/selected` covers them. Hover tokens kept (owner).

| Now | After | Used by |
|---|---|---|
| `interactive/selected/primary/background`, `-hover`, `-pressed`, `text` | `control/selected/background`, `-hover`, `-pressed`, `text` | Day card, Segment pill, Calendar day, **Chip (selected)** |
| `interactive/selected/primary/icon` | `control/selected/icon` | Chip's icon when selected (was secondary/icon) |
| `interactive/selected/secondary/*` (all 6) | **deleted** | Chip moves to `control/selected` |
| `interactive/selected/ghost/text`, `border`, `background-hover`, `-pressed` | `control/selected-ghost/text`, `border`, `background-hover`, `-pressed` | Tab, Segment labels |
| `interactive/selected/ghost/background`, `icon` | **deleted** | unused |
| `interactive/unselected/primary/background`, `-hover`, `-pressed`, `text`, `border` | `control/unselected/background`, `-hover`, `-pressed`, `text`, `border` | Chip |
| `interactive/unselected/primary/icon`, `text-subtle` | **deleted** | unused |
| `interactive/unselected/ghost/background`, `-hover`, `-pressed`, `text`, `border` | `control/unselected-ghost/background`, `-hover`, `-pressed`, `text`, `border` | Tab, Day card, List group rows, Event card, Icon button Secondary, Segment border |
| `interactive/unselected/ghost/icon` | `control/unselected-ghost/icon` | F 18 (Tab icons) |

### input/ (was `input/field/*`)

| Now | After | Used |
|---|---|---|
| `input/field/background` | `input/background` | C 1 · F 12 |
| `input/field/background-hover` | `input/background-hover` | C 2 · F 6 |
| `input/field/border` | `input/border` | C 1 · F 12 |
| `input/field/border-selected` | `input/border-focus` | C 2 · F 6 |
| `input/field/label` | `input/label` | C 1 · F 18 |
| `input/field/body` | `input/value` | C 1 · F 6 |
| `input/field/placeholder` | `input/placeholder` | C 2 · F 12 |
| `input/field/label-subtle` | `input/hint` | C 1 · F 18 |

### tag/ ("brand" → "category")

| Now | After | Used |
|---|---|---|
| `tag/neutral/*` | `tag/neutral/background`, `text`, `icon` | all |
| `tag/success/*`, `tag/warning/*`, `tag/danger/*` | same names | all (code doesn't use the `icon` ones yet; Figma does, except danger/icon — kept for Tag's icon slot) |
| `tag/brand/subtle/*` | `tag/category/background`, `text`, `icon` | C 2 · F 14 |
| `tag/brand/bold/*` | **deleted** | unused in both |

### category/ (`-on-dark` → `-on-feature`; `food` → `food-and-drink`)

| Now | After |
|---|---|
| `category/{travel, stays, food, activities, notes}/surface` | `category/{travel, stays, food-and-drink, activities, notes}/surface` |
| `…/icon` | `…/icon` |
| `…/surface-on-dark` | `…/surface-on-feature` |
| `…/icon-on-dark` | `…/icon-on-feature` |

All 20 used in both. Code's `categoryTone()` / `TYPE_TONE` write `food` as the CSS key; they change to `food-and-drink` (type names in code are unchanged).

### overlay/, illustration/

| Now | After | Used |
|---|---|---|
| `overlay/scrim`, `overlay/bar` | same | C 5 / C 1 · F 2 |
| `overlay/image` | **deleted** (owner) | – |
| `illustration/*` (8) | same, except `illustration/warm` **deleted** (owner; unused in both) → 7 | |
| — | `map/pin`, `map/pin-icon` (new, owner ✱7) | the map's home pin and accent |

## A4. Layout

| Now (Figma / code) | After | Used (C / F) |
|---|---|---|
| `space/default/0` / `--space-default-0` | `space/0` | C 1 · F 1,391 (auto layout gaps of 0) |
| `space/default/{100…1000}` | `space/{100…1000}` | all used except `800` F 0 (C 3), `1000` F 0 (C 2) |
| `space/default/450` (18) | `space/450` | C 2 |
| `space/default/550` (24) | **merged into `space/700`** (owner; same value) | C 2 |
| `space/negative/200` | `space/negative/200` | C 1 · F 2 |
| `--space-gutter` (code only) | `space/page/gutter` (24) | C 30 |
| `--space-stack` (code only) | `space/page/section` (40) | C 9 |
| `--space-page-top` (code only) | `space/page/top` (48) | C 3 |
| `--space-default-1000` used as the page bottom | `space/page/bottom` (96) | C 2 |
| `--space-inset` (code only, 20) | **deleted** → `space/600` | C 2 |
| `--strip-room` (code only) | stays a local `calc()` in `trip.module.css` (not a token) | C 2 |
| `radius/0` (Layout) | **deleted** | unused |
| `radius/{100…700}`, `radius/900` | same | `400` F 0 (C 1); `900` C 0, F 4 |
| `radius/800` (48) | **deleted** (owner; unused in both); then `base/radius/48` is unused too and goes | – |
| `radius/1000` | `radius/full` | C 40 · F 592 |
| — | `size/tap` (44) | was `--size-tap`, C 13 |
| — | `size/icon-small` (16), `size/icon-large` (24) | from `Icon.tsx` sizes |
| — | `size/control-small` (32), `size/control-large` (48) | was `--size-control-sm`, `--size-control` |
| — | `size/avatar-small` (24), `size/avatar-medium` (32), `size/avatar-large` (40) | Avatar CSS |
| — | `size/category-icon-small` (32), `-medium` (40), `-large` (48) | `.Category icon` CSS |
| — | `size/tab-bar` (60, rem) | was `--size-tab-bar` |
| — | `size/content-max` (480) | was `--size-content-max` |
| — | `size/{step}` (numbered scale aliasing `base/size/{px}`, like spacing; built in A7: 100 = 4 … 1900 = 560) for every other fixed size (owner) | |
| — | `border-width/thin` (1), `medium` (1.5), `thick` (2), `focus` (3) | 1px ×52, 1.5px ×3, 2px ×14, 3px ×6 in code today |

## A5. Typography

| Now (Figma / code) | After | Used |
|---|---|---|
| `font/family` / `--font-family` | `font/body` / `--font-body` | F 366 · C 10 |
| `font/display` / `--font-display` | same | F 31 · C 4 |
| `weight/{regular, medium, semibold, bold, black}` | same | all |
| `size/display` | `size/display` | |
| `size/display tiny` | `size/display-small` | |
| `size/display secondary` | **deleted** | unused in both |
| `size/heading 1` … `heading 3` | `size/heading-1` … `heading-3` | |
| — | ~~`size/heading-4`~~ not added (owner) | Heading 4 keeps `size/heading-3` (16) |
| `size/body`, `size/body small` | `size/body`, `size/body-small` | |
| line heights (1, 1.25, 1.5) | `line-height/tight` (100%), `heading` (125%), `body` (150%) | so the text styles bind them |
| Text style "Display tiny" / `.t-display-tiny`, `--type-display-tiny` | "Display small" / `.t-display-small`, `--type-display-small` | |
| Text style "Body Small" | "Body small" (code already `.t-body-small`) | |
| `--type-label`: `calc(14rem / 17)` hard-coded | `var(--size-body)` | same value |

## A6. Motion (new collection) ✱10

Code values today and what they become. Every animation keeps its exact value.

| Code now | Value | After (Figma / code) |
|---|---|---|
| `--duration-fast` | 150ms | `duration/quick` / `--duration-quick` |
| `200ms` raw (Shell tab fade) | 200ms | `duration/fade` |
| `220ms` raw (Shell settling) | 220ms | `duration/settle` |
| `--duration-base`, `250ms` raw (keyboard) | 250ms | `duration/regular` |
| `--duration-slow` | 400ms | `duration/gentle` (the prompt says 350; the code uses 400 — keeping 400) |
| `--duration-fluid` | 420ms | `duration/fluid` |
| `--duration-sheet` | 520ms | `duration/sheet` |
| `1.4s` raw (Skeleton shimmer) | 1400ms | `duration/shimmer` |
| `20ms` raw (Calendar sweep step) | 20ms | `duration/stagger` |
| `1.2s` (confetti) | — | **deleted** with the confetti |
| `--ease-standard` | cubic-bezier(0.25, 0.1, 0.25, 1) | `easing/standard` |
| `--ease-spring` | cubic-bezier(0.32, 0.72, 0, 1) | `easing/spring` |
| `--ease-fluid` | cubic-bezier(0.22, 1, 0.36, 1) | `easing/fluid` |
| `--ease-exit` | cubic-bezier(0.4, 0, 0.9, 0.5) | `easing/exit` |
| `--ease-bounce` | cubic-bezier(0.34, 1.45, 0.64, 1) | `easing/bounce` |
| `--ease-settle` | cubic-bezier(0.2, 1.12, 0.3, 1) | `easing/settle` |
| `--keyboard-motion` curve | cubic-bezier(0.17, 0.59, 0.4, 0.77) | `easing/keyboard` |
| confetti curve | cubic-bezier(0.3, 0.6, 0.5, 1) | **deleted** |
| `--motion-fast` (33 uses), `--motion-press` (14) | 150 standard | **deleted**; written as `var(--duration-quick) var(--easing-standard)` — or kept as code-only shorthands? **Recommendation:** keep them as code shorthands named after their Figma parts (`--motion-press`, `--motion-release`, `--motion-sheet`, …): Figma variables can't hold a "duration + curve" pair, and 100+ call sites would get longer for no gain. Each shorthand is defined only from Motion variables. |
| `--motion-base`, `-fluid`, `-release`, `-screen`, `-sheet`, `-sheet-out` | pairs | same as above |

## A7. Every value from a variable

Code sweep (outside `primitives.css`): no raw hex colours; `rgba()` only in the two shadows; raw lengths: `1px` ×35 (borders → `border-width/thin`), `2px` ×14, `3px` ×6 (focus → `border-width/focus`), `1.5px` ×3, and fixed sizes 16–176px (about 90).

Owner's rule for sizes: **no one-off component size tokens** (no `size/day-card`, `size/badge`, `size/grabber`, `size/skeleton-line` …). Role tokens only where a meaning is shared: `size/tap`, `size/icon-*`, `size/control-*`, `size/avatar-*`, `size/category-icon-*`, `size/tab-bar`, `size/content-max`. Every other fixed size uses a **numbered size scale**: raw values `base/size/{px}` in Base, and `size/{step}` in Layout aliasing them (the same pattern as spacing). The A7 PR lists the steps from the values the code actually uses; anything that's really layout stays a `calc()` of tokens.

Figma: the audit found unlinked values in Toast, Event card, Tile, Option card, Message, Map card, Budget card, `.Category icon` (radius), `.Context menu item`, Context menu, Accordion and Journey card. A7 links them and checks by script.

## Components whose variables or CSS change

Every component changes token names (a rename, same look). These also change structure or look:

| Component | Change | Item |
|---|---|---|
| Card (Tone Accent) | stops using `.surface-dark`; uses `feature/*` directly; `surface-dark` class removed from `Card.tsx` | A3.1 |
| Event card (State Next) | same; time/place icons, route line, status, Tag ✱1 | A3.1 |
| Tag | the plain white Tag on the Next card too, as Figma draws it (today it turns dark grey there) | A3.1 |
| `.Category icon` (Tone On dark → **On feature**) | tokens `-on-feature` | A3 |
| Stat strip, `.Stat`, Avatar (initials), Hero card, Now line, Step progress, Map card | `on-dark/*` → `feature/*` | A3.1 |
| Message (mine) | `interactive/selected/primary` → `feature/*` ✱6 | A3.1, B6 |
| Icon button (Tone On brand → On feature) | `on-mid/*` → `feature/*` ✱7 | A3.2 |
| Map card / map pin | `on-mid/surface/primary` → `map/pin`, `map/pin-icon` ✱7 | A3.2 |
| Chip, Day card, `.Tab`, `.Segment`, Calendar | `interactive/*` → `control/*`; a selected Chip becomes emerald-700 ✱5 | A3 |
| Text field (and Text area, Dropdown) | `input/field/*` → `input/*`; Label size from `size/body` | A3, A5 |
| Button, Icon button | `interactive/button/*` → `button/*` | A3 |
| Event card (Figma) | star colour ✱8 | A3.2 |
| New trip celebration | confetti removed | A3.2 |
| Every text style user | Display tiny → Display small | A5 |
| Every component with motion | `--motion-*` defined from Motion variables | A6 |
| Group headers (Components section) | broken `text/brand` ✱9 | C |
| /#/design | surface sets and on-accent previews removed; new collections shown | D |

Not compared in this pass: code's light/dark values against Figma's, value by value (names only). The A3 PR checks them by script, and any difference is reported before it's changed.

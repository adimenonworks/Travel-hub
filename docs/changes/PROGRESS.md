# Progress on the change prompts

Read this first when starting a session. If it disagrees with the code or Figma, trust the code and Figma, and update it.

## Prompt being worked on

`docs/changes/rove-change-component-library.md` (component library cleanup). The other two prompts wait until it's finished.

## Owner's decisions for this prompt (13 Nov 2026)

- One account now: work on the session's own branch; open and merge a pull request after each finished item; commit this file with each merge.
- **Design gates: stop and show before and after** for the Hero card's single cover height, the Map card and the Number card.
- Removing the visited progress bar from the Collection header (Map card merge) is approved.
- Number card: if the selected Day card and the Stat only share a name and not behaviour, keep them as two components and say why.
- Hover: remove the Hover variants in Figma; keep the `@media (hover: hover)` CSS in code (the join-only website is used with a mouse).
- Check screens at 393 × 852, and also at 320–430px with large text (23px and 33px roots).

## Items done

- **Standing rule** ("Challenge the owner's requests") in `CLAUDE.md`; "How the work is saved" replaces "Working across two accounts" in all three prompts. Pull request 99.
- **A1, tidy the canvas** (Figma only; the app is unchanged):
  - Components section `88:7142`: every set in rows by kind, each under a heading (text nodes `593:756`–`593:763`, named "Group · <kind>"): Controls · Navigation · Content & lists · Cards · Trip · People · Feedback · Media. 96px between sets, 120px between kinds, no overlaps (checked by script).
  - Icons section `109:10358` (now under Media): 92 icons A to Z in an 8-column grid, then 236 flags A to Z in a 14-column grid. A new icon or flag goes in its alphabetical place.
  - Deleted the stray instance "Sheet · edit (example)" (`558:899`).
  - New page **Backup artifacts** (`593:755`): the "Backup icons" section (`318:11532`, unchanged) and the three loose image rectangles (`442:3559`, `442:3560`, `442:3561`; archived, not deleted).
  - Section "Primtives" is now "Primitives" (`35:1719`); the second "Typography" (`35:2217`, it holds spacing and radii) is now "Spacing & radius".
  - Not done in A1: reordering the variants inside each set by size then state. The sets that A2 and A3 rename or rebuild get ordered then; check the rest at the end of A3.

- **A2, naming and glossary** (Figma and code; screens pixel-identical to Main at 393 × 852 in demo mode):
  - Renamed in Figma: Tab bar, Text field, Avatar stack, Cover scene, Day card, Page header, Bottom nav, Profile card, Hero card; **Tag** (was Tags), **Now line** (was Timeline), **Banner** (was Notification); "." parts: `.Nav item`, `.Calendar day`, `.Vote button`, `.Category icon`, `.Context menu item`.
  - **Message keeps its name:** it is placed directly on the Event screen (3 times), so it isn't nested-only.
  - Properties: Button `Variant` → `Tone`; Chip `Category` → `Type` (its one-value `Type=Action` removed), State Active/Inactive → Selected/Default; Avatar `Kind` → `Layout`, Size 24/32/40 → Small/Regular/Large; `Selected`/`Voted`/`Checked` → `State` Default/Selected (`.Tab`, `.Segment`, `.Nav item`, Day card, Option card, `.Vote button`, Switch); Text field `Type` → `Layout`; Page header `Type` → `Size` Small/Large; Skeleton `Shape` → `Layout`; Message `Sender` → `Layout`; Step progress `Step` → `State` Step 1–4; List item Size Default/Compact → Regular/Small; Banner `State` → `Tone` (Error → Danger, Brand → Accent); Toast and `.Context menu item` Error/Destructive → Danger.
  - `.Tab` and `.Segment` lost their Selected + Hover and Selected + Pressed variants (4 variants, no instances) when Selected folded into State.
  - Code: `Button tone`, `Tag` (was `Badge`), `Banner tone` (was `Notification state`), `NowLine`, `Chip selected` / `type`, `CategoryIcon type`, `Avatar size="small|regular|large"`, `ListItem size="regular|small"`, `Skeleton layout`, toast `tone: 'danger'`, context menu `tone: 'danger'`, `VoteButton selected`. `Switch` keeps `checked` (the web's own word for a switch).
  - Glossary: `DESIGN.md` ("Rove glossary") and the Figma section "Glossary" (`597:724`, right of Components).
  - Left for A3 (they are rebuilt there): Illustration / Cover scene `Name`; Tile `Tone`; Hero card `Size`; Flow screen `Step`; Option card `Type=Plain`; Tag `Tone=Category` and `Tint`; the `tone` prop on EventCard, ListItem, IdeaRow, OptionCard (A3 moves event type into `.Category icon`).
  - Not done: inner layer names inside components weren't all checked for sentence case.

- **A3, merge and remove** (one pull request per change):
  - **Tile:** Orange, Green, Yellow and Pink removed (Figma set `331:3015` is now `Add` False / True; four archived copies on the Archive page were detached so they keep their look). Code: `Tile add` replaces `tone`.
  - **Tag:** Tint removed (Figma `6:36`: Neutral, Category, Success, Warning, Danger; two archived copies detached). Code: `TagTone` has no `tint`.
<!-- next A3 item goes above this line -->

## In progress

- A3: Tag Tint next, then the rest of the table. Design gates (Hero card height, Map card, Number card) are shown to the owner before merging.

## Still to do

A3 (14 changes, one pull request each), A4, then the Check everything list.

## Figma changes so far

See A1 and A2 above. **Variant count before the cleanup: 274** (Components section, not counting icons and flags); after A2: 270.

## How to check screens

Build in demo mode (`npx vite build --mode demo --outDir <dir>`; a normal build shows only the join-only website), seed `localStorage` `triphub-demo-db` and `sessionStorage` `triphub-demo-user` with a sample trip, fix the clock, block the network, and screenshot each route with Playwright; compare against the same from Main pixel by pixel.

## Questions waiting for the owner

None.

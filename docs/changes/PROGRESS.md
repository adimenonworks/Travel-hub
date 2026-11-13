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
  - **Hover dropped (Figma only):** Button `5:122` 48 → 36 (Default / Pressed / Disabled), `.Tab` `6:60` and `.Segment` `6:96` 4 → 3, Text field `7:89` 15 → 9 (Default / Focus / Filled; Typing merged into Focus). Sets re-gridded by tone, size, then state. Code keeps its `@media (hover: hover)` CSS for the website. Noticed, not changed: several components' `:hover` rules (tabs, chips, rows, tiles, day cards) are not inside `@media (hover: hover)`, so on iPhone they can stick after a tap; and Text field's Text area variants are drawn the same height as Input in Figma.
  - **Flow screen deleted:** Figma set `354:3391` removed (5 variants). Its five variants are now plain frames on the Screens page: `600:1054`, `600:1108`, `600:1162`, `600:1216` (New trip · step 1–4) and `600:1301` (New trip · celebration); their content areas are empty, as the component's slot was. Seven copies in "Onboarding — exploration" on the Planning page were detached (same look, no longer linked). Code: `FlowScreen` and `CelebrationScreen` moved to `src/features/trip/NewTripScreens.tsx`; `Calendar` is now `src/design/components/Calendar.tsx`.
  - **Number card: not merged (decided, per the owner's rule).** Stat and Day card share only "a big number over a label". Stat is a static figure (Heading 1, on the deep green sunken panel, inside a description list); Day card is a button (Display tiny number, 64px wide growing to 88px with a spring when selected, pressed and selected states, month markers). One component would need both sets of behaviour behind a switch, which is two components with one name. Both stay.
  - **Map card** (Location card + Collection header): Figma `452:3462` renamed Map card with Title, Meta, Show trailing + Trailing (swap: star Icon button or Avatar stack), Show footer; Collection header `565:767` deleted; the Saved · Country screen uses Map card instance `604:646` ("2 of 9 visited · Saved by you"). Code: `MapCard({ map, onMap, title, meta, trailing, footer })` in `MapCard.tsx`; `LocationCard` and `CollectionHeader` are gone. The collection page lost its progress bar (approved); event page and place sheet are pixel-identical.
  - **Hero card: one component.** Figma `347:2733` (no `Size`, cover 5:2 = 342 × 137, Show people / Show heads-up / Show countdown; see the note under In progress about re-created properties). Code: `HeroCard` has no `size`; `TripHero list` leaves out people and the heads-up row for lists. Home and Trips change: every cover is 5:2 (owner's choice C).
<!-- next A3 item goes above this line -->

## In progress

- Owner's answers (13 Nov 2026): Map card OK; Hero card cover **5:2 everywhere** (option C); Search field → Text field OK; Illustration keeps `Name` (`Type` is only ever the event type).
- Hero card: **Figma is done** (see below), code next. Then Search field → Text field, Cover scene → Illustration, Card + Empty state, Page header + Trip header, Journey card, event type only in `.Category icon` (show the owner the Chip before building: a selected Chip takes the whole type colour today), Profile card → List item (only if it matches).
- Hero card in Figma: the set is now one component `347:2733` "Hero card" (cover and photo 342 × 137, no `Size`; properties Trip name, Meta, Show cover, Show photo, Photo credit, Show people, Show heads-up, Show countdown). Taking the variant out of its set wiped its property definitions, so they were re-created and re-linked; the three list cards on Screens (`501:682`, `501:700`, `545:2224`) had their name and dates restored and people turned off. **Caveat:** the other seven cards (two on Screens: `545:2257`, `500:569`; five on Planning) now show the default name and dates, which they most likely had already.

## Still to do

The rest of A3 (see In progress), A4, then the Check everything list.

## Figma changes so far

See A1 and A2 above. **Variant count before the cleanup: 274** (Components section, not counting icons and flags); after A2: 270; after Tile, Tag, Hover and Flow screen: 240.

## How to check screens

Build in demo mode (`npx vite build --mode demo --outDir <dir>`; a normal build shows only the join-only website), seed `localStorage` `triphub-demo-db` and `sessionStorage` `triphub-demo-user` with a sample trip, fix the clock, block the network, and screenshot each route with Playwright; compare against the same from Main pixel by pixel.

## Questions waiting for the owner

None.

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
  - **Search field → Text field:** Figma Text field `7:89` has Show leading icon + Leading icon (a hidden icon instance in every variant's Input); Search field `364:4193` deleted. Code: `SearchField` is gone; New trip's search is `TextField icon="pin" type="search"` (11px shorter, approved).
  - **Cover scene → Illustration:** the three Cover scene variants (`83:689` Hills, `83:700` Coast, `83:743` City) moved into the Illustration set `83:744`, which is now Size Spot / Cover × Name (12 variants); instances kept their links. `Name` stays (owner: `Type` is only the event type). Code already had one `Illustration`; comments only.
  - **Trip header → Page header:** Figma Page header `160:1684` gained Show meta + Meta (a Body line under the title row); Show icon is now Show leading icon and Show button is Show trailing. The three trip screens use Page header Small instances (`609:1117`, `609:1209`, `609:1235`); eleven Trip header copies on Planning were detached; Trip header `347:2803` deleted. Code: `PageHeader meta`; `TripHeader` is gone. Not done: a separate Back label property and a true Trailing slot (the back label is still the nested Button's label; trailing is the one Icon button, shown or hidden).
  - **Card + Empty state → Card:** Empty state `491:520` deleted (it had no instances). Card `7:96` is Tone Default / Accent × Layout Start / Centre (4 variants), with Show media, Show body, Show actions, Show second button. **Conflict found and fixed:** Figma's Card was drawn centred while the code's Card is left-aligned; Layout=Start is now left-aligned in Figma, and Centre is the empty state. Code: `EmptyState` is gone; its 13 uses are `<Card layout="centre" media={<Illustration … size={120} />} …>`.
  - **Profile card: kept (decided).** It is its own grey card with 16px padding, a Large avatar, a Heading 2 name and a chevron. A List item only matches it by gaining a Size Large built to exactly that spec and used in exactly one place, and it would also have to stop sitting inside a List group. That is the same component under another name, so nothing is saved.
  - **Journey card** (owner's answer A, 13 Nov 2026: structure only, no screen changes; the redesign is B4 of the polish prompt): Figma set `613:681` "Journey card", Layout Journey (`613:576`: a stack 8 apart (`space/default/300`) of `.Leg`, `.Stop`, `.Leg`, with Show stop) / Span (`553:762`, the old Span card, unchanged). Journey details card `421:3200` is now `.Leg`, Layover block `515:508` is now `.Stop` (none had instances). Code: `JourneyCard` (`layout="journey"` with `JourneyLeg` / `JourneyStop` children, or `layout="span"`); `JourneyDetails`, `LayoverBlock` and `SpanCard` are gone; `/#/design` shows both layouts. Flight, stay and car pages are pixel-identical to Main.
  - **Event type lives only in `.Category icon`** (owner's yes, 13 Nov 2026; Chip keeps `Type`). Figma: `.Category icon` `544:777` is Type × Size (Small 32 with the 16px icon / Regular 40 / Large 48) × Tone (Secondary: grey Neutral tile, on white; Primary: white, on a grey card; On dark: the Next card), 30 variants on a 6 × 5 grid. Event card `322:2944` 42 → 7 (Layout × State), List item `363:3757` 12 → 2, Option card `364:4192` 14 → 4 (Layout Plain / Category × State), Idea row 6 → 1 (now a plain component, `384:4242`); each nests an exposed `.Category icon` ("Category icon" layer) in place of its tile, and their own Icon property is gone (Option card keeps it for Plain). 103 instances on Screens, Planning and inside components were moved to the new structure with their type and icon; 9 copies on the Archive page were detached so they keep their look. Code: `CategoryIcon({ icon, type, size, tone })` is the one tile; `EventCard`, `ListItem`, `IdeaRow`, `OptionCard` and `PageHeader` take `type` (was `tone`). Screens match Main except anti-aliasing (≤ 6/255 per channel) and one deliberate fix (see conflicts).
  - Conflicts found: Figma's List item Small drew a 24px icon in its 32px tile while the app shrank a 24px icon to 16px (a 10.7px glyph). Both now use the Small icon (16px box, 12px glyph, the documented size): small rows' icons (Recently viewed, /#/design) are 1.3px larger. Swapping a `.Category icon`'s Icon in Figma renames the icon layer and drops its colour override, so after a swap the icon's colour must be re-applied (the old host components had the same structure); the migration re-applied it everywhere.
  - Found, not changed: the Hero card component's hidden heads-up List item (`347:2794`) and two hidden copies on Screens (`506:1663`, `514:1598`) are instances with no layers (broken); they render nothing and were left as they were.
<!-- next A3 item goes above this line -->

## In progress

- A3 merges are all done. Left before A4: update the Figma glossary block on Foundations (`597:724`) to match `DESIGN.md`, and order the variants in the sets not yet touched.
- Hero card copies: on Screens, Home's `500:569` showed the default dates under "Day 4 of 11"; now "Nov 7 – 17 · 11 days" like the same trip on Trips and Overview. "Home · during a trip" `545:2257` ("Day 3 of 10", "2 – 11 Nov · 10 days") is consistent and left as it is. The five copies on Planning still show the defaults (Planning isn't a source of truth).
- Fixed as its own PR (pull request 114): the Segment control split words at 320px (even at the default text size: "Upcoming" and "Collections"; at 375px "Collections"). Words now never split; labels shrink to fit when a word is wider than its segment.

## Still to do

The glossary block and variant order on Foundations, then A4 and the Check everything list. At the end of A3: update the "Component names" block of the glossary on Foundations (`597:724`) to match `DESIGN.md`, and order the variants in the sets not yet touched.

## Figma changes so far

See A1 and A2 above. **Variant count before the cleanup: 274** (Components section, not counting icons and flags); after A2: 270; after Tile, Tag, Hover and Flow screen: 240; after Map card, Hero card, Search field, Illustration, Page header and Card: 237 (Card gained two for Layout).

## How to check screens

Build in demo mode (`npx vite build --mode demo --outDir <dir>`; a normal build shows only the join-only website), seed `localStorage` `triphub-demo-db` and `sessionStorage` `triphub-demo-user` with a sample trip, fix the clock, block the network, and screenshot each route with Playwright; compare against the same from Main pixel by pixel.

## Notes for the polish prompt

- Consider a neutral selected Chip with only the icon coloured, so Chip can drop `Type` (the last component multiplied by event type).

## Added to the Check everything list

- [ ] Every merge so far also checked at 375 × 812 (iPhone mini / X width), not just 393 × 852.

## Questions waiting for the owner

None.

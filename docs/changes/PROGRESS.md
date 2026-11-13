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

## In progress

- A2 (naming and glossary): not started.

## Still to do

A2, A3 (14 changes, one pull request each), A4, then the Check everything list.

## Figma changes so far

See A1 above.

## Questions waiting for the owner

None.

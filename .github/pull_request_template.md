## What changed

## Figma (components never drift)
- [ ] Components built in Figma first, then code, matching 1:1 (every variant touched, icons, /#/design)
- [ ] Touched components compared side by side (Figma vs /#/design)
- [ ] Core screens on the Screens page updated if one changed in code
- [ ] Planning board redrawn from `docs/ROADMAP.md` if the roadmap changed (never edited directly)

## Docs (read first, write after)
- [ ] `docs/DECISIONS.md` and `docs/ROADMAP.md` updated (or not needed), and the reference file for the area changed is current.

## Checks
- [ ] `npm run build`
- [ ] Playwright in demo mode: 320/375/390/430px, light and dark, 23px and 33px text
- [ ] Rules tests (only if `firestore.rules` changed)

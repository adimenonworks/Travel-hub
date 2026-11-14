# Rove — change prompt: transparency setup

**What this is:** the parts of the 14 Nov 2026 transparency setup that need Claude Code. The documents themselves are already written and merged:
- `docs/ROADMAP.md` (the roadmap's source of truth);
- `docs/DECISIONS.md` (every decision and why);
- the split `CLAUDE.md`, with `docs/DESIGN-SYSTEM.md`, `docs/APP-SPEC.md` and `docs/FEEL-AND-NATIVE.md`;
- the read-first / write-after rule at the top of `CLAUDE.md`.

**Order:** run this next, then `rove-change-people-and-sharing.md`, then `rove-change-polish-and-library.md`.

**How the work is saved:** as in the other change prompts. Work on this session's own branch, and open and merge a pull request after each numbered item. Commit `docs/changes/PROGRESS.md` with each merge, and read it first when starting. Stop and ask at anything marked ⏸.

---

## 1. Read the new documents and check they hold together

1. **Read** `CLAUDE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/DESIGN-SYSTEM.md`, `docs/APP-SPEC.md`, `docs/FEEL-AND-NATIVE.md` and `PROGRESS.md`.
2. **Report any contradiction** between them, or between them and the code or Figma. Examples: a feature `ROADMAP.md` lists as Built that the code doesn't have; a rule in `CLAUDE.md` that `DESIGN-SYSTEM.md` contradicts; a decision missing from `DECISIONS.md` that `CLAUDE.md` mentions.
3. **Fix the clear-cut ones** in one pull request. ⏸ **Ask** the owner about anything that's a judgement call.
4. **Check `README.md`** describes Rove as it is now, and point it to `docs/ROADMAP.md` and `docs/DECISIONS.md`.
5. **Add one line to the PR template** (`.github/pull_request_template.md`): "`docs/DECISIONS.md` and `docs/ROADMAP.md` updated (or not needed), and the reference file for the area changed is current."

## 2. Start-up check: look and ask, never act (owner's rule, 14 Nov 2026)

Add a `SessionStart` hook in `.claude/settings.json` (committed, so it works on any computer). Check the current Claude Code hooks documentation for the exact format before writing it.

- **It only looks, and never changes files.** It runs `git fetch` for Main, then works out:
  - how many commits the local copy is behind `origin/Main`;
  - whether `CLAUDE.md` or anything in `docs/` is among the changes;
  - whether the folder has uncommitted changes;
  - which branch is checked out.
- **Up to date and clean:** it adds nothing.
- **Behind Main:** it tells Claude to say so to the owner, in plain words ("Your copy is 4 changes behind Main, including a new CLAUDE.md. Pull now?"), and to **wait for a yes** before pulling. After pulling, Claude re-reads `CLAUDE.md` if it changed.
- **Uncommitted changes:** Claude points them out first, and the owner decides what happens to them before anything is pulled.
- **Offline, or the fetch fails:** it says that it couldn't check, and carries on.
- **It must be fast** (a few seconds) and must never block a session from starting.

**Test it** in a real local session: up to date; behind Main; with an uncommitted change; offline. Report what Claude said each time.

## 3. Redraw the Figma Planning board from `docs/ROADMAP.md`

The board (page Planning, `466:552`; board `466:553`) was last updated on 11 Nov 2026 and is now out of date: it still lists per-event "who's going" and activity history as "Decided not to build".

1. **Rebuild the board's columns from `ROADMAP.md`,** in its order: **Now · Next · Later · Needs a design first · Blue sky · Decided not to build · Built**.
   - "Now" is new: one card per queued change prompt, with its summary.
   - Each card has its title and text from the file. Now, Next and Later cards have their "How we'd build it" line.
   - Column counts must be right.
2. **Replace the board's title and intro** with: "Rove roadmap: a visual copy of `docs/ROADMAP.md` in the repo. Don't edit here: change the file, then redraw this board." Include the date it was redrawn.
3. **Build it from the file's components and variables only,** like everything else. Keep it tidy and readable when zoomed out.
4. **Update the Guides panels** (How Rove is built, Dependencies and risks, Security) from the current `docs/` files.
5. **Screenshot the board,** and include it in the pull request.

## 4. Update PROGRESS.md

- Mark this prompt finished when 1–3 are done.
- Set **Next** to `docs/changes/rove-change-people-and-sharing.md`.

---

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line.

- [ ] All seven documents read; contradictions reported, clear ones fixed, judgement calls asked
- [ ] `README.md` current, pointing to `ROADMAP.md` and `DECISIONS.md`; PR template line added
- [ ] Start-up hook committed; it never changes files; tested in the four cases, with what Claude said each time
- [ ] Planning board redrawn from `ROADMAP.md` (seven columns, right counts, "don't edit here" intro, components and variables only); Guides panels current; screenshot in the pull request
- [ ] `PROGRESS.md` updated

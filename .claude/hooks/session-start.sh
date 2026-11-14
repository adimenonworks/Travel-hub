#!/bin/bash
# Rove start-up check (owner's rule, 14 Nov 2026): it only LOOKS and never changes files.
# It fetches Main from GitHub (which updates git's copy of GitHub's Main, never your files or branches),
# then tells Claude whether this copy is behind, has uncommitted changes, and which branch is checked out.
# Up to date and clean: it prints nothing. It always exits 0, so it can never stop a session starting.

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

notes=()

# Fetch Main, giving up after 5 seconds (perl's alarm, since macOS has no `timeout`). Never asks for a password.
if GIT_TERMINAL_PROMPT=0 perl -e '$p = fork // exit 1; exec @ARGV unless $p; $SIG{ALRM} = sub { kill 9, $p; exit 1 }; alarm 5; waitpid $p, 0; exit($? >> 8)' \
     git fetch --quiet --no-tags origin Main >/dev/null 2>&1; then
  behind=$(git rev-list --count Main..origin/Main 2>/dev/null || echo 0)
  if [ "${behind:-0}" -gt 0 ]; then
    prs=$(git rev-list --count --merges --first-parent Main..origin/Main 2>/dev/null || echo 0)
    docs=$(git diff --name-only Main...origin/Main 2>/dev/null | grep -E '^(CLAUDE\.md|docs/)' | head -8 | tr '\n' ',' | sed 's/,$//; s/,/, /g')
    changes=$prs; [ "${changes:-0}" -gt 0 ] || changes=$behind
    line="Rove start-up check: the local Main is behind GitHub's Main by $changes change(s) ($prs merged pull request(s), $behind commit(s))."
    [ -n "$docs" ] && line="$line Changed among them: $docs."
    line="$line Per the owner's rule in CLAUDE.md, tell the owner this in plain words (for example \"Your copy is $changes change(s) behind Main"
    case "$docs" in *CLAUDE.md*) line="$line, including a new CLAUDE.md";; esac
    line="$line. Pull now?\") and wait for a yes before pulling. After pulling, re-read CLAUDE.md if it changed."
    notes+=("$line")
  fi
else
  notes+=("Rove start-up check: couldn't reach GitHub (offline, or the fetch failed or took over 5 seconds), so it's unknown whether this copy is behind Main. Mention this to the owner briefly and carry on.")
fi

dirty=$(git status --porcelain 2>/dev/null)
if [ -n "$dirty" ]; then
  count=$(printf '%s\n' "$dirty" | wc -l | tr -d ' ')
  files=$(printf '%s\n' "$dirty" | head -10 | cut -c4- | tr '\n' ',' | sed 's/,$//; s/,/, /g')
  notes+=("Rove start-up check: the folder has $count uncommitted change(s): $files. Point these out to the owner first; the owner decides what happens to them before anything is pulled.")
fi

branch=$(git branch --show-current 2>/dev/null)
if [ ${#notes[@]} -gt 0 ]; then
  notes+=("Rove start-up check: the checked-out branch is ${branch:-a detached HEAD (no branch)}.")
  printf '%s\n' "${notes[@]}"
fi
exit 0

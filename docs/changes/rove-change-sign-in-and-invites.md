# Rove — change prompt: sign-in and invites

**Sources of truth:** the Figma file `cXoK1GzmzgqY0cmcgJw66W` and the code on Main. Decided with the owner on 14 Nov 2026.

**Run it straight after the people change, before the polish prompt** (owner, 14 Nov 2026). The people change is `rove-change-people-and-sharing.md`. It builds on that prompt's roles, its Notification centre (item 4) and its privacy rules.

**What this changes:**
- **Part A, buildable now:** joining becomes **asking to join**, approved by a traveller. Invite links show a **rich preview card** with only the trip's name and dates. People who install Rove from a link are told to **tap the link again**.
- **Part B, needs the Apple Developer Program:** **Sign in with Apple** next to Google, and **Universal Links** (invite links open the app directly).

**Not in this prompt:**
- Email sign-in with a code goes to **Later**. There's no magic link and no email-and-password sign-in.
- Lock-screen push for join requests waits for Notifications push (Later). The in-app entries are shaped so they can be sent as push.
- Collection invites and **guest links** (the people change's item 9, one event only) keep joining straight in (owner, 14 Nov 2026). Only trip links ask to join.

## How to work

The "How to work" and "How the work is saved" sections of `rove-change-people-and-sharing.md` apply here too:
- read first;
- Figma first, then code, with new screens on a new Screens section **"Sign-in & invites — draft"**;
- one pull request per numbered item, merged when checks pass;
- keep `PROGRESS.md` current;
- stop and ask when something is unclear or conflicts.

**Design gate:** the preview card image (item 2) is designed by the owner in Figma. Stop and ask for it. Don't invent it.

---

# Part A — now

## 1. Asking to join

This **replaces** the people change's straight join (item 1's "Join trip" button). Rove's links are sent to chosen people, but they get forwarded. Anyone on a trip can see booking references, and a booking reference with a surname can change a booking. So nobody joins a trip until a traveller says yes.

**The role is set by the sender, never the joiner** (owner's rule, 14 Nov 2026).
- Add people already asks Travelling or Following before making the link, and the link carries the role. Keep that.
- Each trip has **one link per role**.
- The joiner never chooses or changes their role.

**Joining happens in the app, not on the website.**
- The website no longer signs anyone in to join a trip.
- A trip link's web page (item 2) shows the card, **Open in Rove** and **Get Rove**, plus the tap-again line (item 3).
- This keeps one sign-in, in the app. A person who signed in on the website with Google and in the app with Apple would otherwise end up with two accounts.

**The joiner's flow in the app:**
1. The link opens the join screen, through `rove://go?path=/join/<code>` now, or a Universal Link in Part B. If they're not signed in, sign-in comes first, with the line "Sign in to ask to join".
2. The join screen shows the trip card, with name and dates only.
   - Travelling link: "<Name> invited you to travel on <trip>".
   - Following link: "<Name> invited you to follow <trip>".
   - One Primary button: **Ask to join**.
3. Then a calm waiting state: "We've let the travellers on <trip> know. You'll get in as soon as one of them says yes." It has a **Cancel request** button.
4. Home shows a **"Waiting to join <trip>"** row until the request is answered.
5. **Approved:** a Notification centre entry, "You're in: <trip>". The trip appears on Home and Trips as usual.
6. **Declined:** the waiting row goes, and the joiner gets a gentle entry: "Your request to join <trip> wasn't accepted." Don't say who declined.
7. **Edge cases:**
   - Already on the trip: open the trip.
   - Already waiting: show the waiting state.
   - Link expired, reset or not found: the existing "This link has expired" / "Link not found" copy.

**The travellers' side:**
- **Only travellers can approve or decline** (owner's rule, 14 Nov 2026). Followers never see requests.
- Every traveller gets a Notification centre entry: "<Name> wants to join <trip> as a traveller" (or "as a follower"). It has no buttons (notifications never do, owner's rule, 15 Nov 2026); tapping it opens the People tab.
- The People tab shows a **"Waiting to join"** group at the top for travellers, with **Approve** and **Decline** on each row.
- **The first answer counts.**
  - The entry turns into "<Traveller> approved <Name>" (or declined) for everyone else, and the row leaves Waiting to join.
  - Approving adds the person with the link's role. It also gives the usual "<Name> joined <trip>" entry.
- Approve and Decline both get the Undo toast (about 6 seconds). Undoing an approval removes the person and puts the request back.

**Resetting the links:**
- Any traveller can tap **Reset invite links** in the Add people sheet.
- It makes new links for both roles, and the old ones stop working straight away.
- Requests already waiting stay.

**Data and rules** (with tests in `tests/rules`):
- Requests live at `trips/{tripId}/requests/{uid}`: `{ uid, name, photo, role, code, at }`.
- **The requester:**
  - creates only their own request;
  - the role and code must match a live, unexpired invite for that trip;
  - can read and delete (cancel) their own request;
  - reads nothing else on the trip until approved.
- **Travellers** read every request. Approving is one batch: add the member with the request's role, then delete the request. Declining deletes it.
- **Followers** can't read or change requests.
- Joining a trip without a request is no longer allowed. Remove the old straight-join path from the rules. Keep it for collection links and guest links.
- Requests older than 30 days are ignored and can be deleted by anyone on the trip.

## 2. The rich preview card

When a link is sent in Messages, WhatsApp or email, it shows as a card: a Rove image, the trip's name and its dates. **Nothing private:** no people, places beyond the trip's own name, prices or bookings (owner's rule, 14 Nov 2026).

**Why a new address:**
- Message apps build the card by reading tags in the link's web page. They don't run the page's code.
- They also never see anything after the `#` in today's links (`…/Travel-hub/#/join/<code>`).
- So the card needs a page that answers with the right tags for each link.

**How:**
- **Invite links become `https://rove-api.adimenon9.workers.dev/join/<code>`,** served by Rove's small server (`server/worker.js`).
- `GET /join/:code` answers with a small HTML page containing:
  - `og:title`: "Join <trip> on Rove";
  - `og:description`: the dates, e.g. "12–24 Mar 2027" (or "Dates to be decided");
  - `og:image`: the card image (1200 × 630 PNG), with `twitter:card` `summary_large_image`;
  - a script redirect to the existing join page (`PUBLIC_SITE#/join/<code>`) for people. Use a script, not a meta refresh, because some link readers follow meta refreshes.
- A link that's expired, reset or unknown gets a plain "This link no longer works" card, with no trip details.
- **The preview's data:**
  - When an invite is made, the app also writes `invitePreviews/{code}`: `{ tripName, startDate, endDate, expiresAt }`.
  - The rules allow anyone to `get` one (no `list`), and only the invite's creator to write or delete it. Resetting the links deletes the old previews.
  - The Worker reads them through the Firestore REST API, with no key beyond the public web config, and caches each one for 5 minutes.
- Old links (`…/Travel-hub/#/join/<code>`) keep working.
- Add the route to `node server/worker.test.mjs`, and add the redeploy steps to `server/README.md`. The owner redeploys the Worker by pasting it, as usual.
- **The card image:**
  - the owner designs it in Figma (the "Airbnb-style invite" card, moving from Next into this prompt);
  - export it as a PNG and serve it from the Worker or the website;
  - one image for every trip in this version. The trip's name and dates are the card's text.
  - A per-trip image with the name drawn into it is Blue sky (it needs an image renderer on the server).
- **Update `SECURITY.md`:** `invitePreviews` is public on purpose and holds only a trip's name and dates.

**About the address:** `workers.dev` shows in small print under the card. A custom domain (about A$15–25 a year, in Cloudflare) would look more trustworthy and would carry over to Universal Links. That's the owner's choice and not needed for this prompt. Write it as a Next item.

## 3. "Tap the link again"

Without Universal Links, a freshly installed app doesn't know which link brought the person there.
- The join web page and the Get Rove page say, under Get Rove: **"Just installed Rove? Open it once, then come back and tap your invite link again."**
- Home's empty state (signed in, no trips) adds the line: "Got an invite link? Tap it again to join."
- Once Universal Links work (item 5), keep the lines: they're still true for anyone who installs from the App Store page.

---

# Part B — needs the Apple Developer Program

**Check first:** if the owner hasn't joined the Apple Developer Program (about A$149 a year, already on the pre-launch list), stop here and say so. Sign in with Apple and Associated Domains can't be turned on without it.

## 4. Sign in with Apple

The App Store requires it alongside Google (guideline 4.8, Login services). It's also the most natural sign-in on an iPhone.
- **Sign-in screen:**
  - Apple and Google buttons, the same size and equally prominent;
  - Apple first, as on most iPhone apps;
  - follow Apple's button rules: black in light mode, white in dark mode, Apple's wording and logo.
  - Figma first: add them to the sign-in screen on the draft section.
- **Native flow:**
  - use `@capgo/capacitor-social-login`'s Apple provider. Check that the pinned version supports it, and update only to a release at least two weeks old;
  - hand Apple's ID token and the raw nonce to Firebase: `OAuthProvider('apple.com').credential({ idToken, rawNonce })` → `signInWithCredential`, as Google does now.
- **Name:** Apple sends the person's name only the first time they sign in. Save it to their profile then. If it's missing, ask for a first name once.
- **Hidden email:** people may share an Apple relay address. Nothing in Rove depends on email, because invites are links.
- **One person, one account:**
  - keep Firebase's "one account per email address" setting;
  - when an Apple sign-in hits an email already used by a Google account, tell the person to sign in with Google, then link Apple to that account (`linkWithCredential`), so they never end up with two accounts.
- **Delete account:**
  - Apple requires apps to revoke the Apple sign-in when an account is deleted;
  - ask for a fresh Apple sign-in at deletion, and use its authorisation code with Firebase's `revokeAccessToken`;
  - check the plugin returns the code.
- **The owner does:**
  1. Xcode → Signing & Capabilities → **+ Sign in with Apple**.
  2. Firebase console → Authentication → Sign-in method → **Apple** → Enable. iPhone-only needs no Services ID.
- Update `CLAUDE.md` (Stack), `HOW-ROVE-IS-BUILT.md` and `DEPENDENCIES-AND-RISKS.md` (take Sign in with Apple off the pre-launch list).

## 5. Universal Links

This moves the existing Later item into this prompt, because the new link address makes it simple.
- The Worker serves `/.well-known/apple-app-site-association`, matching `/join/*`, for the app `<TeamID>.com.adimenon.rove`. Add its test.
- Xcode: Associated Domains `applinks:rove-api.adimenon9.workers.dev`. The owner flips the switch.
- With Rove installed, tapping an invite link opens the app's join screen straight away. Handle it in `native.ts` next to `onOpenPath`.
- Without Rove, the link opens the web page as before.

---

## Write after

- **`DECISIONS.md`**, one dated entry each:
  - joining is asking to join, and only travellers approve; the role is set by the sender;
  - joining happens in the app; the website no longer signs people in to join trips;
  - invite previews show only the trip's name and dates;
  - on events you're not in, you see only the title, time, place and who's in;
  - sign-in is Google and Apple only, with no email and password and no magic link; email with a code is Later.
- **`ROADMAP.md`:**
  - add this prompt to **Now**, after the people change and before the polish prompt;
  - remove "Airbnb-style invite" from Next and Universal Links from Later (both are in here);
  - add **"Sign in with an email code"** to Later. How we'd build it: a code emailed by Rove's server, checked there, then a Firebase custom token, which needs a service account key as a Worker secret and an email service. Medium;
  - add **"A Rove web address"** to Next (a custom domain for links). Small, about A$15–25 a year;
  - add **"Per-trip invite card image"** to Blue sky.
  - Then redraw the Planning board.
- `APP-SPEC.md`: joining, the People tab's Waiting to join group, sign-in.
- `SECURITY.md`: requests, `invitePreviews`, Apple sign-in.

## Check everything

Report ✅, ❌ (with the reason) or ⚠️ (done, with a caveat) on every line.

- [ ] A trip link opens the join screen in the app, with the role from the link; the joiner can't choose a role
- [ ] Ask to join → waiting state and a Home row; Cancel request removes it
- [ ] Every traveller gets the request in the Notification centre (no buttons; it opens People) and in People's Waiting to join with Approve and Decline; followers never see it (rules emulator)
- [ ] The first Approve adds the person with the link's role; the others see who answered; Undo works
- [ ] Decline removes the request; the joiner gets the gentle entry, with no name
- [ ] Before approval, the requester can read nothing on the trip but their own request (rules emulator)
- [ ] Joining without a request is refused by the rules; collection links and guest links still join straight in
- [ ] Reset invite links makes both old links stop working, and their previews give "This link no longer works"
- [ ] A link sent in Messages shows the card with only the trip's name and dates; an expired link shows no trip details
- [ ] Old `#/join/` links still work
- [ ] The tap-again line shows on the join page, Get Rove and Home's empty state
- [ ] Part B stopped if the Apple Developer Program isn't set up
- [ ] Sign in with Apple works on a phone; the name is saved the first time; an Apple sign-in with a Google account's email links instead of duplicating
- [ ] Deleting an account revokes the Apple sign-in
- [ ] With Rove installed, tapping an invite link opens the app straight to the join screen
- [ ] Figma drafts for the join screen, waiting state, Waiting to join group, sign-in screen and the owner's card image; docs updated as in Write after
- [ ] Report: what changed per item, anything not done and why, and every conflict found between the code, Figma and this file

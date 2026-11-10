# Security in Rove: how people's data is kept safe

A plain-spoken review (10 Nov 2026) of what Rove protects, how it does it, and what to watch. Rove holds people's
travel plans (where and when they'll be away), their saved places and their names, so it should be treated as
personal data.

---

## 1. The short version

- **Only people on a trip can see that trip.** This is enforced by the database itself (Firestore security rules),
  not just by the app. A modified app, or someone calling the database directly, gets the same answer: no.
- **No passwords.** Sign-in is Google's. Rove never sees or stores a password.
- **Secret keys never ship in the app.** The Unsplash and flight-data keys live only in the Cloudflare Worker.
- **Your private details stay private.** Home city, places you've visited, your currency and what you've read are in a
  private profile that only you can read.
- **Invites expire.** An invite link works for 14 days, and its code is 12 random characters (impossible to guess).

---

## 2. How each part is protected

### Signing in
- Google sign-in hands Firebase a short-lived token. Firebase checks it, and every database request carries your
  identity.
- The Firebase web config in `.env.production` is **public by design**. It only says which project to talk to. It
  is not a key, and the security rules are what protect the data.

### The database rules (`firestore.rules`)
| Data | Who can read | Who can change |
|---|---|---|
| A trip | Its members only | Owner and organisers (they can't remove the owner or change ownership; only the owner, deleting their account, hands it to another member) |
| A trip's events, ideas, albums | Members | Members add and update; only whoever added it, or an organiser, deletes it |
| A trip's comments | Members | Only the author edits or deletes; at most 150 characters |
| Joining a trip | – | Someone with a valid, unexpired invite. They can only add themselves, as a member |
| Leaving a trip | – | A member (not the owner) removes only themselves |
| Deleting a trip | – | The owner only |
| Public profile (name, photo) | Anyone signed in, one person at a time, by ID (nobody can list all users) | You; only `name` and `photo` are allowed |
| Private profile (home, visited, currency, reads) | You only | You only |
| Saved places | You, and people you've added the place to a trip with (read by ID). Lists only ever return your own or ones you starred | You (deleting your account hands one a trip uses to someone on that trip). Others can only add or remove their own star |
| Invites | Anyone signed in, by code (no listing) | Created by the trip's owner/organisers; deleted by whoever made it |

The rules have their own automated tests (`tests/rules/`). Run them whenever the rules change.

### Rove's small server (the Worker)
- It keeps the keys as Cloudflare secrets: they are never in the code, the app or GitHub.
- It only answers three things (`/cover`, `/cover/download`, `/flight`) and checks the inputs: flight numbers and
  dates must have the right shape, and download pings must point at Unsplash.
- Browsers may only read its answers from Rove's own origins (`capacitor://localhost`, the old website, localhost
  for testing). This is CORS [the browser rule for which sites may read a server's answers].

### Inside the app
- **Nothing anyone types is turned into code.** React displays all text (comments, notes, link titles) as plain text,
  so a comment can't inject a script. The one place that decodes page titles uses a detached text box, which never
  runs code.
- **Links open safely.** External links open outside the app (`noreferrer`), so other sites can't control Rove's
  window.
- **Link reading** (Save a place) only extracts the title, an `https://` image and a place name; the rest is ignored.
- **Cover photos** you upload are shrunk on the phone. The rules only accept a JPEG/WebP image under 500 KB.
- **The clipboard** is only read when you tap Paste (iOS shows its permission bubble then).
- **The share extension** only passes a link into the Save a place sheet; nothing is saved until you press Save.

---

## 3. Things to watch, and what to do (in priority order)

1. **Done (10 Nov): trip content rules.** Comments can only be edited or deleted by their author (max 150 characters);
   events, ideas and albums can only be deleted by whoever added them or an organiser; titles ≤ 200, notes ≤ 2,000
   characters. Covered by tests in `tests/rules`. Takes effect once the rules are published in the Firebase console.
2. **Members can still edit each other's events and ideas** (on purpose: planning together, voting). If that's ever a
   problem, limit updates to the author and organisers, except votes and "who's going".
3. **Skipped for now (10 Nov): the Worker can be called by anyone who knows its address.** That can't leak data, but it
   can use up the Unsplash and flight quotas. *Fix later:* a Cloudflare rate-limiting rule, and optionally require a
   Firebase sign-in token. On the Planning page under Later.
4. **Skipped for now (10 Nov): no App Check.** [Firebase's way to prove a request comes from the real Rove app.] The
   rules still protect the data, but App Check stops scripts from hammering the database. *Fix later:* App Check with
   App Attest for iOS, before launch. On the Planning page under Later.
5. **Done (10 Nov): account deletion.** You → Delete account, after an "are you sure?" sheet. Trips you own go to the
   next member (or are deleted if you're alone); you leave the others and your messages are deleted; saved places a
   trip uses go to someone on that trip, the rest are deleted; then your profile, private settings and the sign-in
   (Google confirms it's you first). The rules allow exactly this hand-over (`handingOver` on trips, `handedOver` on
   places, via a trip you're both on) and nothing more; tests in `tests/rules`. Takes effect once the rules are published.
6. **Saved places can be read by ID by anyone signed in.** IDs are random and only shared through trips, so this is
   low risk. If a place's notes ever become sensitive, limit reads to the owner and trip-mates.
7. **Done (10 Nov): privacy policy.** In the app (You → Privacy policy) and in `src/features/profile/Privacy.tsx`. It
   lists every service that receives data. The App Store also needs it at a public web address: publish it before
   submitting. Keep it true whenever Rove starts sending data somewhere new.
8. **Old data after deleting a trip** stays in Firestore (unreachable) until a clean-up job is added. Mention it in the
   privacy policy, or add the job.

---

## 4. Habits that keep Rove safe

- Never put a secret key in the app, `.env.production` or GitHub. Keys go in the Worker's secrets.
- Change `firestore.rules` only with tests (`tests/rules`), and re-publish in the Firebase console afterwards.
- Never render text as HTML. Avoid `dangerouslySetInnerHTML`.
- Update dependencies regularly (`npm outdated`), together, and to releases at least two weeks old.
- Before launch: publish the rules, App Check, the Worker rate limit, and the privacy policy at a public web address.

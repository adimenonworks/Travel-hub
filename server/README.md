# Rove's small server (Cloudflare Worker)

`worker.js` is one file that runs on Cloudflare's free plan. It keeps the Unsplash and RapidAPI keys secret (they never go in the app or this repo) and does three things:

| Address | What it does |
| --- | --- |
| `GET /cover?q=Lisbon Portugal` | Finds one landscape photo of the place on Unsplash (cached for a day) |
| `POST /cover/download` | Tells Unsplash a photo was chosen (their rules require it) |
| `GET /flight?number=TP1946&date=2026-11-05` | A flight's live status from AeroDataBox (cached for 10 minutes) |

Test the adapters any time: `node server/worker.test.mjs`.

## Setting it up (once, about 10 minutes)

You need: a Cloudflare account (free), your Unsplash **Access Key**, and a RapidAPI key subscribed to **AeroDataBox** (the free Basic plan).

1. Go to dash.cloudflare.com and sign up or log in (free plan).
2. In the left menu click **Workers & Pages**, then **Create**, then **Create Worker**.
3. Name it `rove-api` and click **Deploy**.
4. Click **Edit code**. Select everything in the editor and delete it.
5. Paste the whole of `server/worker.js` and click **Deploy**.
6. Go back to the worker, open **Settings**, then **Variables and Secrets**, then **Add**:
   - Type **Secret**, name `UNSPLASH_ACCESS_KEY`, value: your Unsplash Access Key. **Save**.
   - Type **Secret**, name `RAPIDAPI_KEY`, value: your RapidAPI key. **Save**.
7. Copy the worker's address (it looks like `https://rove-api.<your-name>.workers.dev`) and send it to Claude. Claude puts it in `.env.production` as `VITE_API_BASE` and publishes.

Until step 7, the app works the same but shows illustrations instead of photos and no live flight status.

## Unsplash production approval

Demo keys allow 50 requests an hour (the worker caches each place for a day, so that's plenty to start). To get about 1,000 an hour, apply for production on unsplash.com/oauth/applications with screenshots of a trip cover and its credit. The app already does what their checklist asks: it hotlinks the photo, triggers the download when a photo is chosen, credits "Photo by <name> on Unsplash" with both names linked, and doesn't use Unsplash's logo or a similar name.

# Deck Request Form (v1 — starter for Cursor)

A custom multi-step replacement for the Notion "Build a Deck" form, built
to do the things Notion's native form can't: conditional slide options
and a gallery view.

## What's here

- `index.html` — wizard structure (4 steps)
- `style.css` — styling
- `config.js` — **the file you'll actually want to edit.** Pitch options,
  slide catalog, and the rule that decides which slides show up based on
  what's being pitched all live here.
- `app.js` — wizard mechanics (step nav, rendering, submission). Shouldn't
  need much editing unless you're changing how the wizard *behaves*
  rather than *what's in it*.

## Running it locally

No build step — it's plain HTML/CSS/JS. Just open `index.html` in a
browser, or serve the folder with anything simple:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How submission works

Reuses the same Cloudflare Worker as the Figma plugin
(`worker.js`) — it now has a third action, `create`,
alongside the existing `query` and `update`. The form POSTs the wizard's
answers to that Worker, which creates a new page in the Decks database
via the Notion API server-side (same CORS reasoning as before — Notion
won't accept direct browser calls).

### One-time: deploy the Worker (required)

The live Worker must include the `create` handler. If submit fails with
`Unknown action "create"`, the deployed code is still the old version.

**Option A — Cloudflare dashboard (fastest)**

1. Open [Cloudflare Workers](https://dash.cloudflare.com/) → **deck-builder**
2. **Edit code** → select all → paste in `worker.js` from this repo
3. **Deploy**
4. Confirm **Settings → Variables**: `NOTION_TOKEN` (secret) and
   `NOTION_DATA_SOURCE_ID` = `3b4f9ba0-53c5-8009-8827-000b79126ae6`

**Option B — Wrangler CLI**

```bash
npm install
npx wrangler login
npx wrangler deploy
# NOTION_TOKEN should already be set as a secret on the Worker
```

**Verify**

```bash
npm run test:create
# Expect HTTP 200 and { "ok": true, "url": "https://notion.so/..." }
```

### One-time: Notion requester column

Add one column to the Decks database:

| Name | Type |
|------|------|
| **Request** | Email |

The form passes the submitter's `@smallest.ai` email into the **Request** column. Redeploy `worker.js` after Worker changes.

## Known gaps / next steps for Cursor

1. **Gallery thumbnails are placeholders.** Export real slide images from
   Master Deck (Figma → File → Export, or screenshot each slide), drop
   them in `assets/`, and fill in the `thumb` path per slide in
   `config.js`. That's the only change needed — the gallery rendering
   already handles a real image vs. a text placeholder.
2. **Conditional logic is a simple substring rule** (see
   `getAvailableSlides` in `config.js`) — pitch containing "STT" shows
   Pulse slides, etc., with "Overview desk"/"Agents" showing everything.
   Adjust this function directly if the real business logic is more
   nuanced than that.
3. **No duplicate-submission protection, no auth** — anyone with the link
   can submit. Fine for an internal GTM-only tool; worth adding a check
   if this ever goes further.
4. **Not yet hosted anywhere.** Cloudflare Pages (free, same account you
   already have for the Worker) is the path of least resistance — drag
   this folder into a Pages project and it's live. Alternatively, wire
   it into your existing marketing site if you want it under your own
   domain.
5. **Hasn't been tested end-to-end.** Worth running through it once,
   checking the created Notion row looks right, before handing it to
   the wider GTM team.

# Boarding Pass to Forever · Yannick & Reana

An interactive "boarding story" wedding invitation (recreated from the Claude Design
`Y&R Airways boarding pass` handoff), backed by a SQLite database and a private admin
page so you can see exactly who has RSVP'd.

Guests tap through a 7-scene sequence — cover → boarding pass → now boarding →
mystery destination → 3·2·1 countdown → **wedding video reveal** → arrival in
**Mauritius, 20 Mar 2027**, with the itinerary, add-to-calendar, and the RSVP form.

## Run it

```bash
npm install
npm start
```

Then open:

- **Invitation:** http://localhost:3000/
- **Admin (who RSVP'd):** http://localhost:3000/admin

## Languages

The very first screen is a language gate with two buttons — **English** and **Shqip
(Albanian)**. Choosing one translates the entire invitation (every screen, the RSVP
form, and its messages). To edit or add wording, see the `I18N` dictionary near the top
of the `<script>` in `index.html` — each language is one object of
`key: 'text'` pairs. The guest's chosen language is saved with their RSVP and shown in
the admin table.

## Responsive

The invitation fills the whole viewport and is fluid from **Samsung's 360 px-wide
screens** up through **iPhone 15 Pro Max (430 px)** and beyond — using
container-relative type (`cqw`), `100dvh`, and `env(safe-area-inset-*)` for notches
and home indicators. On tablets/desktop it shows as a centered phone frame.

## Admin login

The admin page is protected with HTTP Basic Auth. Defaults:

- user: `admin`
- password: `wedding`

Change them (recommended before sharing) with environment variables:

```bash
ADMIN_USER=yannick ADMIN_PASS=some-secret PORT=3000 npm start
```

## Where the data lives

Every RSVP is stored in **`rsvps.db`** (SQLite). The form captures name, attending
(yes/no), party size (Just me / Me + 1), and an optional message.

- View them in the admin table at `/admin`.
- Download everything as a spreadsheet via **Download CSV** (`/admin/export.csv`).
- Or query directly: `sqlite3 rsvps.db "SELECT name, guests, attending, message FROM rsvps;"`

## Files

- `index.html` — the invitation (vanilla HTML/CSS/JS recreation of the design).
- `server.js` — Express server: serves the page, the `/api/rsvp` endpoint, `/admin`, and the video.
- `uploads/wedding_video_lower_res.mp4` — the reveal video (served with HTTP range support).
- `rsvps.db` — SQLite database (git-ignored, created on first run).

`rsvps.db` and `node_modules/` are git-ignored so your guest data isn't committed.

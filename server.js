'use strict';

const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
// Admin credentials — override via env vars for anything public.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'wedding';

// --- Database setup ---
const db = new Database(path.join(__dirname, 'rsvps.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT,
    guests     INTEGER NOT NULL DEFAULT 1,
    attending  TEXT NOT NULL DEFAULT 'yes',
    meal       TEXT,
    message    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertRsvp = db.prepare(`
  INSERT INTO rsvps (name, email, guests, attending, meal, message)
  VALUES (@name, @email, @guests, @attending, @meal, @message)
`);
const allRsvps = db.prepare(`SELECT * FROM rsvps ORDER BY created_at DESC`);

// --- App ---
const app = express();
app.use(express.json());

// Serve the wedding video (and any other uploads) statically.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res) => res.set('Accept-Ranges', 'bytes')
}));

// Serve the invitation at /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Boarding Pass to Forever.html'));
});

// RSVP submission
app.post('/api/rsvp', (req, res) => {
  const b = req.body || {};
  const name = (b.name || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  let guests = parseInt(b.guests, 10);
  if (!Number.isFinite(guests) || guests < 1) guests = 1;
  if (guests > 20) guests = 20;

  const attending = b.attending === 'no' ? 'no' : 'yes';

  try {
    const info = insertRsvp.run({
      name: name.slice(0, 200),
      email: (b.email || '').toString().trim().slice(0, 200) || null,
      guests,
      attending,
      meal: (b.meal || '').toString().trim().slice(0, 100) || null,
      message: (b.message || '').toString().trim().slice(0, 2000) || null
    });
    return res.json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error('RSVP insert failed:', err);
    return res.status(500).json({ error: 'Could not save your RSVP. Please try again.' });
  }
});

// --- Admin (HTTP Basic Auth) ---
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="RSVP Admin"');
  return res.status(401).send('Authentication required.');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.get('/admin', requireAuth, (req, res) => {
  const rows = allRsvps.all();
  const yes = rows.filter(r => r.attending === 'yes');
  const totalGuests = yes.reduce((n, r) => n + (r.guests || 0), 0);
  const noCount = rows.filter(r => r.attending === 'no').length;

  const tableRows = rows.map(r => `
    <tr class="${r.attending === 'no' ? 'declined' : ''}">
      <td>${esc(r.name)}</td>
      <td><span class="pill ${r.attending}">${r.attending === 'yes' ? 'Attending' : 'Declined'}</span></td>
      <td class="num">${esc(r.guests)}</td>
      <td>${esc(r.meal) || '—'}</td>
      <td>${esc(r.email) || '—'}</td>
      <td>${esc(r.message) || ''}</td>
      <td class="date">${esc(r.created_at)}</td>
    </tr>`).join('');

  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>RSVP Admin — Boarding Pass to Forever</title>
<style>
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; margin: 0;
    background: #f6f3ec; color: #1c2b3a; padding: 32px; }
  .wrap { max-width: 1100px; margin: 0 auto; }
  h1 { font-family: Georgia, serif; font-weight: 400; margin: 0 0 4px; }
  .sub { color: #7a8894; margin: 0 0 24px; letter-spacing: .04em; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
  .stat { background: #fff; border-radius: 14px; padding: 16px 22px; box-shadow: 0 10px 24px -18px rgba(0,0,0,.4); }
  .stat .n { font-size: 30px; font-weight: 700; }
  .stat .l { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #a8842f; }
  .bar { display: flex; gap: 10px; margin-bottom: 16px; }
  a.btn { text-decoration: none; background: #a8842f; color: #fff; padding: 10px 16px;
    border-radius: 10px; font-size: 13px; letter-spacing: .06em; }
  table { width: 100%; border-collapse: collapse; background: #fff;
    border-radius: 14px; overflow: hidden; box-shadow: 0 10px 24px -18px rgba(0,0,0,.4); }
  th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
  th { background: #faf6ee; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #a8842f; }
  tr.declined { opacity: .6; }
  td.num, td.date { white-space: nowrap; }
  td.date { color: #9aa6b0; font-size: 12px; }
  .pill { font-size: 11px; padding: 3px 9px; border-radius: 999px; letter-spacing: .04em; }
  .pill.yes { background: #dff1e4; color: #2f7d4f; }
  .pill.no { background: #f7e0dc; color: #b3402f; }
  .empty { text-align: center; padding: 40px; color: #9aa6b0; }
</style></head>
<body><div class="wrap">
  <h1>RSVP Admin</h1>
  <p class="sub">Boarding Pass to Forever · Emma &amp; James</p>
  <div class="stats">
    <div class="stat"><div class="n">${rows.length}</div><div class="l">Responses</div></div>
    <div class="stat"><div class="n">${yes.length}</div><div class="l">Parties Attending</div></div>
    <div class="stat"><div class="n">${totalGuests}</div><div class="l">Total Guests</div></div>
    <div class="stat"><div class="n">${noCount}</div><div class="l">Declined</div></div>
  </div>
  <div class="bar"><a class="btn" href="/admin/export.csv">Download CSV</a></div>
  ${rows.length ? `<table>
    <thead><tr><th>Name</th><th>Status</th><th>Party</th><th>Meal</th><th>Email</th><th>Message</th><th>Received</th></tr></thead>
    <tbody>${tableRows}</tbody></table>`
    : `<div class="empty">No RSVPs yet.</div>`}
</div></body></html>`);
});

app.get('/admin/export.csv', requireAuth, (req, res) => {
  const rows = allRsvps.all();
  const headers = ['id', 'name', 'email', 'guests', 'attending', 'meal', 'message', 'created_at'];
  const escCsv = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => escCsv(r[h])).join(','));
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="rsvps.csv"');
  res.send(lines.join('\n'));
});

app.listen(PORT, () => {
  console.log(`\n  Boarding Pass to Forever is running:`);
  console.log(`  → Invitation:  http://localhost:${PORT}/`);
  console.log(`  → RSVP admin:  http://localhost:${PORT}/admin  (user: ${ADMIN_USER})\n`);
});

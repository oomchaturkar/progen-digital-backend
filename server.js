require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

// Allow the site's own domain to call this API. Set ALLOWED_ORIGIN
// in your environment once the site is deployed (e.g. https://progendigital.com).
// During local development, leaving it unset allows all origins.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json());

// ---------- Database setup (Postgres — e.g. a free Supabase project) ----------
// Supabase (and most hosted Postgres) require SSL. A local Postgres for
// testing usually doesn't have SSL configured, so we skip it automatically
// when the connection string points at localhost/127.0.0.1.
const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      project_type TEXT,
      budget TEXT,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// ---------- Helpers ----------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- Routes ----------

// Health check — useful for confirming the deploy worked.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'progen-digital-backend' });
});

// Public: receive a contact form submission.
app.post('/api/contact', async (req, res) => {
  const { name, email, projectType, budget, message } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Name is required.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'A valid email is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO submissions (name, email, project_type, budget, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name.trim(), email.trim(), projectType || null, budget || null, message || null]
    );
    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Failed to save submission:', err);
    res.status(500).json({ ok: false, error: 'Something went wrong saving your enquiry.' });
  }
});

// Admin: list submissions. Requires a header: x-admin-key: <ADMIN_KEY>
app.get('/api/submissions', async (req, res) => {
  const key = req.header('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }
  try {
    const result = await pool.query('SELECT * FROM submissions ORDER BY created_at DESC');
    res.json({ ok: true, count: result.rows.length, submissions: result.rows });
  } catch (err) {
    console.error('Failed to load submissions:', err);
    res.status(500).json({ ok: false, error: 'Something went wrong loading submissions.' });
  }
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Progen Digital backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to set up the database schema:', err);
    process.exit(1);
  });

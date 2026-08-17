const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
      author    TEXT NOT NULL,
      body      TEXT NOT NULL CHECK (char_length(body) <= 50)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages (timestamp)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS people (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      default_bev TEXT DEFAULT 'drink'
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drinks (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
      person    TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      beverage  TEXT NOT NULL,
      logged_by TEXT NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_drinks_person_date ON drinks (person, timestamp)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_drinks_date ON drinks (timestamp)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drink_counter (
      id    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      count INTEGER NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`INSERT INTO drink_counter (id, count) VALUES (1, 0) ON CONFLICT DO NOTHING`);
}

async function getAllPeople() {
  const { rows } = await pool.query('SELECT * FROM people ORDER BY name');
  return rows;
}

async function addPerson(id, name, avatar, defaultBev) {
  const { rows } = await pool.query(
    `INSERT INTO people (id, name, avatar, default_bev)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name=$2, avatar=$3, default_bev=$4
     RETURNING *`,
    [id, name, avatar || '', defaultBev || 'drink']
  );
  return rows[0];
}

async function removePerson(id) {
  await pool.query('DELETE FROM people WHERE id = $1', [id]);
}

async function addDrink(id, timestamp, person, beverage, loggedBy) {
  const { rows } = await pool.query(
    `INSERT INTO drinks (id, timestamp, person, beverage, logged_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, timestamp, person, beverage, loggedBy]
  );
  return rows[0];
}

async function getTodayDrinks() {
  const { rows } = await pool.query(
    `SELECT * FROM drinks WHERE timestamp >= CURRENT_DATE ORDER BY timestamp DESC`
  );
  return rows;
}

async function getCount() {
  const { rows } = await pool.query('SELECT count FROM drink_counter WHERE id = 1');
  return rows[0]?.count ?? 0;
}

async function incrementCount() {
  const { rows } = await pool.query(
    'UPDATE drink_counter SET count = count + 1 WHERE id = 1 RETURNING count'
  );
  return rows[0].count;
}

async function getMessages(limit = 50) {
  const { rows } = await pool.query(
    'SELECT * FROM messages ORDER BY timestamp DESC LIMIT $1',
    [limit]
  );
  return rows.reverse();
}

async function addMessage(author, body) {
  const { rows } = await pool.query(
    `INSERT INTO messages (author, body) VALUES ($1, $2) RETURNING *`,
    [author, body]
  );
  return rows[0];
}

module.exports = { pool, initialize, getAllPeople, addPerson, removePerson, addDrink, getTodayDrinks, getCount, incrementCount, getMessages, addMessage };

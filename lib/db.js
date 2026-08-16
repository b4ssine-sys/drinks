const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initialize() {
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
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_drinks_person_date ON drinks (person, timestamp)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_drinks_date ON drinks (timestamp)
  `);
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
    `SELECT * FROM drinks
     WHERE timestamp >= CURRENT_DATE
     ORDER BY timestamp DESC`
  );
  return rows;
}

async function getDrinksByDate(date) {
  const { rows } = await pool.query(
    `SELECT * FROM drinks
     WHERE timestamp >= $1::date AND timestamp < ($1::date + INTERVAL '1 day')
     ORDER BY timestamp DESC`,
    [date]
  );
  return rows;
}

module.exports = {
  pool,
  initialize,
  getAllPeople,
  addPerson,
  removePerson,
  addDrink,
  getTodayDrinks,
  getDrinksByDate,
};

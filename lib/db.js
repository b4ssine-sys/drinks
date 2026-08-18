const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id       TEXT NOT NULL,
      parent_id       TEXT,
      type            TEXT NOT NULL DEFAULT 'text',
      content         TEXT NOT NULL,
      metadata        JSONB DEFAULT '{}',
      reactions       JSONB DEFAULT '[]',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ,
      deleted_at      TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at)`);
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
    'SELECT * FROM messages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows.reverse();
}

async function getMessagesByConversation(conversationId, limit = 50) {
  const { rows } = await pool.query(
    'SELECT * FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT $2',
    [conversationId, limit]
  );
  return rows;
}

async function addMessage(msg) {
  const { rows } = await pool.query(
    `INSERT INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at, updated_at, deleted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       content = EXCLUDED.content,
       metadata = EXCLUDED.metadata,
       reactions = EXCLUDED.reactions,
       updated_at = EXCLUDED.updated_at,
       deleted_at = EXCLUDED.deleted_at
     RETURNING *`,
    [
      msg.id || msg._id,
      msg.conversation_id,
      msg.sender_id,
      msg.parent_id || null,
      msg.type || 'text',
      msg.content,
      JSON.stringify(msg.metadata || {}),
      JSON.stringify(msg.reactions || []),
      msg.created_at || new Date().toISOString(),
      msg.updated_at || null,
      msg.deleted_at || null,
    ]
  );
  return rows[0];
}

module.exports = { pool, initialize, getAllPeople, addPerson, removePerson, addDrink, getTodayDrinks, getCount, incrementCount, getMessages, getMessagesByConversation, addMessage };

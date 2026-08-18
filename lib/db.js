const { createClient } = require('@libsql/client');

let db = null;
let pool = null;
let dbType = null;
let tablesReady = false;

function getDb() {
  if (db || pool) return dbType;

  if (process.env.TURSO_DATABASE_URL) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    dbType = 'turso';
    return dbType;
  }

  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    dbType = 'pg';
    return dbType;
  }

  return null;
}

async function initDatabase() {
  if (tablesReady) return;
  const type = getDb();
  if (!type) throw new Error('No database configured');

  if (type === 'turso') {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        parent_id TEXT,
        type TEXT NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        reactions TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        deleted_at TEXT
      );
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages (conversation_id, created_at ASC);
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        default_bev TEXT DEFAULT 'drink'
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS drinks (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        person TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        beverage TEXT NOT NULL,
        logged_by TEXT NOT NULL
      );
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_drinks_person_date ON drinks (person, timestamp);
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS drink_counter (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        count INTEGER NOT NULL DEFAULT 0
      );
    `);
    await db.execute({ sql: 'INSERT OR IGNORE INTO drink_counter (id, count) VALUES (1, 0)', args: [] });
    await db.execute(`
      CREATE TABLE IF NOT EXISTS drink_click_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        logged_by TEXT NOT NULL,
        count INTEGER NOT NULL
      );
    `);
    console.log('Turso database initialized successfully.');
  } else {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL,
        parent_id TEXT, type TEXT NOT NULL DEFAULT 'text', content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}', reactions JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT DEFAULT '', default_bev TEXT DEFAULT 'drink')`);
    await pool.query(`CREATE TABLE IF NOT EXISTS drinks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), timestamp TIMESTAMPTZ NOT NULL DEFAULT now(), person TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE, beverage TEXT NOT NULL, logged_by TEXT NOT NULL)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_drinks_person_date ON drinks (person, timestamp)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS drink_counter (id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), count INTEGER NOT NULL DEFAULT 0)`);
    await pool.query(`INSERT INTO drink_counter (id, count) VALUES (1, 0) ON CONFLICT DO NOTHING`);
    await pool.query(`CREATE TABLE IF NOT EXISTS drink_click_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), timestamp TIMESTAMPTZ NOT NULL DEFAULT now(), logged_by TEXT NOT NULL, count INTEGER NOT NULL)`);
  }
  tablesReady = true;
}

function jsonParse(val) {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function tursoRow(row) {
  const obj = Object.fromEntries(row);
  if ('metadata' in obj) obj.metadata = jsonParse(obj.metadata);
  if ('reactions' in obj) obj.reactions = jsonParse(obj.reactions);
  return obj;
}

async function getAllPeople() {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute('SELECT * FROM people ORDER BY name');
    return result.rows.map((r) => Object.fromEntries(r));
  }
  const { rows } = await pool.query('SELECT * FROM people ORDER BY name');
  return rows;
}

async function addPerson(id, name, avatar, defaultBev) {
  await initDatabase();
  if (dbType === 'turso') {
    await db.execute({ sql: 'INSERT OR REPLACE INTO people (id, name, avatar, default_bev) VALUES (?, ?, ?, ?)', args: [id, name, avatar || '', defaultBev || 'drink'] });
    const result = await db.execute({ sql: 'SELECT * FROM people WHERE id = ?', args: [id] });
    return Object.fromEntries(result.rows[0]);
  }
  const { rows } = await pool.query(
    `INSERT INTO people (id, name, avatar, default_bev) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name=$2, avatar=$3, default_bev=$4 RETURNING *`,
    [id, name, avatar || '', defaultBev || 'drink']
  );
  return rows[0];
}

async function removePerson(id) {
  await initDatabase();
  if (dbType === 'turso') {
    await db.execute({ sql: 'DELETE FROM people WHERE id = ?', args: [id] });
    return;
  }
  await pool.query('DELETE FROM people WHERE id = $1', [id]);
}

async function addDrink(id, timestamp, person, beverage, loggedBy) {
  await initDatabase();
  if (dbType === 'turso') {
    await db.execute({ sql: 'INSERT INTO drinks (id, timestamp, person, beverage, logged_by) VALUES (?, ?, ?, ?, ?)', args: [id, timestamp, person, beverage, loggedBy] });
    const result = await db.execute({ sql: 'SELECT * FROM drinks WHERE id = ?', args: [id] });
    return Object.fromEntries(result.rows[0]);
  }
  const { rows } = await pool.query('INSERT INTO drinks (id, timestamp, person, beverage, logged_by) VALUES ($1, $2, $3, $4, $5) RETURNING *', [id, timestamp, person, beverage, loggedBy]);
  return rows[0];
}

async function getTodayDrinks() {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute({ sql: "SELECT * FROM drinks WHERE timestamp >= date('now') ORDER BY timestamp DESC", args: [] });
    return result.rows.map((r) => Object.fromEntries(r));
  }
  const { rows } = await pool.query('SELECT * FROM drinks WHERE timestamp >= CURRENT_DATE ORDER BY timestamp DESC');
  return rows;
}

async function getCount() {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute('SELECT count FROM drink_counter WHERE id = 1');
    return result.rows.length ? Object.fromEntries(result.rows[0]).count : 0;
  }
  const { rows } = await pool.query('SELECT count FROM drink_counter WHERE id = 1');
  return rows[0]?.count ?? 0;
}

async function incrementCount() {
  await initDatabase();
  if (dbType === 'turso') {
    await db.execute({ sql: 'UPDATE drink_counter SET count = count + 1 WHERE id = 1', args: [] });
    const result = await db.execute('SELECT count FROM drink_counter WHERE id = 1');
    return Object.fromEntries(result.rows[0]).count;
  }
  const { rows } = await pool.query('UPDATE drink_counter SET count = count + 1 WHERE id = 1 RETURNING count');
  return rows[0].count;
}

async function getMessages(limit = 50) {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute({ sql: 'SELECT * FROM messages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?', args: [limit] });
    return result.rows.map(tursoRow).reverse();
  }
  const { rows } = await pool.query('SELECT * FROM messages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows.reverse();
}

async function getMessagesByConversation(conversationId, limit = 50) {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute({ sql: 'SELECT * FROM messages WHERE conversation_id = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT ?', args: [conversationId, limit] });
    return result.rows.map(tursoRow);
  }
  const { rows } = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT $2', [conversationId, limit]);
  return rows;
}

async function addMessage(msg) {
  await initDatabase();
  const id = msg.id || msg._id;
  const metadata = typeof msg.metadata === 'string' ? msg.metadata : JSON.stringify(msg.metadata || {});
  const reactions = typeof msg.reactions === 'string' ? msg.reactions : JSON.stringify(msg.reactions || []);

  if (dbType === 'turso') {
    await db.execute({
      sql: `INSERT OR REPLACE INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, msg.conversation_id, msg.sender_id, msg.parent_id || null, msg.type || 'text', msg.content, metadata, reactions, msg.created_at || new Date().toISOString(), msg.updated_at || null, msg.deleted_at || null],
    });
    const result = await db.execute({ sql: 'SELECT * FROM messages WHERE id = ?', args: [id] });
    return tursoRow(result.rows[0]);
  }

  const { rows } = await pool.query(
    `INSERT INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at, updated_at, deleted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, reactions = EXCLUDED.reactions, updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
     RETURNING *`,
    [id, msg.conversation_id, msg.sender_id, msg.parent_id || null, msg.type || 'text', msg.content, msg.metadata || {}, msg.reactions || [], msg.created_at || new Date().toISOString(), msg.updated_at || null, msg.deleted_at || null]
  );
  return rows[0];
}

async function toggleReaction(messageId, conversationId, userId, emoji) {
  await initDatabase();

  if (dbType === 'turso') {
    const result = await db.execute({ sql: 'SELECT reactions FROM messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL', args: [messageId, conversationId] });
    if (result.rows.length === 0) return null;
    const reactions = JSON.parse(Object.fromEntries(result.rows[0]).reactions || '[]');
    const idx = reactions.findIndex((r) => r.user_id === userId && r.emoji === emoji);
    if (idx >= 0) reactions.splice(idx, 1);
    else reactions.push({ user_id: userId, emoji });
    await db.execute({ sql: 'UPDATE messages SET reactions = ?, updated_at = ? WHERE id = ? AND conversation_id = ?', args: [JSON.stringify(reactions), new Date().toISOString(), messageId, conversationId] });
    const updated = await db.execute({ sql: 'SELECT * FROM messages WHERE id = ?', args: [messageId] });
    return tursoRow(updated.rows[0]);
  }

  const { rows } = await pool.query(
    `WITH current_msg AS (
       SELECT reactions FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL
     ),
     updated_reactions AS (
       SELECT CASE
         WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(reactions) elem WHERE elem->>'user_id' = $3 AND elem->>'emoji' = $4)
         THEN (SELECT coalesce(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements(reactions) elem WHERE NOT (elem->>'user_id' = $3 AND elem->>'emoji' = $4))
         ELSE reactions || jsonb_build_object('user_id', $3, 'emoji', $4)::jsonb
       END AS new_reactions FROM current_msg
     )
     UPDATE messages SET reactions = updated_reactions.new_reactions, updated_at = now()
     FROM updated_reactions WHERE id = $1 AND conversation_id = $2 RETURNING messages.*;`,
    [messageId, conversationId, userId, emoji]
  );
  return rows[0] || null;
}

async function getDbCount() {
  return getCount();
}

async function getTodayClickCount() {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute({ sql: "SELECT COUNT(*) AS today FROM drink_click_log WHERE timestamp >= date('now')", args: [] });
    return Number(Object.fromEntries(result.rows[0]).today) || 0;
  }
  const { rows } = await pool.query('SELECT COUNT(*)::int AS today FROM drink_click_log WHERE timestamp >= CURRENT_DATE');
  return rows[0]?.today ?? 0;
}

async function incrementAndLog(loggedBy) {
  await initDatabase();
  if (dbType === 'turso') {
    await db.execute({ sql: 'UPDATE drink_counter SET count = count + 1 WHERE id = 1', args: [] });
    const countResult = await db.execute('SELECT count FROM drink_counter WHERE id = 1');
    const count = Object.fromEntries(countResult.rows[0]).count;
    await db.execute({ sql: 'INSERT INTO drink_click_log (id, logged_by, count) VALUES (?, ?, ?)', args: [crypto.randomUUID(), loggedBy, count] });
    return count;
  }
  const { rows } = await pool.query('UPDATE drink_counter SET count = count + 1 WHERE id = 1 RETURNING count');
  const count = rows[0].count;
  await pool.query('INSERT INTO drink_click_log (logged_by, count) VALUES ($1, $2)', [loggedBy, count]);
  return count;
}

async function getRecentLogs(limit = 50) {
  await initDatabase();
  if (dbType === 'turso') {
    const result = await db.execute({ sql: 'SELECT logged_by, count, timestamp FROM drink_click_log ORDER BY timestamp DESC LIMIT ?', args: [limit] });
    return result.rows.map((r) => Object.fromEntries(r));
  }
  const { rows } = await pool.query('SELECT logged_by, count, timestamp FROM drink_click_log ORDER BY timestamp DESC LIMIT $1', [limit]);
  return rows;
}

module.exports = {
  db, getDb, initDatabase, initialize: initDatabase,
  getAllPeople, addPerson, removePerson,
  addDrink, getTodayDrinks,
  getCount, incrementCount, getMessages, getMessagesByConversation, addMessage,
  toggleReaction, getDbCount, getTodayClickCount, incrementAndLog, getRecentLogs,
};

#!/usr/bin/env node

/**
 * Run: node scripts/test-turso.js
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
 * or as environment variables.
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Load .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
    if (match) process.env[match[1]] = process.env[match[1]] || match[2];
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const db = createClient({ url, authToken });

async function run() {
  console.log('Connecting to Turso...', url);

  // 1. Create tables
  console.log('\n--- Creating tables ---');
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      default_bev TEXT DEFAULT 'drink'
    );
  `);
  console.log('Tables created.');

  // 2. Insert a test message
  console.log('\n--- Insert test message ---');
  const testId = 'msg_test_' + Date.now();
  await db.execute({
    sql: `INSERT OR REPLACE INTO messages (id, conversation_id, sender_id, type, content, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [testId, 'conv_bev_chat', 'test_user', 'text', 'Hello from Turso test!', new Date().toISOString()],
  });
  console.log('Inserted:', testId);

  // 3. Read it back
  console.log('\n--- Fetch messages ---');
  const msgs = await db.execute({
    sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10',
    args: ['conv_bev_chat'],
  });
  console.log(`Found ${msgs.rows.length} message(s):`);
  for (const row of msgs.rows) {
    const m = Object.fromEntries(row);
    console.log(`  [${m.created_at}] ${m.sender_id}: ${m.content}`);
  }

  // 4. Test counter
  console.log('\n--- Test counter ---');
  await db.execute({ sql: 'UPDATE drink_counter SET count = count + 1 WHERE id = 1', args: [] });
  const counter = await db.execute('SELECT count FROM drink_counter WHERE id = 1');
  const count = Object.fromEntries(counter.rows[0]).count;
  console.log('Counter value:', count);

  // 5. Test reaction toggle
  console.log('\n--- Test reaction ---');
  const reactions = JSON.stringify([{ user_id: 'test_user', emoji: '🔥' }]);
  await db.execute({
    sql: 'UPDATE messages SET reactions = ?, updated_at = ? WHERE id = ?',
    args: [reactions, new Date().toISOString(), testId],
  });
  const updated = await db.execute({ sql: 'SELECT reactions FROM messages WHERE id = ?', args: [testId] });
  console.log('Reactions:', Object.fromEntries(updated.rows[0]).reactions);

  // 6. Clean up test data
  console.log('\n--- Cleanup ---');
  await db.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [testId] });
  console.log('Test message deleted.');

  console.log('\n✓ All Turso tests passed!\n');
}

run().catch((err) => {
  console.error('\n✗ Test failed:', err.message);
  process.exit(1);
});

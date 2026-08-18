import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

export const dynamic = 'force-dynamic';

let pgPool = null;
let tableReady = false;

function getPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPool;
}

async function ensureTable(pool) {
  if (!tableReady) {
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
    tableReady = true;
  }
}

export async function GET(request) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversation_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  try {
    await ensureTable(pool);

    if (conversationId) {
      const { rows } = await pool.query(
        'SELECT * FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT $2',
        [conversationId, limit]
      );
      return NextResponse.json(rows);
    }

    const { rows } = await pool.query(
      'SELECT * FROM messages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return NextResponse.json(rows.reverse());
  } catch (err) {
    console.error('DB GET failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = data._id || data.id;
  const { conversation_id, sender_id, content } = data;

  if (!id || !conversation_id || !sender_id || !content) {
    return NextResponse.json(
      { error: 'Required: _id (or id), conversation_id, sender_id, content' },
      { status: 400 }
    );
  }

  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  try {
    await ensureTable(pool);
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
        id,
        conversation_id,
        sender_id,
        data.parent_id || null,
        data.type || 'text',
        content,
        JSON.stringify(data.metadata || {}),
        JSON.stringify(data.reactions || []),
        data.created_at || new Date().toISOString(),
        data.updated_at || null,
        data.deleted_at || null,
      ]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('DB POST failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

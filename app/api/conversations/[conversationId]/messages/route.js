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

export async function GET(request, { params }) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  const { conversationId } = await params;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  try {
    await ensureTable(pool);
    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, limit]
    );
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('DB GET failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  const { conversationId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = body._id || body.id;
  const { sender_id, content } = body;

  if (!id || !sender_id || !content) {
    return NextResponse.json(
      { error: 'Required: _id (or id), sender_id, content' },
      { status: 400 }
    );
  }

  try {
    await ensureTable(pool);
    const { rows } = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '[]', now())
       RETURNING *`,
      [
        id,
        conversationId,
        sender_id,
        body.parent_id || null,
        body.type || 'text',
        content,
        JSON.stringify(body.metadata || {}),
      ]
    );
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('DB POST failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ error: 'No database configured' }, { status: 503 });
  }

  const { conversationId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message_id, user_id, emoji } = body;
  if (!message_id || !user_id || !emoji) {
    return NextResponse.json(
      { error: 'Required: message_id, user_id, emoji' },
      { status: 400 }
    );
  }

  try {
    await ensureTable(pool);

    const { rows: existing } = await pool.query(
      'SELECT reactions FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL',
      [message_id, conversationId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    let reactions = existing[0].reactions || [];
    const idx = reactions.findIndex((r) => r.user_id === user_id && r.emoji === emoji);
    if (idx >= 0) {
      reactions.splice(idx, 1);
    } else {
      reactions.push({ user_id, emoji });
    }

    const { rows } = await pool.query(
      `UPDATE messages SET reactions = $1, updated_at = now()
       WHERE id = $2 AND conversation_id = $3
       RETURNING *`,
      [JSON.stringify(reactions), message_id, conversationId]
    );
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error('DB PATCH failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

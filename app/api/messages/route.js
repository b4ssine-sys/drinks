import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

export const dynamic = 'force-dynamic';

let pgPool = null;

function getPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPool;
}

export async function GET(request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'No database configured' }, { status: 503 });

  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversation_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  try {
    if (conversationId) {
      const { rows } = await pool.query(
        `SELECT id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at
         FROM messages
         WHERE conversation_id = $1 AND deleted_at IS NULL
         ORDER BY created_at ASC
         LIMIT $2`,
        [conversationId, limit]
      );
      return NextResponse.json(rows);
    }

    const { rows } = await pool.query(
      `SELECT id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at
       FROM messages
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return NextResponse.json(rows.reverse());
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'No database configured' }, { status: 503 });

  const body = await request.json().catch(() => null);

  const id = body?._id || body?.id;
  const { conversation_id, sender_id, content } = body || {};

  if (!id || !conversation_id || !sender_id || !content) {
    return NextResponse.json(
      { error: 'Required: _id (or id), conversation_id, sender_id, content' },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, $8, $9, $10)
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
        body.parent_id || null,
        body.type || 'text',
        content,
        body.metadata || {},
        body.created_at || new Date().toISOString(),
        body.updated_at || null,
        body.deleted_at || null,
      ]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

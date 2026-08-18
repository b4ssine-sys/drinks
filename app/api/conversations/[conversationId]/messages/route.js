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

export async function GET(request, { params }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'No database configured' }, { status: 503 });

  const { conversationId } = await params;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  try {
    const { rows } = await pool.query(
      `SELECT id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at
       FROM messages
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, limit]
    );
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'No database configured' }, { status: 503 });

  const { conversationId } = await params;
  const body = await request.json().catch(() => null);

  const id = body?._id || body?.id;
  const { sender_id, content } = body || {};

  if (!id || !sender_id || !content) {
    return NextResponse.json({ error: 'Required: _id (or id), sender_id, content' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, now())
       RETURNING *`,
      [id, conversationId, sender_id, body.parent_id || null, body.type || 'text', content, body.metadata || {}]
    );
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'No database configured' }, { status: 503 });

  const { conversationId } = await params;
  const body = await request.json().catch(() => null);
  const { message_id, user_id, emoji } = body || {};

  if (!message_id || !user_id || !emoji) {
    return NextResponse.json({ error: 'Required: message_id, user_id, emoji' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `WITH current_msg AS (
         SELECT reactions FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL
       ),
       updated_reactions AS (
         SELECT
           CASE
             WHEN EXISTS (
               SELECT 1 FROM jsonb_array_elements(reactions) elem
               WHERE elem->>'user_id' = $3 AND elem->>'emoji' = $4
             )
             THEN (
               SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
               FROM jsonb_array_elements(reactions) elem
               WHERE NOT (elem->>'user_id' = $3 AND elem->>'emoji' = $4)
             )
             ELSE reactions || jsonb_build_object('user_id', $3, 'emoji', $4)::jsonb
           END AS new_reactions
         FROM current_msg
       )
       UPDATE messages
       SET reactions = updated_reactions.new_reactions, updated_at = now()
       FROM updated_reactions
       WHERE id = $1 AND conversation_id = $2
       RETURNING messages.*;`,
      [message_id, conversationId, user_id, emoji]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

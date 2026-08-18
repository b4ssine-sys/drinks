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

function parseLimit(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 200);
}

const MAX_CONTENT = 5000;
const MAX_FIELD = 200;

export async function GET(request, { params }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'No database configured' }, { status: 503 });

  const { conversationId } = await params;
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));

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
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const body = await request.json().catch(() => null);

  const id = String(body?._id || body?.id || '').slice(0, MAX_FIELD);
  const sender_id = String(body?.sender_id || '').slice(0, MAX_FIELD);
  const content = String(body?.content || '').slice(0, MAX_CONTENT);

  if (!id || !sender_id || !content) {
    return NextResponse.json({ error: 'Required: _id (or id), sender_id, content' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, parent_id, type, content, metadata, reactions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, now())
       RETURNING *`,
      [
        id,
        conversationId,
        sender_id,
        body.parent_id ? String(body.parent_id).slice(0, MAX_FIELD) : null,
        body.type === 'image' || body.type === 'file' || body.type === 'system' ? body.type : 'text',
        content,
        body.metadata || {},
      ]
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
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const message_id = String(body?.message_id || '').slice(0, MAX_FIELD);
  const user_id = String(body?.user_id || '').slice(0, MAX_FIELD);
  const emoji = String(body?.emoji || '').slice(0, 32);

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

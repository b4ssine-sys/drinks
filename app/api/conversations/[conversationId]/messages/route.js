import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_CONTENT = 5000;
const MAX_FIELD = 200;

function parseLimit(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 200);
}

function getDbModule() {
  try {
    return require('@/lib/db');
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  const { conversationId } = await params;
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  const db = getDbModule();
  if (!db) {
    return NextResponse.json({ error: 'Database module not found' }, { status: 502 });
  }

  try {
    await db.initialize();
    const dbType = db.getDb();
    
    if (!dbType) {
      return NextResponse.json({ error: 'No database configured' }, { status: 502 });
    }

    const rows = await db.getMessagesByConversation(conversationId, limit);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('DB GET failed:', err.message);
    return NextResponse.json({ error: 'Database read failed', details: err.message }, { status: 502 });
  }
}

export async function POST(request, { params }) {
  const { conversationId } = await params;
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const body = await request.json().catch(() => null);

  const id = String(body?._id || body?.id || '').slice(0, MAX_FIELD);
  const sender_id = String(body?.sender_id || '').slice(0, MAX_FIELD);
  const content = String(body?.content || '').slice(0, MAX_CONTENT);

  if (!id || !sender_id || !content) {
    return NextResponse.json({ error: 'Required: _id (or id), sender_id, content' }, { status: 400 });
  }

  const msgType = body.type === 'image' || body.type === 'file' || body.type === 'system' ? body.type : 'text';
  const parent_id = body.parent_id ? String(body.parent_id).slice(0, MAX_FIELD) : null;
  const metadata = body.metadata || {};

  const db = getDbModule();
  if (!db) {
    return NextResponse.json({ error: 'Database module not found' }, { status: 502 });
  }

  try {
    await db.initialize();
    const dbType = db.getDb();
    
    if (!dbType) {
      return NextResponse.json({ error: 'No database configured' }, { status: 502 });
    }

    const row = await db.addMessage({
      id,
      conversation_id: conversationId,
      sender_id,
      parent_id,
      type: msgType,
      content,
      metadata,
      reactions: [],
    });
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error('DB POST failed:', err.message);
    return NextResponse.json({ error: 'Database write failed', details: err.message }, { status: 502 });
  }
}

export async function PATCH(request, { params }) {
  const { conversationId } = await params;
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const message_id = String(body?.message_id || '').slice(0, MAX_FIELD);
  const user_id = String(body?.user_id || '').slice(0, MAX_FIELD);
  const emoji = String(body?.emoji || '').slice(0, 32);

  if (!message_id || !user_id || !emoji) {
    return NextResponse.json({ error: 'Required: message_id, user_id, emoji' }, { status: 400 });
  }

  const db = getDbModule();
  if (!db) {
    return NextResponse.json({ error: 'Database module not found' }, { status: 502 });
  }

  try {
    await db.initialize();
    const dbType = db.getDb();
    
    if (!dbType) {
      return NextResponse.json({ error: 'No database configured' }, { status: 502 });
    }

    const row = await db.toggleReaction(message_id, conversationId, user_id, emoji);
    if (!row) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error('DB PATCH failed:', err.message);
    return NextResponse.json({ error: 'Database update failed', details: err.message }, { status: 502 });
  }
}

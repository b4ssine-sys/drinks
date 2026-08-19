import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), '.data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MAX_FILE_MESSAGES = 500;

function parseLimit(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 200);
}

const MAX_CONTENT = 5000;
const MAX_FIELD = 200;

function getDbModule() {
  try {
    return require('@/lib/db');
  } catch {
    return null;
  }
}

async function readMessagesFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(MESSAGES_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMessagesFile(messages) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const trimmed = messages.length > MAX_FILE_MESSAGES
      ? messages.slice(-MAX_FILE_MESSAGES)
      : messages;
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Messages file write failed:', err.message);
  }
}

export async function GET(request, { params }) {
  const { conversationId } = await params;
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));

  const db = getDbModule();
  if (db && db.getDb()) {
    try {
      await db.initialize();
      const rows = await db.getMessagesByConversation(conversationId, limit);
      return NextResponse.json({ data: rows });
    } catch (err) {
      console.error('DB GET failed:', err.message);
      return NextResponse.json({ error: 'Database read failed' }, { status: 502 });
    }
  }

  const all = await readMessagesFile();
  const filtered = all
    .filter((m) => m.conversation_id === conversationId && !m.deleted_at)
    .slice(-limit);
  return NextResponse.json({ data: filtered });
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
  if (db && db.getDb()) {
    try {
      await db.initialize();
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
    }
  }

  const msg = {
    id,
    conversation_id: conversationId,
    sender_id,
    parent_id,
    type: msgType,
    content,
    metadata,
    reactions: [],
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  };
  const all = await readMessagesFile();
  all.push(msg);
  await writeMessagesFile(all);
  return NextResponse.json({ data: msg }, { status: 201 });
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
  if (db && db.getDb()) {
    try {
      await db.initialize();
      const row = await db.toggleReaction(message_id, conversationId, user_id, emoji);
      if (!row) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      return NextResponse.json({ data: row });
    } catch (err) {
      console.error('DB PATCH failed:', err.message);
    }
  }

  const all = await readMessagesFile();
  const idx = all.findIndex((m) => m.id === message_id && m.conversation_id === conversationId && !m.deleted_at);
  if (idx === -1) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const msg = all[idx];
  const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
  const existing = reactions.findIndex((r) => r.user_id === user_id && r.emoji === emoji);
  if (existing >= 0) {
    reactions.splice(existing, 1);
  } else {
    reactions.push({ user_id, emoji });
  }
  msg.reactions = reactions;
  msg.updated_at = new Date().toISOString();
  all[idx] = msg;
  await writeMessagesFile(all);
  return NextResponse.json({ data: msg });
}

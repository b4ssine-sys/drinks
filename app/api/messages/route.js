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

export async function GET(request) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversation_id');
  const limit = parseLimit(url.searchParams.get('limit'));

  const db = getDbModule();
  if (!db || !db.getDb()) {
    return NextResponse.json([]);
  }

  try {
    await db.initialize();
    if (conversationId) {
      const rows = await db.getMessagesByConversation(conversationId, limit);
      return NextResponse.json(rows);
    }
    const rows = await db.getMessages(limit);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('DB GET failed:', err.message);
    return NextResponse.json({ error: 'Database read failed' }, { status: 502 });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  const id = String(body?._id || body?.id || '').slice(0, MAX_FIELD);
  const conversation_id = String(body?.conversation_id || '').slice(0, MAX_FIELD);
  const sender_id = String(body?.sender_id || '').slice(0, MAX_FIELD);
  const content = String(body?.content || '').slice(0, MAX_CONTENT);

  if (!id || !conversation_id || !sender_id || !content) {
    return NextResponse.json(
      { error: 'Required: _id (or id), conversation_id, sender_id, content' },
      { status: 400 }
    );
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
        conversation_id,
        sender_id,
        parent_id,
        type: msgType,
        content,
        metadata,
        reactions: [],
        created_at: body.created_at || new Date().toISOString(),
        updated_at: body.updated_at || null,
        deleted_at: body.deleted_at || null,
      });
      return NextResponse.json(row, { status: 201 });
    } catch (err) {
      console.error('DB POST failed:', err.message);
    }
  }

  const msg = {
    id,
    conversation_id,
    sender_id,
    parent_id,
    type: msgType,
    content,
    metadata,
    reactions: [],
    created_at: body.created_at || new Date().toISOString(),
    updated_at: body.updated_at || null,
    deleted_at: body.deleted_at || null,
  };
  const all = await readMessagesFile();
  const existingIdx = all.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    all[existingIdx] = { ...all[existingIdx], content, metadata, updated_at: msg.updated_at, deleted_at: msg.deleted_at };
  } else {
    all.push(msg);
  }
  await writeMessagesFile(all);
  return NextResponse.json(existingIdx >= 0 ? all[existingIdx] : msg, { status: 201 });
}

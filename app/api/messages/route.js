import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import pg from 'pg';

const { Pool } = pg;

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), '.data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

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
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
        author    TEXT NOT NULL,
        body      TEXT NOT NULL CHECK (char_length(body) <= 50)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages (timestamp)`);
    tableReady = true;
  }
}

async function readMessagesFile() {
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeMessagesFile(messages) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

export async function GET() {
  const pool = getPool();
  if (pool) {
    try {
      await ensureTable(pool);
      const { rows } = await pool.query(
        'SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50'
      );
      return NextResponse.json(rows.reverse());
    } catch (err) {
      console.error('DB GET failed:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const messages = await readMessagesFile();
  return NextResponse.json(messages.slice(-50));
}

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { author, body } = data;
  if (!author || !body) {
    return NextResponse.json(
      { error: `Missing fields. Received keys: ${Object.keys(data).join(', ')}` },
      { status: 400 }
    );
  }
  if (body.length > 50) {
    return NextResponse.json({ error: 'Message exceeds 50 characters' }, { status: 400 });
  }

  const pool = getPool();
  if (pool) {
    try {
      await ensureTable(pool);
      const { rows } = await pool.query(
        'INSERT INTO messages (author, body) VALUES ($1, $2) RETURNING *',
        [author, body]
      );
      return NextResponse.json(rows[0], { status: 201 });
    } catch (err) {
      console.error('DB POST failed:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const message = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    author,
    body,
  };
  const messages = await readMessagesFile();
  messages.push(message);
  await writeMessagesFile(messages);
  return NextResponse.json(message, { status: 201 });
}

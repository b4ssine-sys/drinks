import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

let pgPool = null;
let tableReady = false;

function getPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 20000,
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
  await ensureDataDir();
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages));
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
      console.error('DB GET messages failed:', err.message);
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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { author, body } = data;
  if (!author || !body) {
    return NextResponse.json({ error: 'author and body required' }, { status: 400 });
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
      console.error('DB POST message failed:', err.message);
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

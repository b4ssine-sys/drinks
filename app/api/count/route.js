import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const COUNTER_FILE = path.join(process.cwd(), '.drink-count.json');

let pgPool = null;
let tableReady = false;

function getPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPool;
}

async function ensureTable(pool) {
  if (!tableReady) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drink_counter (
        id    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        count INTEGER NOT NULL DEFAULT 0
      )
    `);
    await pool.query(`INSERT INTO drink_counter (id, count) VALUES (1, 0) ON CONFLICT DO NOTHING`);
    tableReady = true;
  }
}

async function readFile() {
  try {
    const data = await fs.readFile(COUNTER_FILE, 'utf8');
    return JSON.parse(data).count || 0;
  } catch {
    return 0;
  }
}

async function writeFile(count) {
  await fs.writeFile(COUNTER_FILE, JSON.stringify({ count }));
}

async function getCountFromDb() {
  const pool = getPool();
  if (!pool) return null;
  await ensureTable(pool);
  const { rows } = await pool.query('SELECT count FROM drink_counter WHERE id = 1');
  return rows[0]?.count ?? 0;
}

async function incrementInDb() {
  const pool = getPool();
  if (!pool) return null;
  await ensureTable(pool);
  const { rows } = await pool.query(
    'UPDATE drink_counter SET count = count + 1 WHERE id = 1 RETURNING count'
  );
  return rows[0].count;
}

export async function GET() {
  try {
    const dbCount = await getCountFromDb();
    if (dbCount !== null) return NextResponse.json({ count: dbCount });
  } catch {}
  const count = await readFile();
  return NextResponse.json({ count });
}

export async function POST() {
  try {
    const dbCount = await incrementInDb();
    if (dbCount !== null) return NextResponse.json({ count: dbCount });
  } catch {}
  const count = (await readFile()) + 1;
  await writeFile(count);
  return NextResponse.json({ count });
}

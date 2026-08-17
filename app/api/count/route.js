import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const COUNTER_FILE = path.join(DATA_DIR, 'drink-count.json');
const CLICK_LOG_FILE = path.join(DATA_DIR, 'drink-click-log.json');

let memoryCount = null;
let memoryTodayCount = 0;
let memoryTodayDate = new Date().toISOString().slice(0, 10);

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
      CREATE TABLE IF NOT EXISTS drink_counter (
        id    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        count INTEGER NOT NULL DEFAULT 0
      )
    `);
    await pool.query(`INSERT INTO drink_counter (id, count) VALUES (1, 0) ON CONFLICT DO NOTHING`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drink_click_log (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
        logged_by TEXT NOT NULL,
        count     INTEGER NOT NULL
      )
    `);
    tableReady = true;
  }
}

async function readFile() {
  try {
    const data = await fs.readFile(COUNTER_FILE, 'utf8');
    const count = JSON.parse(data).count ?? 0;
    if (memoryCount === null) memoryCount = count;
    return count;
  } catch {
    return memoryCount ?? 0;
  }
}

async function writeFile(count) {
  memoryCount = count;
  try {
    await ensureDataDir();
    await fs.writeFile(COUNTER_FILE, JSON.stringify({ count }));
  } catch {}
}

async function readClickLog() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(CLICK_LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function appendClickLog(loggedBy, count) {
  try {
    await ensureDataDir();
    const current = await readClickLog();
    const entry = {
      timestamp: new Date().toISOString(),
      logged_by: loggedBy,
      count,
    };
    await fs.writeFile(CLICK_LOG_FILE, JSON.stringify([...current, entry]));
  } catch {}
}

async function getCountFromDb() {
  const pool = getPool();
  if (!pool) return null;
  await ensureTable(pool);
  const { rows } = await pool.query('SELECT count FROM drink_counter WHERE id = 1');
  return rows[0]?.count ?? 0;
}

async function getTodayCountFromDb() {
  const pool = getPool();
  if (!pool) return null;
  await ensureTable(pool);
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS today FROM drink_click_log WHERE timestamp >= CURRENT_DATE'
  );
  return rows[0]?.today ?? 0;
}

async function incrementInDb(loggedBy) {
  const pool = getPool();
  if (!pool) return null;
  await ensureTable(pool);
  const { rows } = await pool.query(
    'UPDATE drink_counter SET count = count + 1 WHERE id = 1 RETURNING count'
  );
  const count = rows[0].count;
  await pool.query(
    'INSERT INTO drink_click_log (logged_by, count) VALUES ($1, $2)',
    [loggedBy || 'unknown', count]
  );
  return count;
}

export async function GET(request) {
  const url = new URL(request.url);
  const wantLog = url.searchParams.get('logs') === '1';

  try {
    const dbCount = await getCountFromDb();
    if (dbCount !== null) {
      const todayCount = await getTodayCountFromDb();
      if (wantLog) {
        const entries = await getRecentLogEntries();
        return NextResponse.json({ count: dbCount, today: todayCount, log: entries });
      }
      return NextResponse.json({ count: dbCount, today: todayCount });
    }
  } catch (err) {
    console.error('DB GET failed:', err.message);
  }

  const count = await readFile();
  const todayStr = new Date().toISOString().slice(0, 10);
  if (memoryTodayDate !== todayStr) {
    memoryTodayDate = todayStr;
    memoryTodayCount = 0;
  }
  if (wantLog) {
    const log = await readClickLog();
    return NextResponse.json({ count, today: memoryTodayCount, log });
  }
  return NextResponse.json({ count, today: memoryTodayCount });
}

async function getRecentLogEntries() {
  const pool = getPool();
  if (!pool) return [];
  try {
    await ensureTable(pool);
    const { rows } = await pool.query(
      'SELECT logged_by, count, timestamp FROM drink_click_log ORDER BY timestamp DESC LIMIT 50'
    );
    return rows;
  } catch {
    return [];
  }
}

export async function POST(request) {
  let body = {};
  let loggedBy = 'unknown';

  try {
    body = await request.json().catch(() => ({}));
    loggedBy = String(body.logged_by || 'unknown').trim() || 'unknown';
  } catch {
    loggedBy = 'unknown';
  }

  try {
    const dbCount = await incrementInDb(loggedBy);
    if (dbCount !== null) {
      await writeFile(dbCount);
      const todayCount = await getTodayCountFromDb();
      return NextResponse.json({ count: dbCount, today: todayCount, logged_by: loggedBy });
    }
  } catch (err) {
    console.error('DB POST failed:', err.message);
  }

  const previousCount = await readFile();
  const count = previousCount + 1;
  await writeFile(count);
  await appendClickLog(loggedBy, count);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (memoryTodayDate !== todayStr) {
    memoryTodayDate = todayStr;
    memoryTodayCount = 0;
  }
  memoryTodayCount++;
  return NextResponse.json({ count, today: memoryTodayCount, logged_by: loggedBy });
}

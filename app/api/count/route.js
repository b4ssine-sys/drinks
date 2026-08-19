import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const COUNTER_FILE = path.join(DATA_DIR, 'drink-count.json');
const CLICK_LOG_FILE = path.join(DATA_DIR, 'drink-click-log.json');
const MAX_LOG_ENTRIES = 500;

let memoryCount = null;
let memoryTodayCount = 0;
let memoryTodayDate = new Date().toISOString().slice(0, 10);

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFile() {
  try {
    const data = await fs.readFile(COUNTER_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const count = typeof parsed.count === 'number' && Number.isFinite(parsed.count) ? parsed.count : 0;
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
  } catch (err) {
    console.error('Counter file write failed:', err.message);
  }
}

async function readClickLog() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(CLICK_LOG_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function appendClickLog(loggedBy, count) {
  try {
    await ensureDataDir();
    let current = await readClickLog();
    const entry = {
      timestamp: new Date().toISOString(),
      logged_by: loggedBy,
      count,
    };
    current.push(entry);
    if (current.length > MAX_LOG_ENTRIES) {
      current = current.slice(-MAX_LOG_ENTRIES);
    }
    await fs.writeFile(CLICK_LOG_FILE, JSON.stringify(current));
  } catch (err) {
    console.error('Click log write failed:', err.message);
  }
}

function getDbModule() {
  try {
    return require('@/lib/db');
  } catch {
    return null;
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const wantLog = url.searchParams.get('logs') === '1';

  const db = getDbModule();
  if (db && db.getDb()) {
    try {
      await db.initialize();
      const dbCount = await db.getDbCount();
      const todayCount = await db.getTodayClickCount();
      if (wantLog) {
        const entries = await db.getRecentLogs();
        return NextResponse.json({ count: dbCount, today: todayCount, log: entries });
      }
      return NextResponse.json({ count: dbCount, today: todayCount });
    } catch (err) {
      console.error('DB GET failed:', err.message);
      return NextResponse.json({ error: 'Database read failed' }, { status: 502 });
    }
  }

  const count = await readFile();
  const todayStr = new Date().toISOString().slice(0, 10);
  if (memoryTodayDate !== todayStr) {
    memoryTodayDate = todayStr;
    memoryTodayCount = 0;
  }
  if (wantLog) {
    const log = await readClickLog();
    return NextResponse.json({ count, today: memoryTodayCount, log: log.slice(-50) });
  }
  return NextResponse.json({ count, today: memoryTodayCount });
}

export async function POST(request) {
  let loggedBy = 'unknown';

  try {
    const body = await request.json().catch(() => ({}));
    loggedBy = String(body.logged_by || 'unknown').trim().slice(0, 100) || 'unknown';
  } catch {
    loggedBy = 'unknown';
  }

  const db = getDbModule();
  if (db && db.getDb()) {
    try {
      await db.initialize();
      const dbCount = await db.incrementAndLog(loggedBy);
      await writeFile(dbCount);
      const todayCount = await db.getTodayClickCount();
      return NextResponse.json({ count: dbCount, today: todayCount, logged_by: loggedBy });
    } catch (err) {
      console.error('DB POST failed:', err.message);
    }
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

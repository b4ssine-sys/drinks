import { NextResponse } from 'next/server';
const db = require('@/lib/db');

let initialized = false;
async function ensureInit() {
  if (!initialized) { await db.initialize(); initialized = true; }
}

export async function GET() {
  try {
    await ensureInit();
    const count = await db.getCount();
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST() {
  try {
    await ensureInit();
    const count = await db.incrementCount();
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

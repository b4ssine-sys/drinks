import { NextResponse } from 'next/server';
const db = require('@/lib/db');

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await db.initialize();
    initialized = true;
  }
}

export async function GET() {
  try {
    await ensureInit();
    const people = await db.getAllPeople();
    return NextResponse.json(people);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureInit();
    const body = await request.json();
    const id = String(body.id || '').slice(0, 100);
    const name = String(body.name || '').slice(0, 100);
    const avatar = body.avatar ? String(body.avatar).slice(0, 500) : undefined;
    const default_bev = body.default_bev ? String(body.default_bev).slice(0, 100) : undefined;
    if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 });
    const person = await db.addPerson(id, name, avatar, default_bev);
    return NextResponse.json(person, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

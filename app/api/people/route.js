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
    const { id, name, avatar, default_bev } = await request.json();
    if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 });
    const person = await db.addPerson(id, name, avatar, default_bev);
    return NextResponse.json(person, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
const db = require('@/lib/db');
const { createEntry } = require('@/lib/logic');

export async function POST(request) {
  try {
    const { person, beverage, logged_by } = await request.json();
    if (!person || !beverage) return NextResponse.json({ error: 'person and beverage required' }, { status: 400 });
    const entry = createEntry(person, beverage, logged_by || 'anonymous');
    const drink = await db.addDrink(entry.id, entry.timestamp, entry.person, entry.beverage, entry.logged_by);
    return NextResponse.json(drink, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function GET() {
  try {
    const drinks = await db.getTodayDrinks();
    return NextResponse.json(drinks);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

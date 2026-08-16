import { NextResponse } from 'next/server';

// GET /api/drinks/today
export async function GET() {
  // TODO: fetch today's drinks from db
  return NextResponse.json([]);
}

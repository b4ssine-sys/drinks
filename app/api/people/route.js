import { NextResponse } from 'next/server';

// GET /api/people
export async function GET() {
  // TODO: fetch all people from db
  return NextResponse.json([]);
}

// POST /api/people
export async function POST(request) {
  // TODO: create a person
  // const body = await request.json();
  return NextResponse.json({}, { status: 201 });
}

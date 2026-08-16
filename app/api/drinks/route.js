import { NextResponse } from 'next/server';

// POST /api/drinks
export async function POST(request) {
  // TODO: log a drink
  // const body = await request.json();
  return NextResponse.json({}, { status: 201 });
}

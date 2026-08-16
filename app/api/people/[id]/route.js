import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.removePerson(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

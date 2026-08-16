import { NextResponse } from 'next/server';

// DELETE /api/people/:id
export async function DELETE(request, { params }) {
  // TODO: remove person by params.id
  // const { id } = await params;
  return NextResponse.json({ ok: true });
}

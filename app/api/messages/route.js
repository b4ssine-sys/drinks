const { NextResponse } = require('next/server');
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
    const messages = await db.getMessages(50);
    return NextResponse.json(messages);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureInit();
    const { author, body } = await request.json();
    if (!author || !body) {
      return NextResponse.json({ error: 'author and body required' }, { status: 400 });
    }
    if (body.length > 50) {
      return NextResponse.json({ error: 'Message exceeds 50 characters' }, { status: 400 });
    }
    const message = await db.addMessage(author, body);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

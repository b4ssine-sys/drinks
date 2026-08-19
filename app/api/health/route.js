import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getDbModule() {
  try {
    return require('@/lib/db');
  } catch (err) {
    return { error: err.message };
  }
}

export async function GET() {
  const status = {
    turso_url: process.env.TURSO_DATABASE_URL ? 'set' : 'missing',
    turso_token: process.env.TURSO_AUTH_TOKEN ? 'set' : 'missing',
    db_module: null,
    db_type: null,
    tables: null,
    message_count: null,
  };

  const mod = getDbModule();
  if (mod?.error) {
    status.db_module = 'failed: ' + mod.error;
    return NextResponse.json(status);
  }
  status.db_module = 'loaded';

  try {
    const type = mod.getDb();
    status.db_type = type || 'none';
  } catch (err) {
    status.db_type = 'error: ' + err.message;
    return NextResponse.json(status);
  }

  try {
    await mod.initialize();
    status.tables = 'ok';
  } catch (err) {
    status.tables = 'error: ' + err.message;
    return NextResponse.json(status);
  }

  try {
    const msgs = await mod.getMessagesByConversation('conv_bev_chat', 5);
    status.message_count = msgs.length;
  } catch (err) {
    status.message_count = 'error: ' + err.message;
  }

  return NextResponse.json(status);
}

import { NextResponse } from 'next/server';
import { get } from '@vercel/global-config';

export const config = { matcher: '/welcome' };

export async function proxy() {
  const greeting = await get('greeting');
  return NextResponse.json(greeting);
}

import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/auth';

function homeUrl() {
  return new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
}

export async function POST() {
  await destroyAdminSession();
  return NextResponse.redirect(homeUrl());
}

export async function GET() {
  await destroyAdminSession();
  return NextResponse.redirect(homeUrl());
}

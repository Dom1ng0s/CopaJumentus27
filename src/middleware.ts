// Só admins entram em /admin, no pote (/sorteio) e na cerimônia.

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ADMIN, tokenValido } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/entrar') return NextResponse.next();
  if (await tokenValido(req.cookies.get(COOKIE_ADMIN)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/admin/entrar';
  url.search = `?volta=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/sorteio', '/cerimonia'],
};

// Só admins entram em /admin, no pote (/sorteio) e na cerimônia.
// Aqui só se confere assinatura e validade do cookie (sem banco, roda no edge);
// conta ativa, versão da sessão e troca pendente são conferidas por exigirAdmin().

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ADMIN, lerSessao, segredoDaSessao } from '@/lib/auth/sessao';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/entrar') return NextResponse.next();
  if (await lerSessao(req.cookies.get(COOKIE_ADMIN)?.value, segredoDaSessao())) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/admin/entrar';
  url.search = `?volta=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/sorteio', '/cerimonia'],
};

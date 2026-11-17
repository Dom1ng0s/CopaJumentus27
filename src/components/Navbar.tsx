'use client';

// Barra de transmissão: brasão oficial como assinatura à esquerda, links em
// Barlow Condensed e filete dourado na base (manual, "Cabeçalho padrão").

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: Array<{ href: string; rotulo: string; curto?: string }> = [
  { href: '/', rotulo: 'Início' },
  { href: '/classificacao', rotulo: 'Tabela' },
  { href: '/jogos', rotulo: 'Jogos' },
  { href: '/rankings', rotulo: 'Rankings', curto: 'Ranking' },
  { href: '/equipes', rotulo: 'Equipes', curto: 'Times' },
  { href: '/admin', rotulo: 'Admin' },
];

export function Navbar() {
  const pathname = usePathname();
  // Dentro do histórico (/edicoes/<slug>/...), os links ficam na mesma edição.
  const edicao = /^\/edicoes\/[^/]+/.exec(pathname)?.[0] ?? '';
  const caminho = edicao ? pathname.slice(edicao.length) || '/' : pathname;

  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div
        className="mx-auto flex w-full items-center gap-2 px-2 sm:px-6"
        style={{ background: 'rgba(6, 18, 42, 0.92)', backdropFilter: 'blur(14px)' }}
      >
        {/* No celular o brasão fica e o nome sai, para os 6 links caberem. */}
        <Link href="/" className="flex shrink-0 items-center gap-2 py-2" aria-label="Copa Jumentus — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imagens/logo/copa-jumentus-logo.png" alt="" width={30} height={41} className="h-10 w-auto" />
          <span className="titulo-hero t-sm hidden text-xl text-text-1 md:block">
            Copa <span style={{ color: 'var(--accent)' }}>Jumentus</span>
          </span>
        </Link>

        <div className="ml-auto flex items-stretch self-stretch">
          {LINKS.map((l) => {
            const href = edicao && l.href !== '/admin' ? (l.href === '/' ? edicao : edicao + l.href) : l.href;
            const ativo = l.href === '/' ? caminho === '/' : caminho.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className="relative flex items-center px-[6px] font-mono text-[13px] font-bold uppercase tracking-[0.04em] transition-colors duration-200 ease-hud sm:px-3 sm:text-[15px] sm:tracking-[0.07em]"
                style={{ color: ativo ? 'var(--text1)' : 'var(--text2)' }}
              >
                <span className="sm:hidden">{l.curto ?? l.rotulo}</span>
                <span className="hidden sm:inline">{l.rotulo}</span>
                {ativo && (
                  <span className="absolute inset-x-1 bottom-0 h-[3px] sm:inset-x-2" style={{ backgroundImage: 'var(--gradient-leonida)' }} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="filete !h-[2px] opacity-80" aria-hidden="true" />
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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

  return (
    <nav className="fixed inset-x-0 top-4 z-50 flex justify-center px-2 sm:px-4">
      <div
        className="flex w-full max-w-5xl items-center gap-1 rounded-full border border-hud px-1 py-2 sm:gap-3 sm:px-4"
        style={{ background: 'rgba(11, 7, 22, 0.85)', backdropFilter: 'blur(16px)' }}
      >
        {/* No celular o logo sai para os 6 links caberem; "Início" leva à home. */}
        <Link href="/" className="hidden shrink-0 px-2 sm:block">
          <span className="titulo-hero t-sm texto-gradiente text-lg sm:text-xl">JUMENTUS</span>
        </Link>

        <div className="flex w-full items-center justify-between gap-0 sm:ml-auto sm:w-auto sm:justify-start sm:gap-2">
          {LINKS.map((l) => {
            const ativo = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="hud-label shrink-0 rounded-full px-[6px] py-1.5 !tracking-[0.04em] transition-colors duration-200 ease-hud sm:px-3 sm:!tracking-[0.12em]"
                style={
                  ativo
                    ? { color: '#fff', background: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)' }
                    : undefined
                }
              >
                <span className="sm:hidden">{l.curto ?? l.rotulo}</span>
                <span className="hidden sm:inline">{l.rotulo}</span>
              </Link>
            );
          })}
          <RelogioLeonida />
        </div>
      </div>
    </nav>
  );
}

/** Badge de imersao: relogio + caixinha da copa (design system §4.D). */
function RelogioLeonida() {
  const [hora, setHora] = useState<string>('--:--');

  useEffect(() => {
    const tick = () =>
      setHora(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ml-1 hidden items-center gap-3 border-l border-hud pl-3 sm:flex">
      <span className="font-mono text-xs text-text-2">{hora}</span>
      <span className="font-mono text-xs font-bold text-success">$1.450.920</span>
    </div>
  );
}

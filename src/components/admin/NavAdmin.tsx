'use client';

// Menu do admin: uma linha só. No celular rola na horizontal (em vez de 5 linhas
// de botões), com o item ativo em dourado e trazido para a vista.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export interface ItemAdmin {
  href: string;
  rotulo: string;
}

export function NavAdmin({ itens }: { itens: readonly ItemAdmin[] }) {
  const pathname = usePathname();
  const ativoRef = useRef<HTMLAnchorElement>(null);
  const ativo = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  useEffect(() => {
    ativoRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1 sm:w-auto sm:flex-wrap">
        {itens.map((i) => {
          const atual = ativo(i.href);
          return (
            <li key={i.href}>
              <Link
                ref={atual ? ativoRef : undefined}
                href={i.href}
                aria-current={atual ? 'page' : undefined}
                className="relative flex min-h-[2.75rem] items-center px-3 font-mono text-[15px] font-bold uppercase tracking-[0.06em] transition-colors duration-150"
                style={{ color: atual ? 'var(--dourado-claro)' : 'var(--text2)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                {i.rotulo}
                {atual && <span className="absolute inset-x-3 bottom-0 h-[3px]" style={{ backgroundImage: 'var(--gradient-leonida)' }} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

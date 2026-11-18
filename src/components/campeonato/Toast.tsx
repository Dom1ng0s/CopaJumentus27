'use client';

// Confirmação de ação ("Partida salva", "Horários gerados"): materializa no rodapé
// da tela, fica alguns segundos e some. Tira o ?ok= da URL para não reaparecer
// ao recarregar. Erros continuam fixos na página (Aviso), porque pedem leitura.

import { useEffect, useState } from 'react';

const DURACAO_MS = 4500;

export function Toast({ texto }: { texto: string }) {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('ok')) {
      url.searchParams.delete('ok');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    const t = window.setTimeout(() => setVisivel(false), DURACAO_MS);
    return () => window.clearTimeout(t);
  }, [texto]);

  if (!visivel) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <p
        role="status"
        className="toast hud-card pointer-events-auto flex max-w-md items-center gap-3 border-l-[6px] px-4 py-3 text-sm font-semibold text-text-1 shadow-3"
        style={{ borderLeftColor: 'var(--accent)', background: 'var(--surface2)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent)' }}>
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{texto}</span>
        <button
          type="button"
          onClick={() => setVisivel(false)}
          className="-mr-1 ml-1 flex h-8 w-8 shrink-0 items-center justify-center text-text-2 hover:text-text-1"
          aria-label="Fechar aviso"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </p>
    </div>
  );
}

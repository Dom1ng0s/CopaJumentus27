'use client';

// Rankings no celular: uma categoria por vez, em abas (antes eram 5 listas
// empilhadas, mais de 3.000 px). No desktop, todas lado a lado na grade.

import { useState } from 'react';

export interface AbaRanking {
  id: string;
  titulo: string;
  conteudo: React.ReactNode;
}

export function AbasRankings({ abas }: { abas: AbaRanking[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.id);
  return (
    <>
      <div
        role="tablist"
        aria-label="Categorias"
        className="sticky top-[58px] z-30 -mx-4 flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
        style={{ background: 'rgba(6, 18, 42, 0.94)', backdropFilter: 'blur(12px)' }}
      >
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`aba-${a.id}`}
            aria-selected={ativa === a.id}
            aria-controls={`painel-${a.id}`}
            onClick={() => setAtiva(a.id)}
            className="btn-mini !min-h-[2.5rem] flex-none whitespace-nowrap"
            style={ativa === a.id ? { borderColor: 'var(--accent)', color: 'var(--dourado-claro)', background: 'var(--accent-subtle)' } : undefined}
          >
            {a.titulo}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {abas.map((a) => (
          <div
            key={a.id}
            role="tabpanel"
            id={`painel-${a.id}`}
            aria-labelledby={`aba-${a.id}`}
            className={ativa === a.id ? '' : 'hidden lg:block'}
          >
            {a.conteudo}
          </div>
        ))}
      </div>
    </>
  );
}

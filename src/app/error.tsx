'use client';

// Erro inesperado: mensagem curta no padrão da Copa, com "tentar de novo".
// Erros de regra (placar, súmula) continuam aparecendo na própria tela.
// Aba aberta antes de um deploy (server action desconhecida): recarrega a tela
// uma vez e avisa no carregamento seguinte (AvisoAtualizacao).

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Cabecalho } from '@/components/campeonato/ui';
import { CHAVE_RECARGA, ehAcaoDesatualizada, podeRecarregar } from '@/lib/atualizacao';

function ultimaRecarga(): number | null {
  try {
    const v = window.sessionStorage.getItem(CHAVE_RECARGA);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const desatualizada = ehAcaoDesatualizada(error);
  const [recarregando, setRecarregando] = useState(false);

  useEffect(() => {
    if (!desatualizada) return;
    const agora = Date.now();
    if (!podeRecarregar(agora, ultimaRecarga())) return;
    try {
      window.sessionStorage.setItem(CHAVE_RECARGA, String(agora));
    } catch {
      // Sem sessionStorage, recarrega do mesmo jeito (o aviso só não aparece).
    }
    setRecarregando(true);
    window.location.reload();
  }, [desatualizada]);

  if (recarregando) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-20">
        <Cabecalho titulo="Site atualizado" legenda="Recarregando esta tela…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <Cabecalho
        titulo="Falta técnica"
        legenda={
          desatualizada
            ? 'O site foi atualizado enquanto esta tela estava aberta. Recarregue a página e refaça a última ação.'
            : 'Algo deu errado ao carregar esta tela. Tente de novo em alguns segundos.'
        }
      />
      <div className="flex flex-wrap gap-3">
        {desatualizada ? (
          <button type="button" onClick={() => window.location.reload()} className="btn-cta">
            <span>Recarregar</span>
          </button>
        ) : (
          <button type="button" onClick={reset} className="btn-cta">
            <span>Tentar de novo</span>
          </button>
        )}
        <Link href="/" className="btn-hud">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}

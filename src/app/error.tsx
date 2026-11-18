'use client';

// Erro inesperado: mensagem curta no padrão da Copa, com "tentar de novo".
// Erros de regra (placar, súmula) continuam aparecendo na própria tela.

import Link from 'next/link';
import { Cabecalho } from '@/components/campeonato/ui';

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <Cabecalho titulo="Falta técnica" legenda="Algo deu errado ao carregar esta tela. Tente de novo em alguns segundos." />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn-cta">
          <span>Tentar de novo</span>
        </button>
        <Link href="/" className="btn-hud">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}

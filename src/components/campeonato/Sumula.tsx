// Linha do tempo da súmula, usada na página pública e no painel do admin.

import type { Campeonato, EventoPartida, Partida } from '@/lib/domain/campeonato/tipos';
import { Cartao } from './ui';

function Icone({ tipo }: { tipo: EventoPartida['tipo'] }) {
  if (tipo === 'amarelo') return <Cartao cor="amarelo" />;
  if (tipo === 'vermelho') return <Cartao cor="vermelho" />;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ color: tipo === 'gol-contra' ? 'var(--error-text)' : 'var(--accent)' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
    </svg>
  );
}

const TEXTO: Record<EventoPartida['tipo'], string> = {
  gol: 'Gol',
  'gol-contra': 'Gol contra',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
};

export function Sumula({
  partida,
  campeonato,
  acao,
}: {
  partida: Partida;
  campeonato: Campeonato;
  /** Botão extra por evento (ex.: remover, no admin). */
  acao?: (evento: EventoPartida) => React.ReactNode;
}) {
  const nome = (id?: string) => campeonato.jogadores.find((j) => j.id === id)?.nome ?? '—';
  const eventos = [...partida.eventos].sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999));

  if (eventos.length === 0) return <p className="text-sm text-text-3">Nenhum evento registrado.</p>;

  return (
    <ul className="divide-y divide-[var(--panel-stroke)]">
      {eventos.map((e) => {
        const doMandante = e.equipeId === partida.mandanteId;
        return (
          <li key={e.id} className={`flex items-center gap-3 py-2 ${doMandante ? '' : 'flex-row-reverse text-right'}`}>
            <span className="numero w-10 shrink-0 text-center text-xl text-text-3">{e.minuto ? `${e.minuto}'` : ''}</span>
            <Icone tipo={e.tipo} />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{nome(e.jogadorId)}</span>
              <span className="text-text-3"> · {TEXTO[e.tipo]}</span>
              {e.assistenciaId && <span className="block text-xs text-text-3">assist. {nome(e.assistenciaId)}</span>}
            </span>
            {acao?.(e)}
          </li>
        );
      })}
    </ul>
  );
}

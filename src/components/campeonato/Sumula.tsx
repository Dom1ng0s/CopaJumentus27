// Linha do tempo da súmula, usada na página pública e no painel do admin.

import type { Campeonato, EventoPartida, Partida } from '@/lib/domain/campeonato/tipos';

const ICONE: Record<EventoPartida['tipo'], string> = {
  gol: '⚽',
  'gol-contra': '⚽',
  amarelo: '🟨',
  vermelho: '🟥',
};

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
            <span className="w-10 shrink-0 text-center font-mono text-xs text-text-3">{e.minuto ? `${e.minuto}'` : ''}</span>
            <span aria-hidden="true">{ICONE[e.tipo]}</span>
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

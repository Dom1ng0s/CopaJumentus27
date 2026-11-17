// Linha do tempo da súmula, usada na página pública e no painel do admin.

import type { Campeonato, EventoPartida, Partida } from '@/lib/domain/campeonato/tipos';
import { goleiroDaPartida } from '@/lib/domain/campeonato/rankings';
import { Cartao } from './ui';

function Icone({ tipo }: { tipo: EventoPartida['tipo'] }) {
  if (tipo === 'amarelo') return <Cartao cor="amarelo" />;
  if (tipo === 'vermelho') return <Cartao cor="vermelho" />;
  if (tipo === 'defesa') {
    // Luva estilizada: palma e quatro dedos.
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--text2)' }}>
        <path d="M6 13V7a1.5 1.5 0 013 0v4V5a1.5 1.5 0 013 0v6V6a1.5 1.5 0 013 0v6V8a1.5 1.5 0 013 0v7a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L3.6 14a1.5 1.5 0 012.4-1.8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tipo === 'penalti_perdido') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--error-text)' }}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ color: tipo === 'gol-contra' ? 'var(--error-text)' : 'var(--accent)' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
    </svg>
  );
}

export const TEXTO_EVENTO: Record<EventoPartida['tipo'], string> = {
  gol: 'Gol',
  gol_penalti: 'Gol de pênalti',
  'gol-contra': 'Gol contra',
  penalti_perdido: 'Pênalti perdido',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
  defesa: 'Defesa',
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
  const goleiroM = goleiroDaPartida(partida, 'mandante', campeonato.jogadores);
  const goleiroV = goleiroDaPartida(partida, 'visitante', campeonato.jogadores);
  const penaltis = partida.golsMandante === partida.golsVisitante && (partida.penaltisMandante !== undefined || partida.penaltisVisitante !== undefined);

  return (
    <div className="space-y-4">
      {(goleiroM || goleiroV || penaltis) && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-hud pb-3 text-sm">
          <div>
            <dt className="hud-label !text-[11px]">Goleiro</dt>
            <dd className="font-semibold">{goleiroM ? nome(goleiroM) : 'A definir'}</dd>
          </div>
          <div className="text-right">
            <dt className="hud-label !text-[11px]">Goleiro</dt>
            <dd className="font-semibold">{goleiroV ? nome(goleiroV) : 'A definir'}</dd>
          </div>
          {penaltis && (
            <div className="col-span-2 text-center">
              <dt className="hud-label !text-[11px]">Disputa de pênaltis</dt>
              <dd className="numero text-3xl">
                {partida.penaltisMandante ?? 0} – {partida.penaltisVisitante ?? 0}
              </dd>
            </div>
          )}
        </dl>
      )}
      {eventos.length === 0 ? <p className="text-sm text-text-3">Nenhum evento registrado.</p> : (
    <ul className="divide-y divide-[var(--panel-stroke)]">
      {eventos.map((e) => {
        const doMandante = e.equipeId === partida.mandanteId;
        return (
          <li key={e.id} className={`flex items-center gap-3 py-2 ${doMandante ? '' : 'flex-row-reverse text-right'}`}>
            <span className="numero w-10 shrink-0 text-center text-xl text-text-3">{e.minuto ? `${e.minuto}'` : ''}</span>
            <Icone tipo={e.tipo} />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{nome(e.jogadorId)}</span>
              <span className="text-text-3"> · {TEXTO_EVENTO[e.tipo]}</span>
              {e.assistenciaId && <span className="block text-xs text-text-3">assist. {nome(e.assistenciaId)}</span>}
            </span>
            {acao?.(e)}
          </li>
        );
      })}
    </ul>
      )}
    </div>
  );
}

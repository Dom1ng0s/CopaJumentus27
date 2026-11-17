// Rankings individuais, calculados da súmula (eventos das partidas ao vivo e encerradas).
// Filtro por fase: passe só as partidas da fase.

import type { JogadorCampeonato, Partida } from './tipos';

export interface ItemRanking {
  jogadorId: string;
  valor: number;
}

export interface ItemCartoes {
  jogadorId: string;
  amarelos: number;
  vermelhos: number;
}

function contar(partidas: readonly Partida[], escolher: (p: Partida) => Array<string | undefined>): ItemRanking[] {
  const total = new Map<string, number>();
  for (const p of partidas) {
    if (p.status === 'agendada') continue;
    for (const id of escolher(p)) {
      if (id) total.set(id, (total.get(id) ?? 0) + 1);
    }
  }
  return [...total.entries()]
    .map(([jogadorId, valor]) => ({ jogadorId, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/** Gol e gol de pênalti contam; gol contra não entra na artilharia. */
export function artilharia(partidas: readonly Partida[]): ItemRanking[] {
  return contar(partidas, (p) => p.eventos.filter((e) => e.tipo === 'gol' || e.tipo === 'gol_penalti').map((e) => e.jogadorId));
}

export function assistencias(partidas: readonly Partida[]): ItemRanking[] {
  return contar(partidas, (p) => p.eventos.filter((e) => e.tipo === 'gol').map((e) => e.assistenciaId));
}

/** Ordena por vermelhos e depois por amarelos. */
export function cartoes(partidas: readonly Partida[]): ItemCartoes[] {
  const total = new Map<string, ItemCartoes>();
  for (const p of partidas) {
    if (p.status === 'agendada') continue;
    for (const e of p.eventos) {
      if (e.tipo !== 'amarelo' && e.tipo !== 'vermelho') continue;
      const item = total.get(e.jogadorId) ?? { jogadorId: e.jogadorId, amarelos: 0, vermelhos: 0 };
      if (e.tipo === 'amarelo') item.amarelos += 1;
      else item.vermelhos += 1;
      total.set(e.jogadorId, item);
    }
  }
  return [...total.values()].sort((a, b) => b.vermelhos - a.vermelhos || b.amarelos - a.amarelos);
}

export interface ItemPenalidades {
  jogadorId: string;
  convertidos: number;
  perdidos: number;
}

/** Pênaltis durante o jogo (a disputa por pênaltis não entra: é só placar). */
export function penalidades(partidas: readonly Partida[]): ItemPenalidades[] {
  const total = new Map<string, ItemPenalidades>();
  for (const p of partidas) {
    if (p.status === 'agendada') continue;
    for (const e of p.eventos) {
      if (e.tipo !== 'gol_penalti' && e.tipo !== 'penalti_perdido') continue;
      const item = total.get(e.jogadorId) ?? { jogadorId: e.jogadorId, convertidos: 0, perdidos: 0 };
      if (e.tipo === 'gol_penalti') item.convertidos += 1;
      else item.perdidos += 1;
      total.set(e.jogadorId, item);
    }
  }
  return [...total.values()].sort((a, b) => b.convertidos - a.convertidos || a.perdidos - b.perdidos);
}

/**
 * Goleiro de um lado da partida: o registrado na súmula; sem registro, o único
 * goleiro (posição GOL) do elenco, se houver exatamente um.
 */
export function goleiroDaPartida(p: Partida, lado: 'mandante' | 'visitante', jogadores: readonly JogadorCampeonato[]): string | undefined {
  const registrado = lado === 'mandante' ? p.goleiroMandanteId : p.goleiroVisitanteId;
  if (registrado) return registrado;
  const equipeId = lado === 'mandante' ? p.mandanteId : p.visitanteId;
  const goleiros = jogadores.filter((j) => j.equipeId === equipeId && j.posicao === 'GOL');
  return goleiros.length === 1 ? goleiros[0].id : undefined;
}

export interface ItemGoleiro {
  jogadorId: string;
  jogos: number;
  golsSofridos: number;
  /** Gols sofridos por jogo, uma casa decimal. */
  media: number;
  semSofrerGol: number;
  defesas: number;
}

/**
 * Goleiros: só partidas encerradas (jogo sem sofrer gol só existe no fim).
 * Ordena por menos gols sofridos por jogo, depois mais jogos.
 */
export function goleiros(partidas: readonly Partida[], jogadores: readonly JogadorCampeonato[]): ItemGoleiro[] {
  const total = new Map<string, ItemGoleiro>();
  const item = (id: string) => {
    let i = total.get(id);
    if (!i) {
      i = { jogadorId: id, jogos: 0, golsSofridos: 0, media: 0, semSofrerGol: 0, defesas: 0 };
      total.set(id, i);
    }
    return i;
  };
  for (const p of partidas) {
    if (p.status !== 'encerrada') continue;
    for (const [lado, sofridos] of [
      ['mandante', p.golsVisitante],
      ['visitante', p.golsMandante],
    ] as const) {
      const id = goleiroDaPartida(p, lado, jogadores);
      if (!id) continue;
      const g = item(id);
      g.jogos += 1;
      g.golsSofridos += sofridos;
      if (sofridos === 0) g.semSofrerGol += 1;
    }
    for (const e of p.eventos) if (e.tipo === 'defesa') item(e.jogadorId).defesas += 1;
  }
  for (const g of total.values()) g.media = g.jogos ? Math.round((g.golsSofridos / g.jogos) * 10) / 10 : 0;
  return [...total.values()]
    .filter((g) => g.jogos > 0)
    .sort((a, b) => a.golsSofridos / a.jogos - b.golsSofridos / b.jogos || b.jogos - a.jogos || b.defesas - a.defesas);
}

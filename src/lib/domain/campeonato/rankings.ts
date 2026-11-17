// Rankings individuais, calculados da súmula (eventos das partidas ao vivo e encerradas).

import type { Partida } from './tipos';

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

/** Gols contra não entram na artilharia. */
export function artilharia(partidas: readonly Partida[]): ItemRanking[] {
  return contar(partidas, (p) => p.eventos.filter((e) => e.tipo === 'gol').map((e) => e.jogadorId));
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

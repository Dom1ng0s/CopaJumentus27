// Sorteio de grupos e geração de rodadas (todos contra todos).

import { shuffle, type FonteAleatoria, fonteCrypto } from '@/lib/domain/random';

/**
 * Distribui as equipes em `quantidade` grupos de forma aleatória.
 * Tamanhos ficam equilibrados (diferença máxima de 1).
 */
export function sortearGrupos(
  equipeIds: readonly string[],
  quantidade: number,
  fonte: FonteAleatoria = fonteCrypto,
): string[][] {
  if (quantidade < 1) throw new Error('sortearGrupos: quantidade deve ser pelo menos 1');
  const grupos: string[][] = Array.from({ length: quantidade }, () => []);
  shuffle(equipeIds, fonte).forEach((id, i) => grupos[i % quantidade].push(id));
  return grupos;
}

/** Nomes padrão: Grupo A, Grupo B, ... */
export function nomeGrupo(indice: number): string {
  return `Grupo ${String.fromCharCode(65 + indice)}`;
}

/**
 * Todos contra todos em turno único (método do círculo).
 * Retorna as rodadas; cada rodada é uma lista de confrontos [mandante, visitante].
 * Com número ímpar de equipes, uma folga por rodada.
 */
export function gerarRodadas(equipeIds: readonly string[]): Array<Array<[string, string]>> {
  const ids: Array<string | null> = [...equipeIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(null);

  const n = ids.length;
  const rodadas: Array<Array<[string, string]>> = [];
  let giro = [...ids];

  for (let r = 0; r < n - 1; r++) {
    const rodada: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = giro[i];
      const b = giro[n - 1 - i];
      if (a && b) rodada.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rodadas.push(rodada);
    // Fixa o primeiro e gira o resto.
    giro = [giro[0], giro[n - 1], ...giro.slice(1, n - 1)];
  }
  return rodadas;
}

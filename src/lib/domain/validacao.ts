// As invariantes de CLAUDE.md §3.3 como funcoes.
// Toda invariante aqui tem teste. Nada e exibido ao operador sem passar por validarSorteio.

import { TOLERANCIA_ESTRELAS } from '@/lib/config';
import type { Alocacao, Jogador, Time } from './tipos';

export interface Violacao {
  invariante: 1 | 2 | 3 | 4;
  mensagem: string;
}

interface EntradaValidacao {
  jogadores: readonly Jogador[];
  times: readonly Time[];
  alocacoesLinha: readonly Alocacao[];
}

/** Soma de estrelas por time: capitao + jogadores de linha. Goleiro nao conta. */
export function somasDeEstrelas(
  jogadores: readonly Jogador[],
  times: readonly Time[],
  alocacoesLinha: readonly Alocacao[],
): Map<string, number> {
  const porId = new Map(jogadores.map((j) => [j.id, j]));
  const somas = new Map<string, number>();

  for (const time of times) {
    const capitao = porId.get(time.capitaoId);
    somas.set(time.id, capitao ? capitao.estrelas : 0);
  }
  for (const a of alocacoesLinha) {
    const jogador = porId.get(a.jogadorId);
    if (!jogador) continue;
    somas.set(a.timeId, (somas.get(a.timeId) ?? 0) + jogador.estrelas);
  }
  return somas;
}

export function amplitude(somas: Map<string, number>): number {
  const valores = [...somas.values()];
  if (valores.length === 0) return 0;
  return Math.max(...valores) - Math.min(...valores);
}

/** Pote de linha: jogadores de linha que nao sao capitaes (CLAUDE.md §3.3). */
export function poteDeLinha(jogadores: readonly Jogador[]): Jogador[] {
  return jogadores.filter((j) => j.posicao !== 'GOL' && !j.ehCapitao);
}

export function poteDeGoleiros(jogadores: readonly Jogador[]): Jogador[] {
  return jogadores.filter((j) => j.posicao === 'GOL' && !j.ehCapitao);
}

export function validarSorteio({
  jogadores,
  times,
  alocacoesLinha,
}: EntradaValidacao): Violacao[] {
  const violacoes: Violacao[] = [];
  const pote = poteDeLinha(jogadores);

  // Invariante 1: todo jogador de linha nao-capitao alocado a exatamente um time.
  const contagem = new Map<string, number>();
  for (const a of alocacoesLinha) {
    contagem.set(a.jogadorId, (contagem.get(a.jogadorId) ?? 0) + 1);
  }
  const naoAlocados = pote.filter((j) => !contagem.has(j.id));
  const duplicados = [...contagem.entries()].filter(([, n]) => n > 1);
  if (naoAlocados.length > 0) {
    violacoes.push({
      invariante: 1,
      mensagem: `${naoAlocados.length} jogador(es) do pote ficaram sem time: ${naoAlocados
        .map((j) => j.apelido ?? j.nome)
        .join(', ')}`,
    });
  }
  if (duplicados.length > 0) {
    violacoes.push({
      invariante: 1,
      mensagem: `${duplicados.length} jogador(es) alocados em mais de um time`,
    });
  }

  // Invariante 2: diferenca de tamanho de elenco no maximo 1.
  const tamanhos = new Map<string, number>(times.map((t) => [t.id, 0]));
  for (const a of alocacoesLinha) {
    tamanhos.set(a.timeId, (tamanhos.get(a.timeId) ?? 0) + 1);
  }
  const valoresTamanho = [...tamanhos.values()];
  const difTamanho = Math.max(...valoresTamanho) - Math.min(...valoresTamanho);
  if (difTamanho > 1) {
    violacoes.push({
      invariante: 2,
      mensagem: `Elencos desequilibrados em tamanho: diferenca de ${difTamanho} jogadores`,
    });
  }

  // Invariante 3: amplitude de estrelas dentro da tolerancia.
  const amp = amplitude(somasDeEstrelas(jogadores, times, alocacoesLinha));
  if (amp > TOLERANCIA_ESTRELAS) {
    violacoes.push({
      invariante: 3,
      mensagem: `Amplitude de estrelas ${amp} acima da tolerancia ${TOLERANCIA_ESTRELAS}`,
    });
  }

  // Invariante 4: capitao nunca realocado.
  const capitaesPorTime = new Set(times.map((t) => t.capitaoId));
  const capitaoRealocado = alocacoesLinha.filter((a) => capitaesPorTime.has(a.jogadorId));
  if (capitaoRealocado.length > 0) {
    violacoes.push({
      invariante: 4,
      mensagem: `${capitaoRealocado.length} capitao(es) apareceram no sorteio de linha`,
    });
  }

  return violacoes;
}

// Sorteio com composicao identica: todo time recebe a mesma quantidade de
// jogadores de cada nivel (decisao do operador em 19/11/2026). Revelado em ordem
// aleatoria. Fonte: CLAUDE.md §3.3 e §3.4.
// PURO: sem React, sem DOM, sem IO. Nunca muta a entrada.

import { calcularCotas } from './cotas';
import { fonteCrypto, shuffle, type FonteAleatoria } from './random';
import type { Alocacao, Jogador, Sorteio, Time } from './tipos';
import { poteDeGoleiros, poteDeLinha, validarSorteio } from './validacao';

export interface EntradaSorteio {
  jogadores: readonly Jogador[];
  times: readonly Time[];
}

export interface ResultadoSorteioOk {
  ok: true;
  sorteio: Sorteio;
  /** Violacoes remanescentes. Vazio = resultado limpo. */
  violacoes: ReturnType<typeof validarSorteio>;
}

/** Cotas de estrela que nao fecham: nao sorteia e devolve a pendencia por nivel. */
export interface ResultadoSorteioPendente {
  ok: false;
  pendencias: string[];
}

export type ResultadoSorteio = ResultadoSorteioOk | ResultadoSorteioPendente;

export function sortear(
  { jogadores, times }: EntradaSorteio,
  fonte: FonteAleatoria = fonteCrypto,
): ResultadoSorteio {
  if (times.length === 0) throw new Error('sortear: nenhum time cadastrado');

  const cotas = calcularCotas(jogadores, times.length);
  if (!cotas.fechou) return { ok: false, pendencias: cotas.pendencias };

  // Em cada nivel, embaralha e entrega em blocos: cada time recebe as suas vagas
  // daquele nivel. A aleatoriedade e quem cai em qual time.
  const pote = poteDeLinha(jogadores);
  const divisao: Alocacao[] = [];
  for (const { nivel, porTime } of cotas.niveis) {
    const doNivel = shuffle(
      pote.filter((j) => j.estrelas === nivel),
      fonte,
    );
    const ordemTimes = shuffle(times, fonte);
    doNivel.forEach((jogador, i) => {
      divisao.push({ jogadorId: jogador.id, timeId: ordemTimes[Math.floor(i / porTime)].id, etapa: 'linha' });
    });
  }

  // A divisao fica pronta aqui; a ordem de revelacao e embaralhada de novo, para a
  // cerimonia nao seguir os niveis (decisao do operador em 18/11/2026).
  const alocacoesLinha = shuffle(divisao, fonte);

  // ---- Etapa separada: goleiros (CLAUDE.md §3.4) ----
  const goleirosEmbaralhados = shuffle(poteDeGoleiros(jogadores), fonte);
  const timesEmbaralhados = shuffle(times, fonte);
  const alocacoesGoleiros: Alocacao[] = [];
  const timesSemGoleiroIds: string[] = [];

  timesEmbaralhados.forEach((time, i) => {
    const goleiro = goleirosEmbaralhados[i];
    if (goleiro) {
      alocacoesGoleiros.push({ jogadorId: goleiro.id, timeId: time.id, etapa: 'goleiro' });
    } else {
      timesSemGoleiroIds.push(time.id);
    }
  });

  const goleirosReservaIds = goleirosEmbaralhados.slice(timesEmbaralhados.length).map((g) => g.id);

  const sorteio: Sorteio = {
    geradoEm: new Date().toISOString(),
    linha: alocacoesLinha,
    goleiros: alocacoesGoleiros,
    goleirosReservaIds,
    timesSemGoleiroIds,
  };

  return {
    ok: true,
    sorteio,
    violacoes: validarSorteio({ jogadores, times, alocacoesLinha }),
  };
}

/** Monta os elencos finais a partir de um sorteio. Usado pela UI e pela pagina de resultado. */
export function montarElencos(
  jogadores: readonly Jogador[],
  times: readonly Time[],
  sorteio: Sorteio,
  /** Quantas alocacoes de linha ja foram reveladas (para a cerimonia). */
  reveladasLinha: number = sorteio.linha.length,
  reveladasGoleiros: number = sorteio.goleiros.length,
) {
  const porId = new Map(jogadores.map((j) => [j.id, j]));
  const linhaVisivel = sorteio.linha.slice(0, reveladasLinha);
  const goleirosVisiveis = sorteio.goleiros.slice(0, reveladasGoleiros);

  return times.map((time) => {
    const linha = linhaVisivel
      .filter((a) => a.timeId === time.id)
      .map((a) => porId.get(a.jogadorId))
      .filter((j): j is Jogador => Boolean(j));

    const alocGoleiro = goleirosVisiveis.find((a) => a.timeId === time.id);
    const goleiro = alocGoleiro ? porId.get(alocGoleiro.jogadorId) ?? null : null;

    return {
      time,
      goleiro,
      linha,
      somaEstrelas: linha.reduce((s, j) => s + j.estrelas, 0),
    };
  });
}

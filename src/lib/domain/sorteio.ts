// Sorteio balanceado — serpentina aleatorizada, revelada em ordem aleatoria.
// Fonte: CLAUDE.md §3.3 e §3.4
// PURO: sem React, sem DOM, sem IO. Nunca muta a entrada.

import { ESTRELAS_MAX, ESTRELAS_MIN, MAX_TENTATIVAS, TOLERANCIA_ESTRELAS } from '@/lib/config';
import { fonteCrypto, shuffle, type FonteAleatoria } from './random';
import type { Alocacao, Jogador, Sorteio, Time } from './tipos';
import {
  amplitude,
  poteDeGoleiros,
  poteDeLinha,
  somasDeEstrelas,
  validarSorteio,
} from './validacao';

export interface EntradaSorteio {
  jogadores: readonly Jogador[];
  times: readonly Time[];
}

/**
 * Uma tentativa de distribuicao de linha.
 * Percorre os niveis de estrela do mais forte para o mais fraco; dentro de cada
 * nivel os jogadores sao embaralhados (a aleatoriedade vive aqui) e entregues em
 * ordem serpentina, com o time de menor soma recebendo primeiro.
 */
function distribuirLinha(
  pote: readonly Jogador[],
  times: readonly Time[],
  somasIniciais: Map<string, number>,
  fonte: FonteAleatoria,
): Alocacao[] {
  const somas = new Map(somasIniciais);
  const tamanhos = new Map<string, number>(times.map((t) => [t.id, 0]));
  const alocacoes: Alocacao[] = [];

  // Capacidade por time, para que a invariante 2 (diferenca de tamanho <= 1)
  // nunca seja sacrificada em nome do equilibrio de estrelas: `sobra` times
  // recebem `base + 1` jogadores, os demais recebem `base`.
  const base = Math.floor(pote.length / times.length);
  const sobra = pote.length % times.length;

  for (let nivel = ESTRELAS_MAX; nivel >= ESTRELAS_MIN; nivel--) {
    const doNivel = shuffle(
      pote.filter((j) => j.estrelas === nivel),
      fonte,
    );

    for (const jogador of doNivel) {
      const noLimiteExtra = [...tamanhos.values()].filter((n) => n > base).length;

      // Elegiveis: ainda ha vaga dentro da cota do time.
      const elegiveis = times.filter((t) => {
        const n = tamanhos.get(t.id) ?? 0;
        if (n < base) return true;
        return n === base && noLimiteExtra < sobra;
      });

      // Ordem serpentina: time mais fraco recebe primeiro; empate decidido pelo
      // elenco menor, depois aleatoriamente (ja garantido pelo shuffle do nivel).
      const destino = (elegiveis.length > 0 ? elegiveis : [...times]).sort((a, b) => {
        const difSoma = (somas.get(a.id) ?? 0) - (somas.get(b.id) ?? 0);
        if (difSoma !== 0) return difSoma;
        return (tamanhos.get(a.id) ?? 0) - (tamanhos.get(b.id) ?? 0);
      })[0];

      alocacoes.push({ jogadorId: jogador.id, timeId: destino.id, etapa: 'linha' });
      somas.set(destino.id, (somas.get(destino.id) ?? 0) + jogador.estrelas);
      tamanhos.set(destino.id, (tamanhos.get(destino.id) ?? 0) + 1);
    }
  }

  return alocacoes;
}

/** Desempate entre tentativas validas: espalhamento de posicoes (objetivo secundario). */
function desvioDePosicoes(
  alocacoes: readonly Alocacao[],
  jogadores: readonly Jogador[],
  times: readonly Time[],
): number {
  const porId = new Map(jogadores.map((j) => [j.id, j]));
  const posicoes = ['ZAG', 'MEI', 'ATA'] as const;
  let desvio = 0;

  for (const pos of posicoes) {
    const contagens = times.map(
      (t) =>
        alocacoes.filter((a) => a.timeId === t.id && porId.get(a.jogadorId)?.posicao === pos)
          .length,
    );
    desvio += Math.max(...contagens) - Math.min(...contagens);
  }
  return desvio;
}

export interface ResultadoSorteio {
  sorteio: Sorteio;
  /** Violacoes remanescentes. Vazio = resultado limpo. */
  violacoes: ReturnType<typeof validarSorteio>;
}

export function sortear(
  { jogadores, times }: EntradaSorteio,
  fonte: FonteAleatoria = fonteCrypto,
): ResultadoSorteio {
  if (times.length === 0) throw new Error('sortear: nenhum time cadastrado');

  const pote = poteDeLinha(jogadores);
  const somasIniciais = somasDeEstrelas(jogadores, times, []);

  let melhor: Alocacao[] | null = null;
  let melhorAmp = Number.POSITIVE_INFINITY;
  let melhorDesvio = Number.POSITIVE_INFINITY;

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const candidato = distribuirLinha(pote, times, somasIniciais, fonte);
    const amp = amplitude(somasDeEstrelas(jogadores, times, candidato));
    const desvio = desvioDePosicoes(candidato, jogadores, times);

    const melhorouAmplitude = amp < melhorAmp;
    const empatouComMenosDesvio = amp === melhorAmp && desvio < melhorDesvio;

    if (melhorouAmplitude || empatouComMenosDesvio) {
      melhor = candidato;
      melhorAmp = amp;
      melhorDesvio = desvio;
    }

    // Dentro da tolerancia e sem desvio de posicao: nao ha o que melhorar.
    if (melhorAmp <= TOLERANCIA_ESTRELAS && melhorDesvio === 0) break;
  }

  // A divisao equilibrada fica pronta aqui; a ordem de revelacao e embaralhada
  // de novo, para a cerimonia nao mostrar os niveis do mais forte ao mais fraco
  // (decisao do operador em 18/11/2026). Os times de cada jogador nao mudam.
  const alocacoesLinha = shuffle(melhor ?? [], fonte);

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
    amplitudeEstrelas: melhorAmp === Number.POSITIVE_INFINITY ? 0 : melhorAmp,
    toleranciaEstourada: melhorAmp > TOLERANCIA_ESTRELAS,
  };

  return {
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

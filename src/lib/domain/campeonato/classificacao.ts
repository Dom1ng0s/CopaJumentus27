// Tabela de pontos corridos, calculada das partidas encerradas (nunca gravada).

import type { Criterio, Partida, Pontuacao } from './tipos';

export interface LinhaClassificacao {
  equipeId: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  /** Aproveitamento em % (0 a 100), arredondado. */
  aproveitamento: number;
}

function linhaVazia(equipeId: string): LinhaClassificacao {
  return {
    equipeId,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldo: 0,
    aproveitamento: 0,
  };
}

function somar(linha: LinhaClassificacao, pro: number, contra: number, p: Pontuacao): void {
  linha.jogos += 1;
  linha.golsPro += pro;
  linha.golsContra += contra;
  if (pro > contra) {
    linha.vitorias += 1;
    linha.pontos += p.vitoria;
  } else if (pro === contra) {
    linha.empates += 1;
    linha.pontos += p.empate;
  } else {
    linha.derrotas += 1;
    linha.pontos += p.derrota;
  }
}

/** Pontos e saldo de A contra B só nos jogos entre os dois. */
function confronto(a: string, b: string, partidas: readonly Partida[], p: Pontuacao): number {
  let pontosA = 0;
  let pontosB = 0;
  let saldoA = 0;
  for (const j of partidas) {
    const ehAB = j.mandanteId === a && j.visitanteId === b;
    const ehBA = j.mandanteId === b && j.visitanteId === a;
    if (!ehAB && !ehBA) continue;
    const golsA = ehAB ? j.golsMandante : j.golsVisitante;
    const golsB = ehAB ? j.golsVisitante : j.golsMandante;
    saldoA += golsA - golsB;
    if (golsA > golsB) {
      pontosA += p.vitoria;
      pontosB += p.derrota;
    } else if (golsA === golsB) {
      pontosA += p.empate;
      pontosB += p.empate;
    } else {
      pontosA += p.derrota;
      pontosB += p.vitoria;
    }
  }
  // Positivo = A na frente.
  return pontosA - pontosB || saldoA;
}

/**
 * Classifica as equipes pelas partidas ENCERRADAS entre elas.
 * Critérios aplicados na ordem dada; empate em todos mantém a ordem de entrada.
 */
export function calcularClassificacao(
  equipeIds: readonly string[],
  partidas: readonly Partida[],
  pontuacao: Pontuacao,
  criterios: readonly Criterio[],
): LinhaClassificacao[] {
  const linhas = new Map(equipeIds.map((id) => [id, linhaVazia(id)]));
  const validas = partidas.filter(
    (j) => j.status === 'encerrada' && linhas.has(j.mandanteId) && linhas.has(j.visitanteId),
  );

  for (const j of validas) {
    somar(linhas.get(j.mandanteId)!, j.golsMandante, j.golsVisitante, pontuacao);
    somar(linhas.get(j.visitanteId)!, j.golsVisitante, j.golsMandante, pontuacao);
  }

  for (const l of linhas.values()) {
    l.saldo = l.golsPro - l.golsContra;
    const maximo = l.jogos * pontuacao.vitoria;
    l.aproveitamento = maximo > 0 ? Math.round((l.pontos / maximo) * 100) : 0;
  }

  const ordemEntrada = new Map(equipeIds.map((id, i) => [id, i]));

  return [...linhas.values()].sort((a, b) => {
    for (const c of criterios) {
      let dif = 0;
      switch (c) {
        case 'pontos':
          dif = b.pontos - a.pontos;
          break;
        case 'vitorias':
          dif = b.vitorias - a.vitorias;
          break;
        case 'saldo':
          dif = b.saldo - a.saldo;
          break;
        case 'golsPro':
          dif = b.golsPro - a.golsPro;
          break;
        case 'golsContra':
          dif = a.golsContra - b.golsContra;
          break;
        case 'confronto':
          dif = -confronto(a.equipeId, b.equipeId, validas, pontuacao);
          break;
      }
      if (dif !== 0) return dif;
    }
    return (ordemEntrada.get(a.equipeId) ?? 0) - (ordemEntrada.get(b.equipeId) ?? 0);
  });
}

export interface ResumoJogos {
  jogos: number;
  empates: number;
  gols: number;
  mediaGols: number;
}

/** Números do painel de jogos: só partidas encerradas. */
export function resumirJogos(partidas: readonly Partida[]): ResumoJogos {
  const encerradas = partidas.filter((j) => j.status === 'encerrada');
  const gols = encerradas.reduce((s, j) => s + j.golsMandante + j.golsVisitante, 0);
  return {
    jogos: encerradas.length,
    empates: encerradas.filter((j) => j.golsMandante === j.golsVisitante).length,
    gols,
    mediaGols: encerradas.length ? Math.round((gols / encerradas.length) * 10) / 10 : 0,
  };
}

/** Vencedor de uma partida encerrada, considerando pênaltis. null = empate sem pênaltis. */
export function vencedor(j: Partida): string | null {
  if (j.status !== 'encerrada') return null;
  if (j.golsMandante !== j.golsVisitante) {
    return j.golsMandante > j.golsVisitante ? j.mandanteId : j.visitanteId;
  }
  const pm = j.penaltisMandante ?? 0;
  const pv = j.penaltisVisitante ?? 0;
  if (pm === pv) return null;
  return pm > pv ? j.mandanteId : j.visitanteId;
}

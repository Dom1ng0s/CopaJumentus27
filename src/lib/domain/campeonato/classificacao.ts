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

export interface LinhaClassificada extends LinhaClassificacao {
  /** 1 = primeiro. Equipes totalmente empatadas e sem decisão manual dividem a posição. */
  posicao: number;
  /** Empatada em todos os critérios, sem desempate manual: pendência para o admin. */
  empatada: boolean;
  amarelos: number;
  vermelhos: number;
}

export interface OpcoesClassificacao {
  /** Ordens decididas à mão para grupos totalmente empatados (Fase.desempates). */
  desempates?: readonly (readonly string[])[];
}

/**
 * Minitabela do confronto direto: pontos e depois saldo só nos jogos entre as
 * equipes do grupo. Com 2 equipes é o confronto simples.
 */
function minitabela(ids: readonly string[], partidas: readonly Partida[], p: Pontuacao): Map<string, [number, number]> {
  const dentro = new Set(ids);
  const t = new Map(ids.map((id) => [id, [0, 0] as [number, number]]));
  for (const j of partidas) {
    if (!j.mandanteId || !j.visitanteId || !dentro.has(j.mandanteId) || !dentro.has(j.visitanteId)) continue;
    const m = t.get(j.mandanteId)!;
    const v = t.get(j.visitanteId)!;
    m[1] += j.golsMandante - j.golsVisitante;
    v[1] += j.golsVisitante - j.golsMandante;
    if (j.golsMandante > j.golsVisitante) {
      m[0] += p.vitoria;
      v[0] += p.derrota;
    } else if (j.golsMandante === j.golsVisitante) {
      m[0] += p.empate;
      v[0] += p.empate;
    } else {
      m[0] += p.derrota;
      v[0] += p.vitoria;
    }
  }
  return t;
}

/** Quebra uma lista ordenada em blocos de chave igual. */
function blocos<T>(itens: readonly T[], chave: (x: T) => readonly number[]): T[][] {
  const ordenados = [...itens].sort((a, b) => {
    const ka = chave(a);
    const kb = chave(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return 0;
  });
  const saida: T[][] = [];
  for (const x of ordenados) {
    const ultimo = saida[saida.length - 1];
    if (ultimo && chave(ultimo[0]).every((v, i) => v === chave(x)[i])) ultimo.push(x);
    else saida.push([x]);
  }
  return saida;
}

/**
 * Classifica as equipes pelas partidas ENCERRADAS entre elas (CLAUDE.md §8.1).
 * Os critérios são aplicados na ordem dada, sempre só entre as equipes que
 * continuam empatadas. Confronto direto: minitabela, refeita quando ela separa
 * só parte do grupo. Cartões: menos vermelhos, depois menos amarelos.
 * Empate em tudo: usa a decisão manual, se houver; senão a posição fica
 * empatada (o sistema não sorteia).
 */
export function calcularClassificacao(
  equipeIds: readonly string[],
  partidas: readonly Partida[],
  pontuacao: Pontuacao,
  criterios: readonly Criterio[],
  opcoes: OpcoesClassificacao = {},
): LinhaClassificada[] {
  const linhas = new Map(equipeIds.map((id) => [id, { ...linhaVazia(id), posicao: 0, empatada: false, amarelos: 0, vermelhos: 0 }]));
  const validas = partidas.filter(
    (j): j is Partida & { mandanteId: string; visitanteId: string } =>
      j.status === 'encerrada' && !!j.mandanteId && !!j.visitanteId && linhas.has(j.mandanteId) && linhas.has(j.visitanteId),
  );

  for (const j of validas) {
    somar(linhas.get(j.mandanteId)!, j.golsMandante, j.golsVisitante, pontuacao);
    somar(linhas.get(j.visitanteId)!, j.golsVisitante, j.golsMandante, pontuacao);
    for (const e of j.eventos) {
      const l = linhas.get(e.equipeId);
      if (!l) continue;
      if (e.tipo === 'amarelo') l.amarelos += 1;
      else if (e.tipo === 'vermelho') l.vermelhos += 1;
    }
  }

  for (const l of linhas.values()) {
    l.saldo = l.golsPro - l.golsContra;
    const maximo = l.jogos * pontuacao.vitoria;
    l.aproveitamento = maximo > 0 ? Math.round((l.pontos / maximo) * 100) : 0;
  }

  type L = LinhaClassificada;
  const chaveSimples = (c: Criterio, l: L): number[] => {
    switch (c) {
      case 'pontos':
        return [l.pontos];
      case 'vitorias':
        return [l.vitorias];
      case 'saldo':
        return [l.saldo];
      case 'golsPro':
        return [l.golsPro];
      case 'golsContra':
        return [-l.golsContra];
      case 'cartoes':
        return [-l.vermelhos, -l.amarelos];
      case 'confronto':
        return [0];
    }
  };

  /** Ordena um grupo empatado a partir do critério i. Retorna blocos ainda empatados no fim. */
  const refinar = (grupo: L[], i: number): L[][] => {
    if (grupo.length < 2 || i >= criterios.length) return [grupo];
    const c = criterios[i];
    let partes: L[][];
    if (c === 'confronto') {
      const mini = minitabela(grupo.map((l) => l.equipeId), validas, pontuacao);
      partes = blocos(grupo, (l) => mini.get(l.equipeId)!);
      // A minitabela separou só parte: os que seguem empatados refazem entre si.
      if (partes.length > 1) return partes.flatMap((p) => refinar(p, p.length < grupo.length ? i : i + 1));
    } else {
      partes = blocos(grupo, (l) => chaveSimples(c, l));
    }
    return partes.flatMap((p) => refinar(p, i + 1));
  };

  // Ordem de entrada só para estabilidade de exibição dentro de um empate.
  const ordemEntrada = new Map(equipeIds.map((id, i) => [id, i]));
  const decididos = opcoes.desempates ?? [];
  const saida: L[] = [];
  for (const bloco of refinar([...linhas.values()], 0)) {
    const posicao = saida.length + 1;
    if (bloco.length === 1) {
      saida.push({ ...bloco[0], posicao });
      continue;
    }
    const ids = new Set(bloco.map((l) => l.equipeId));
    const manual = decididos.find((d) => d.length === ids.size && d.every((id) => ids.has(id)));
    if (manual) {
      manual.forEach((id, k) => saida.push({ ...bloco.find((l) => l.equipeId === id)!, posicao: posicao + k }));
    } else {
      bloco
        .sort((a, b) => ordemEntrada.get(a.equipeId)! - ordemEntrada.get(b.equipeId)!)
        .forEach((l) => saida.push({ ...l, posicao, empatada: true }));
    }
  }
  return saida;
}

/** Grupos de equipes empatadas em tudo que esperam decisão do admin. */
export function empatesPendentes(tabela: readonly LinhaClassificada[]): string[][] {
  const porPosicao = new Map<number, string[]>();
  for (const l of tabela) if (l.empatada) porPosicao.set(l.posicao, [...(porPosicao.get(l.posicao) ?? []), l.equipeId]);
  return [...porPosicao.values()];
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
  if (j.status !== 'encerrada' || !j.mandanteId || !j.visitanteId) return null;
  if (j.golsMandante !== j.golsVisitante) {
    return j.golsMandante > j.golsVisitante ? j.mandanteId : j.visitanteId;
  }
  const pm = j.penaltisMandante ?? 0;
  const pv = j.penaltisVisitante ?? 0;
  if (pm === pv) return null;
  return pm > pv ? j.mandanteId : j.visitanteId;
}

/** Perdedor de uma partida encerrada com vencedor (inclusive nos pênaltis). */
export function perdedor(j: Partida): string | null {
  const v = vencedor(j);
  if (!v) return null;
  return v === j.mandanteId ? (j.visitanteId ?? null) : j.mandanteId!;
}

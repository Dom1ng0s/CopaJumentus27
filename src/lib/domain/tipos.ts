// Tipos de dominio. Fonte: CLAUDE.md §3.1

/**
 * Desde 18/11/2026 a inscrição só marca quem é goleiro: 'GOL' ou 'LIN' (linha).
 * ZAG/MEI/ATA continuam aceitos só para dados antigos e contam como linha.
 */
export type Posicao = 'GOL' | 'LIN' | 'ZAG' | 'MEI' | 'ATA';

export function ehGoleiro(p: Posicao | string | null | undefined): boolean {
  return p === 'GOL';
}

/** Rótulo curto para a tela: só goleiro tem; linha fica sem rótulo. */
export function rotuloPosicao(p: Posicao | string | null | undefined): string {
  return p === 'GOL' ? 'GOL' : p === 'LIN' || !p ? '' : p;
}

export type Estrelas = 1 | 2 | 3 | 4 | 5 | 6;

export interface Jogador {
  id: string;
  nome: string;
  apelido?: string;
  posicao: Posicao;
  estrelas: Estrelas;
}

/** Time do sorteio. Começa vazio: o capitão é escolhido depois, pelo próprio time,
 *  e registrado por um admin em Admin › Equipes (decisão do operador em 18/11/2026). */
export interface Time {
  id: string;
  nome: string;
  escudo?: string;
}

/** Uma alocacao individual, na ordem em que deve ser revelada. */
export interface Alocacao {
  jogadorId: string;
  timeId: string;
  /** 'linha' = sorteio principal; 'goleiro' = etapa separada (CLAUDE.md §3.4) */
  etapa: 'linha' | 'goleiro';
}

export interface Sorteio {
  /** ISO timestamp de quando o sorteio foi gerado. */
  geradoEm: string;
  /** Ordem de revelacao da etapa de linha: aleatoria, nunca agrupada por estrelas. */
  linha: Alocacao[];
  /** Ordem de revelacao dos goleiros, revelados antes da linha na cerimonia. */
  goleiros: Alocacao[];
  /** Goleiros excedentes: ficam de fora, nao voltam ao pote (CLAUDE.md §3.4). */
  goleirosReservaIds: string[];
  /** Times que ficaram sem goleiro por falta de goleiros no pote. */
  timesSemGoleiroIds: string[];
}

export interface ElencoDoTime {
  time: Time;
  goleiro: Jogador | null;
  linha: Jogador[];
  /** Soma de estrelas da linha. Goleiro NAO conta (CLAUDE.md §3.2). */
  somaEstrelas: number;
}

// Tipos do campeonato (gestão simples: equipes, fases, grupos, partidas, súmula).
// Fonte: CLAUDE.md §8.

import type { Posicao } from '@/lib/domain/tipos';

export interface Pontuacao {
  vitoria: number;
  empate: number;
  derrota: number;
}

/** Critérios de desempate, aplicados na ordem configurada pelo admin. */
export type Criterio = 'pontos' | 'vitorias' | 'saldo' | 'golsPro' | 'golsContra' | 'confronto';

export const CRITERIOS_PADRAO: readonly Criterio[] = [
  'pontos',
  'vitorias',
  'saldo',
  'golsPro',
  'golsContra',
  'confronto',
];

export const ROTULO_CRITERIO: Record<Criterio, string> = {
  pontos: 'Pontos',
  vitorias: 'Vitórias',
  saldo: 'Saldo de gols',
  golsPro: 'Gols marcados',
  golsContra: 'Gols sofridos (menos é melhor)',
  confronto: 'Confronto direto',
};

export interface Equipe {
  id: string;
  nome: string;
  sigla: string;
  escudo?: string;
  corPrimaria: string;
  corSecundaria: string;
  corTexto: string;
  /** Id do jogador capitão, quando vier do sorteio. */
  capitaoId?: string;
}

export interface JogadorCampeonato {
  id: string;
  nome: string;
  equipeId: string;
  posicao: Posicao;
  numero?: number;
  /** Pagamento da inscrição, controlado pelos admins. */
  pago: boolean;
}

export type TipoFase = 'grupos' | 'mata-mata';

export interface Fase {
  id: string;
  nome: string;
  tipo: TipoFase;
}

export interface Grupo {
  id: string;
  faseId: string;
  nome: string;
  equipeIds: string[];
}

export type StatusPartida = 'agendada' | 'ao-vivo' | 'encerrada';

export type TipoEvento = 'gol' | 'gol-contra' | 'amarelo' | 'vermelho';

export interface EventoPartida {
  id: string;
  tipo: TipoEvento;
  jogadorId: string;
  /** Equipe do jogador que gerou o evento. */
  equipeId: string;
  assistenciaId?: string;
  minuto?: number;
}

export interface Partida {
  id: string;
  faseId: string;
  grupoId?: string;
  /** Ex.: "Rodada 1", "Semifinal 1", "Final". */
  rotulo?: string;
  mandanteId: string;
  visitanteId: string;
  /** Data e hora local no formato do input datetime-local (AAAA-MM-DDTHH:mm). */
  dataHora?: string;
  local?: string;
  status: StatusPartida;
  golsMandante: number;
  golsVisitante: number;
  penaltisMandante?: number;
  penaltisVisitante?: number;
  eventos: EventoPartida[];
}

export interface Campeonato {
  versao: 1;
  nome: string;
  subtitulo?: string;
  inicio?: string;
  fim?: string;
  local?: string;
  pontuacao: Pontuacao;
  criterios: Criterio[];
  /** Valor da inscrição por jogador, em reais. */
  valorInscricao: number;
  equipes: Equipe[];
  jogadores: JogadorCampeonato[];
  fases: Fase[];
  grupos: Grupo[];
  partidas: Partida[];
  /** Quando o resultado do sorteio virou elenco oficial. */
  sorteioOficializadoEm?: string;
}

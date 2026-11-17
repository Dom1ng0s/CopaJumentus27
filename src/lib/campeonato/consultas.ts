// Leituras derivadas usadas pelas telas (nada aqui grava).

import type { Campeonato, Equipe, JogadorCampeonato, Partida } from '@/lib/domain/campeonato/tipos';
import { calcularSuspensoes, ordenarPartidas } from '@/lib/domain/campeonato/suspensoes';

export interface Indices {
  equipe: Map<string, Equipe>;
  jogador: Map<string, JogadorCampeonato>;
}

export function indices(c: Campeonato): Indices {
  return {
    equipe: new Map(c.equipes.map((e) => [e.id, e])),
    jogador: new Map(c.jogadores.map((j) => [j.id, j])),
  };
}

export function partidasDaFase(c: Campeonato, faseId: string): Partida[] {
  return ordenarPartidas(c.partidas.filter((p) => p.faseId === faseId));
}

export function suspensoes(c: Campeonato) {
  return calcularSuspensoes(c.partidas, new Map(c.jogadores.map((j) => [j.id, j.equipeId])));
}

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** "SÁB 16/01 · 09:20" a partir de "2027-01-16T09:20". */
export function formatarDataHora(dataHora?: string): string {
  if (!dataHora) return 'Data a definir';
  const [data, hora] = dataHora.split('T');
  const [a, m, d] = data.split('-').map(Number);
  const dia = DIAS[new Date(a, m - 1, d).getDay()];
  return `${dia} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}${hora ? ` · ${hora}` : ''}`;
}

/** "16/01/2027" a partir de "2027-01-16". */
export function formatarData(data?: string): string {
  if (!data) return '';
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

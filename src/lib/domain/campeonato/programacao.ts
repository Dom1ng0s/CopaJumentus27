// Programação dos jogos: horário de cada partida a partir do início de cada dia,
// da duração do jogo e do intervalo entre jogos. Um campo, um jogo por vez.
// Puro: trabalha com o texto do input datetime-local (AAAA-MM-DDTHH:mm), sem fuso.

import type { Partida } from './tipos';

export interface DiaProgramacao {
  /** AAAA-MM-DD */
  data: string;
  /** HH:mm do primeiro jogo do dia. */
  inicio: string;
}

export interface Programacao {
  dias: DiaProgramacao[];
  /** Minutos de bola rolando (com o intervalo do jogo). */
  duracaoMin: number;
  /** Minutos entre o fim de um jogo e o começo do seguinte. */
  intervaloMin: number;
}

export const DURACAO_PADRAO_MIN = 30;
export const INTERVALO_PADRAO_MIN = 5;
export const INICIO_PADRAO = '08:00';

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const RE_DATA_HORA = /^(\d{4}-\d{2}-\d{2})T(([01]\d|2[0-3]):[0-5]\d)$/;

export function minutosDe(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function horaDe(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Separa "AAAA-MM-DDTHH:mm" em data e minutos do dia; null se o texto não está nesse formato. */
export function lerDataHora(dataHora: string | undefined): { data: string; minutos: number } | null {
  const m = dataHora ? RE_DATA_HORA.exec(dataHora) : null;
  return m ? { data: m[1], minutos: minutosDe(m[2]) } : null;
}

/** Problema de preenchimento da programação, em português, ou null se está válida. */
export function problemaNaProgramacao(p: Programacao, diasNecessarios: number): string | null {
  if (p.dias.length < diasNecessarios) return `Informe a data e o horário dos ${diasNecessarios} dias.`;
  for (const [i, d] of p.dias.entries()) {
    if (!RE_DATA.test(d.data)) return `Informe a data do dia ${i + 1}.`;
    if (!RE_HORA.test(d.inicio)) return `Informe o horário do primeiro jogo do dia ${i + 1}.`;
  }
  if (!Number.isInteger(p.duracaoMin) || p.duracaoMin < 5 || p.duracaoMin > 180) return 'A duração do jogo deve ficar entre 5 e 180 minutos.';
  if (!Number.isInteger(p.intervaloMin) || p.intervaloMin < 0 || p.intervaloMin > 120) return 'O intervalo entre jogos deve ficar entre 0 e 120 minutos.';
  return null;
}

/** Programação sugerida a partir do período do campeonato (o admin ajusta depois). */
export function programacaoPadrao(inicio: string | undefined, fim: string | undefined, dias: number): Programacao {
  const datas = [inicio ?? '', fim ?? inicio ?? ''];
  return {
    dias: Array.from({ length: dias }, (_, i) => ({ data: datas[Math.min(i, 1)] ?? '', inicio: INICIO_PADRAO })),
    duracaoMin: DURACAO_PADRAO_MIN,
    intervaloMin: INTERVALO_PADRAO_MIN,
  };
}

export interface ResumoDia {
  dia: number;
  data: string;
  jogos: number;
  primeiro: string;
  /** Hora prevista para o fim do último jogo do dia. */
  fim: string;
  /** O último jogo termina depois da meia-noite. */
  passaDaMeiaNoite: boolean;
}

function partidasDoDia(partidas: readonly Partida[], dia: number): Partida[] {
  return partidas.filter((p) => p.dia === dia && p.numero !== undefined).sort((a, b) => a.numero! - b.numero!);
}

/** Quantos jogos e de que horas a que horas fica cada dia com esta programação. */
export function resumirProgramacao(partidas: readonly Partida[], p: Programacao): ResumoDia[] {
  return p.dias.map((d, i) => {
    const jogos = partidasDoDia(partidas, i + 1).length;
    const ini = minutosDe(d.inicio);
    const fim = ini + jogos * p.duracaoMin + Math.max(0, jogos - 1) * p.intervaloMin;
    return { dia: i + 1, data: d.data, jogos, primeiro: d.inicio, fim: horaDe(fim % (24 * 60)), passaDaMeiaNoite: fim > 24 * 60 };
  });
}

/**
 * Grava a data e a hora de cada partida numerada, em sequência dentro do dia.
 * Partidas que já começaram ou acabaram mantêm o horário que têm (sem horário, recebem o da vez).
 * Muta o campeonato recebido (como as demais regras aplicadas dentro de atualizarCampeonato).
 */
export function aplicarProgramacao(partidas: Partida[], p: Programacao): void {
  const passo = p.duracaoMin + p.intervaloMin;
  p.dias.forEach((d, i) => {
    const ini = minutosDe(d.inicio);
    partidasDoDia(partidas, i + 1).forEach((partida, k) => {
      if (partida.status !== 'agendada' && partida.dataHora) return;
      const minutos = ini + k * passo;
      if (minutos >= 24 * 60) throw new Error(`O jogo ${partida.numero} passaria da meia-noite. Comece mais cedo ou encurte os jogos.`);
      partida.dataHora = `${d.data}T${horaDe(minutos)}`;
    });
  });
}

/**
 * Muda o horário de uma partida. Com `empurrar`, os jogos seguintes do mesmo dia
 * (pela numeração) que ainda não começaram andam a mesma diferença, para cima ou para baixo.
 * Devolve quantos jogos seguintes mudaram.
 */
export function remarcarPartida(partidas: Partida[], partidaId: string, novaDataHora: string | undefined, empurrar: boolean): number {
  const alvo = partidas.find((p) => p.id === partidaId);
  if (!alvo) throw new Error('Partida não encontrada.');
  const antes = lerDataHora(alvo.dataHora);
  const depois = lerDataHora(novaDataHora);
  alvo.dataHora = novaDataHora;
  if (!empurrar || !antes || !depois || antes.data !== depois.data || alvo.numero === undefined || alvo.dia === undefined) return 0;
  const delta = depois.minutos - antes.minutos;
  if (delta === 0) return 0;
  const seguintes = partidasDoDia(partidas, alvo.dia).filter((p) => p.numero! > alvo.numero! && p.status === 'agendada');
  let mudaram = 0;
  for (const p of seguintes) {
    const atual = lerDataHora(p.dataHora);
    if (!atual || atual.data !== antes.data) continue;
    const minutos = atual.minutos + delta;
    if (minutos < 0 || minutos >= 24 * 60) throw new Error(`O jogo ${p.numero} sairia do dia ${antes.data}. Ajuste os horários um a um.`);
    p.dataHora = `${atual.data}T${horaDe(minutos)}`;
    mudaram++;
  }
  return mudaram;
}

// Programação dos jogos: horário de cada partida a partir do início de cada dia,
// da duração dos tempos e dos intervalos. Um campo, um jogo por vez.
// Grade aprovada pela comissão em 18/11/2026 (CLAUDE.md §8.6): grupos 2 × 8 min,
// mata-mata 2 × 10 min, até 2 min entre os tempos, 3 min entre jogos e 10 min
// entre uma etapa do mata-mata e outra (inclusive da fase de grupos para a repescagem).
// Puro: trabalha com o texto do input datetime-local (AAAA-MM-DDTHH:mm), sem fuso.

import { ETAPAS_MATA_MATA } from './modelo';
import type { Fase, Partida } from './tipos';

export interface DiaProgramacao {
  /** AAAA-MM-DD */
  data: string;
  /** HH:mm do primeiro jogo do dia. */
  inicio: string;
}

export interface Programacao {
  dias: DiaProgramacao[];
  /** Minutos de cada um dos 2 tempos na fase de grupos. */
  tempoGrupoMin: number;
  /** Minutos de cada um dos 2 tempos no mata-mata. */
  tempoMataMataMin: number;
  /** Intervalo entre o 1º e o 2º tempo (todos os jogos). */
  intervaloTemposMin: number;
  /** Entre um jogo e o seguinte na fase de grupos. */
  intervaloGrupoMin: number;
  /** Entre dois jogos da mesma etapa do mata-mata. */
  intervaloMataMataMin: number;
  /** Ao trocar de etapa: grupos → repescagem → semifinais → finais. */
  intervaloFasesMin: number;
}

export const INICIO_PADRAO = '16:00';
const PADRAO = {
  tempoGrupoMin: 8,
  tempoMataMataMin: 10,
  intervaloTemposMin: 2,
  intervaloGrupoMin: 3,
  intervaloMataMataMin: 3,
  intervaloFasesMin: 10,
} as const;

/**
 * Lê a programação gravada. A versão antiga (`duracaoMin`/`intervaloMin`, um valor
 * para todos os jogos) vira a nova com os mesmos tempos: dois tempos iguais, sem
 * intervalo entre eles e o mesmo intervalo entre jogos.
 */
export function normalizarProgramacao(valor: unknown): Programacao | undefined {
  if (!valor || typeof valor !== 'object') return undefined;
  const ler = (o: unknown, k: string): unknown => (o && typeof o === 'object' ? Reflect.get(o, k) : undefined);
  const num = (k: string, padrao: number): number => {
    const n = ler(valor, k);
    return typeof n === 'number' ? n : padrao;
  };
  const brutos = ler(valor, 'dias');
  const dias = Array.isArray(brutos) ? brutos.map((d) => ({ data: String(ler(d, 'data') ?? ''), inicio: String(ler(d, 'inicio') ?? '') })) : [];
  const duracaoAntiga = ler(valor, 'duracaoMin');
  if (typeof duracaoAntiga === 'number' && ler(valor, 'tempoGrupoMin') === undefined) {
    const tempo = Math.round(duracaoAntiga / 2);
    const intervalo = num('intervaloMin', 0);
    return { dias, tempoGrupoMin: tempo, tempoMataMataMin: tempo, intervaloTemposMin: 0, intervaloGrupoMin: intervalo, intervaloMataMataMin: intervalo, intervaloFasesMin: intervalo };
  }
  return {
    dias,
    tempoGrupoMin: num('tempoGrupoMin', PADRAO.tempoGrupoMin),
    tempoMataMataMin: num('tempoMataMataMin', PADRAO.tempoMataMataMin),
    intervaloTemposMin: num('intervaloTemposMin', PADRAO.intervaloTemposMin),
    intervaloGrupoMin: num('intervaloGrupoMin', PADRAO.intervaloGrupoMin),
    intervaloMataMataMin: num('intervaloMataMataMin', PADRAO.intervaloMataMataMin),
    intervaloFasesMin: num('intervaloFasesMin', PADRAO.intervaloFasesMin),
  };
}

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
  const faixa = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!faixa(p.tempoGrupoMin, 1, 90)) return 'Cada tempo da fase de grupos deve ter entre 1 e 90 minutos.';
  if (!faixa(p.tempoMataMataMin, 1, 90)) return 'Cada tempo do mata-mata deve ter entre 1 e 90 minutos.';
  if (!faixa(p.intervaloTemposMin, 0, 30)) return 'O intervalo entre os tempos deve ficar entre 0 e 30 minutos.';
  if (!faixa(p.intervaloGrupoMin, 0, 120)) return 'O intervalo entre jogos dos grupos deve ficar entre 0 e 120 minutos.';
  if (!faixa(p.intervaloMataMataMin, 0, 120)) return 'O intervalo entre jogos do mata-mata deve ficar entre 0 e 120 minutos.';
  if (!faixa(p.intervaloFasesMin, 0, 120)) return 'O intervalo entre as etapas do mata-mata deve ficar entre 0 e 120 minutos.';
  return null;
}

/** Programação sugerida a partir do período do campeonato (o admin ajusta depois). */
export function programacaoPadrao(inicio: string | undefined, fim: string | undefined, dias: number): Programacao {
  const datas = [inicio ?? '', fim ?? inicio ?? ''];
  return {
    dias: Array.from({ length: dias }, (_, i) => ({ data: datas[Math.min(i, 1)] ?? '', inicio: INICIO_PADRAO })),
    ...PADRAO,
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

/** Etapa do jogo: a fase de grupos inteira é uma; no mata-mata, cada etapa do modelo é uma. */
function etapaDe(partida: Partida, tipo: Fase['tipo'] | undefined): string {
  if (tipo !== 'mata-mata') return `fase:${partida.faseId}`;
  const i = ETAPAS_MATA_MATA.findIndex((e) => e.jogos.includes(partida.numero ?? -1));
  return i >= 0 ? `etapa:${i}` : `fase:${partida.faseId}`;
}

interface Horario {
  partida: Partida;
  inicio: number;
  fim: number;
}

/** Linha do tempo de um dia: início e fim (em minutos) de cada jogo, em sequência. */
function linhaDoTempo(partidas: readonly Partida[], fases: readonly Fase[], p: Programacao, dia: number): Horario[] {
  const tipoDa = new Map(fases.map((f) => [f.id, f.tipo]));
  const lista: Horario[] = [];
  let anterior: { etapa: string; mata: boolean; fim: number } | null = null;
  for (const partida of partidasDoDia(partidas, dia)) {
    const tipo = tipoDa.get(partida.faseId);
    const mata = tipo === 'mata-mata';
    const etapa = etapaDe(partida, tipo);
    const tempo = mata ? p.tempoMataMataMin : p.tempoGrupoMin;
    const duracao = 2 * tempo + p.intervaloTemposMin;
    let inicio = minutosDe(p.dias[dia - 1].inicio);
    if (anterior) {
      const trocaDeEtapa = anterior.etapa !== etapa && (mata || anterior.mata);
      const intervalo = trocaDeEtapa ? p.intervaloFasesMin : mata ? p.intervaloMataMataMin : p.intervaloGrupoMin;
      inicio = anterior.fim + intervalo;
    }
    lista.push({ partida, inicio, fim: inicio + duracao });
    anterior = { etapa, mata, fim: inicio + duracao };
  }
  return lista;
}

/** Quantos jogos e de que horas a que horas fica cada dia com esta programação. */
export function resumirProgramacao(partidas: readonly Partida[], fases: readonly Fase[], p: Programacao): ResumoDia[] {
  return p.dias.map((d, i) => {
    const linha = linhaDoTempo(partidas, fases, p, i + 1);
    const fim = linha.length ? linha[linha.length - 1].fim : minutosDe(d.inicio);
    return { dia: i + 1, data: d.data, jogos: linha.length, primeiro: d.inicio, fim: horaDe(fim % (24 * 60)), passaDaMeiaNoite: fim > 24 * 60 };
  });
}

/**
 * Grava a data e a hora de cada partida numerada, em sequência dentro do dia.
 * Partidas que já começaram ou acabaram mantêm o horário que têm (sem horário, recebem o da vez).
 * Muta as partidas recebidas (como as demais regras aplicadas dentro de atualizarCampeonato).
 */
export function aplicarProgramacao(partidas: Partida[], fases: readonly Fase[], p: Programacao): void {
  p.dias.forEach((d, i) => {
    for (const { partida, inicio } of linhaDoTempo(partidas, fases, p, i + 1)) {
      if (partida.status !== 'agendada' && partida.dataHora) continue;
      if (inicio >= 24 * 60) throw new Error(`O jogo ${partida.numero} passaria da meia-noite. Comece mais cedo ou encurte os jogos.`);
      partida.dataHora = `${d.data}T${horaDe(inicio)}`;
    }
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

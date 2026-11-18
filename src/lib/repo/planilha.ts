// Leitura da aba INSCRITOS da planilha oficial (Google Sheets exportada em CSV).
// Funcao pura: recebe o texto do CSV e devolve elenco + times + problemas encontrados.
// Quem le arquivo/rede e o cadastro.ts; aqui nao entra fs nem fetch.

import { ESTRELAS_MAX, ESTRELAS_MIN } from '@/lib/config';
import type { Estrelas, Jogador, Posicao, Time } from '@/lib/domain/tipos';

export interface CadastroPlanilha {
  jogadores: Jogador[];
  times: Time[];
  /** Erros que impedem um sorteio oficial. Lista vazia = cadastro pronto. */
  problemas: string[];
  /** Linhas fora do sorteio (lista de espera). */
  ignorados: number;
}

/**
 * Lê a marca de goleiro de uma inscrição: coluna "Goleiro" (sim/x/1) ou a antiga
 * "Posição" (GOL). Qualquer outra coisa, inclusive vazio, é jogador de linha.
 */
export function lerGoleiro(valor: string | null | undefined): Posicao {
  const v = normalizar(valor ?? '');
  return ['gol', 'goleiro', 'sim', 's', 'x', '1', 'true'].includes(v) ? 'GOL' : 'LIN';
}

/** Ordem oficial dos times. Times fora desta lista entram depois, na ordem em que aparecem. */
export const ORDEM_TIMES = [
  'Inter Miami',
  'LA Galaxy',
  'LAFC',
  'Seattle Sounders',
  'Atlanta United',
  'New York City FC',
  'Houston Dynamo',
  'Orlando City',
] as const;

const COLUNAS = {
  nome: 'nome',
  apelido: 'apelido',
  estrelas: 'estrelas',
  status: 'status',
} as const;

/** Minusculas, sem acento, espacos colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave para comparar nomes de time: ignora acento, caixa e espacos ("LA FC" == "LAFC"). */
function chaveTime(nome: string): string {
  return normalizar(nome).replace(/\s/g, '');
}

function slug(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Parser CSV RFC 4180: aspas, aspas escapadas ("") e quebras de linha dentro de campo. */
export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let entreAspas = false;
  const s = texto.replace(/^﻿/, '');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (entreAspas) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') entreAspas = true;
    else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

/** Uma inscrição já separada em campos (do banco ou de uma linha do CSV). */
export interface LinhaInscricao {
  id: string;
  nome: string;
  apelido?: string | null;
  /** 'GOL' para goleiro; qualquer outra coisa é linha (ver lerGoleiro). */
  posicao?: string | null;
  estrelas?: string | number | null;
  /** "confirmado" entra no sorteio; qualquer outro valor fica de fora. Vazio conta como confirmado. */
  status?: string | null;
  /** Como citar a linha nas mensagens, ex.: "linha 7" no CSV. */
  referencia?: string;
}

/** Lê o CSV da aba INSCRITOS e devolve as linhas em campos, sem validar. */
export function linhasDoCsv(csv: string): { linhas: LinhaInscricao[]; erro?: string } {
  const tabela = lerCsv(csv);
  if (tabela.length === 0) return { linhas: [], erro: 'Planilha vazia.' };
  const cabecalho = tabela[0].map(normalizar);
  const indice = (nome: string) => cabecalho.indexOf(nome);
  const col = {
    nome: indice(COLUNAS.nome),
    apelido: indice(COLUNAS.apelido),
    estrelas: indice(COLUNAS.estrelas),
    status: indice(COLUNAS.status),
  };
  const faltando = (Object.keys(col) as (keyof typeof col)[]).filter((k) => col[k] < 0);
  if (faltando.length > 0) {
    return { linhas: [], erro: `Colunas ausentes no cabeçalho: ${faltando.map((k) => COLUNAS[k]).join(', ')}.` };
  }
  // Goleiro: coluna "Goleiro" (nova) ou "Posição" (antiga, GOL/ZAG/MEI/ATA). Opcional.
  const colGoleiro = indice('goleiro') >= 0 ? indice('goleiro') : indice('posicao');
  const linhas: LinhaInscricao[] = [];
  tabela.slice(1).forEach((celulas, i) => {
    const numeroLinha = i + 2;
    const pegar = (c: number) => (celulas[c] ?? '').trim();
    if (pegar(col.nome) === '') return;
    linhas.push({
      id: `p${String(numeroLinha - 1).padStart(3, '0')}`,
      nome: pegar(col.nome),
      apelido: pegar(col.apelido),
      posicao: colGoleiro >= 0 ? lerGoleiro(pegar(colGoleiro)) : 'LIN',
      estrelas: pegar(col.estrelas),
      status: pegar(col.status),
      referencia: `linha ${numeroLinha}`,
    });
  });
  return { linhas };
}

export function interpretarPlanilha(csv: string, nomesTimes: readonly string[] = ORDEM_TIMES): CadastroPlanilha {
  const { linhas, erro } = linhasDoCsv(csv);
  if (erro) return { jogadores: [], times: [], problemas: [erro], ignorados: 0 };
  return interpretarInscricoes(linhas, nomesTimes);
}

/**
 * Valida as inscrições e monta elenco e times para o sorteio, com a lista de pendências.
 * Os times são as equipes do campeonato e começam vazios: não há capitão fixo; o time
 * escolhe o capitão depois do sorteio (decisão do operador em 18/11/2026).
 */
export function interpretarInscricoes(
  linhas: readonly LinhaInscricao[],
  nomesTimes: readonly string[] = ORDEM_TIMES,
): CadastroPlanilha {
  const problemas: string[] = [];
  const jogadores: Jogador[] = [];
  const nomesVistos = new Map<string, LinhaInscricao>();
  let ignorados = 0;

  for (const l of linhas) {
    const nome = l.nome.trim();
    if (nome === '') continue;

    const status = normalizar(l.status ?? '');
    if (status !== '' && status !== 'confirmado') {
      ignorados++;
      continue;
    }

    const id = l.id;
    const rotulo = l.referencia ? `${nome} (${l.referencia})` : nome;

    const chaveNome = normalizar(nome);
    const anterior = nomesVistos.get(chaveNome);
    if (anterior !== undefined) {
      const onde =
        anterior.referencia && l.referencia
          ? ` (${anterior.referencia.replace('linha ', 'linhas ')} e ${l.referencia.replace('linha ', '')})`
          : '';
      problemas.push(`Nome repetido: ${nome}${onde}.`);
    } else {
      nomesVistos.set(chaveNome, l);
    }

    // Só importa se é goleiro: a posição de linha saiu da inscrição (18/11/2026).
    const posicao: Posicao = lerGoleiro(l.posicao);

    // Estrelas de goleiro nao contam no balanceamento (CLAUDE.md §3.2): vazio vira o minimo.
    const estrelasTexto = l.estrelas === null || l.estrelas === undefined ? '' : String(l.estrelas).trim();
    const estrelasBrutas = estrelasTexto || (posicao === 'GOL' ? String(ESTRELAS_MIN) : '');
    const numero = Number(estrelasBrutas.replace(',', '.'));
    const estrelasValidas =
      estrelasBrutas !== '' && Number.isInteger(numero) && numero >= ESTRELAS_MIN && numero <= ESTRELAS_MAX;
    if (!estrelasValidas) {
      problemas.push(
        `${rotulo}: estrelas ${estrelasBrutas ? `"${estrelasBrutas}" fora de ${ESTRELAS_MIN}–${ESTRELAS_MAX}` : 'vazias'}.`,
      );
    }

    if (!estrelasValidas) continue;

    const apelido = (l.apelido ?? '').trim();
    jogadores.push({
      id,
      nome,
      ...(apelido ? { apelido } : {}),
      posicao,
      estrelas: numero as Estrelas,
    });
  }

  const vistos = new Set<string>();
  const times: Time[] = [];
  for (const nome of nomesTimes) {
    const chave = chaveTime(nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    times.push({ id: `t-${slug(nome)}`, nome });
  }
  if (times.length < 2) problemas.push('O campeonato precisa de pelo menos 2 equipes para o sorteio.');

  return { jogadores, times, problemas, ignorados };
}

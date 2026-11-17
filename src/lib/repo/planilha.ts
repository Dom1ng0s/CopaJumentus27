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

const POSICOES: readonly Posicao[] = ['GOL', 'ZAG', 'MEI', 'ATA'];

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
  posicao: 'posicao',
  estrelas: 'estrelas',
  capitao: 'capitao do time',
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

export function interpretarPlanilha(csv: string): CadastroPlanilha {
  const problemas: string[] = [];
  const linhas = lerCsv(csv);
  if (linhas.length === 0) {
    return { jogadores: [], times: [], problemas: ['Planilha vazia.'], ignorados: 0 };
  }

  const cabecalho = linhas[0].map(normalizar);
  const indice = (nome: string) => cabecalho.indexOf(nome);
  const col = {
    nome: indice(COLUNAS.nome),
    apelido: indice(COLUNAS.apelido),
    posicao: indice(COLUNAS.posicao),
    estrelas: indice(COLUNAS.estrelas),
    capitao: indice(COLUNAS.capitao),
    status: indice(COLUNAS.status),
  };
  const faltando = (Object.keys(col) as (keyof typeof col)[]).filter((k) => col[k] < 0);
  if (faltando.length > 0) {
    return {
      jogadores: [],
      times: [],
      problemas: [`Colunas ausentes no cabeçalho: ${faltando.map((k) => COLUNAS[k]).join(', ')}.`],
      ignorados: 0,
    };
  }

  const jogadores: Jogador[] = [];
  const capitaesPorTime = new Map<string, { nomeTime: string; jogadorIds: string[] }>();
  const nomesVistos = new Map<string, number>();
  let ignorados = 0;

  linhas.slice(1).forEach((celulas, i) => {
    const numeroLinha = i + 2;
    const pegar = (c: number) => (celulas[c] ?? '').trim();
    const nome = pegar(col.nome);
    if (nome === '') return;

    const status = normalizar(pegar(col.status));
    if (status !== '' && status !== 'confirmado') {
      ignorados++;
      return;
    }

    const id = `p${String(numeroLinha - 1).padStart(3, '0')}`;
    const rotulo = `${nome} (linha ${numeroLinha})`;

    const chaveNome = normalizar(nome);
    const anterior = nomesVistos.get(chaveNome);
    if (anterior !== undefined) {
      problemas.push(`Nome repetido: ${nome} (linhas ${anterior} e ${numeroLinha}).`);
    } else {
      nomesVistos.set(chaveNome, numeroLinha);
    }

    const posicaoBruta = pegar(col.posicao).toUpperCase();
    const posicao = POSICOES.find((p) => p === posicaoBruta);
    if (!posicao) {
      problemas.push(`${rotulo}: posição ${posicaoBruta ? `"${posicaoBruta}" inválida` : 'vazia'}.`);
    }

    // Estrelas de goleiro nao contam no balanceamento (CLAUDE.md §3.2): vazio vira o minimo.
    const estrelasBrutas = pegar(col.estrelas) || (posicao === 'GOL' ? String(ESTRELAS_MIN) : '');
    const numero = Number(estrelasBrutas.replace(',', '.'));
    const estrelasValidas =
      estrelasBrutas !== '' && Number.isInteger(numero) && numero >= ESTRELAS_MIN && numero <= ESTRELAS_MAX;
    if (!estrelasValidas) {
      problemas.push(
        `${rotulo}: estrelas ${estrelasBrutas ? `"${estrelasBrutas}" fora de ${ESTRELAS_MIN}–${ESTRELAS_MAX}` : 'vazias'}.`,
      );
    }

    const timeCapitao = pegar(col.capitao);
    if (timeCapitao !== '') {
      if (posicao === 'GOL') problemas.push(`${rotulo}: goleiro não pode ser capitão.`);
      const chave = chaveTime(timeCapitao);
      const atual = capitaesPorTime.get(chave) ?? { nomeTime: timeCapitao, jogadorIds: [] };
      atual.jogadorIds.push(id);
      capitaesPorTime.set(chave, atual);
    }

    if (!posicao || !estrelasValidas) return;

    const apelido = pegar(col.apelido);
    jogadores.push({
      id,
      nome,
      ...(apelido ? { apelido } : {}),
      posicao,
      estrelas: numero as Estrelas,
      ehCapitao: timeCapitao !== '',
    });
  });

  const ordem = ORDEM_TIMES.map(chaveTime);
  const entradas = [...capitaesPorTime.entries()].sort(([a], [b]) => {
    const ia = ordem.indexOf(a);
    const ib = ordem.indexOf(b);
    return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib);
  });

  const idsValidos = new Set(jogadores.map((j) => j.id));
  const times: Time[] = [];
  for (const [chave, { nomeTime, jogadorIds }] of entradas) {
    if (jogadorIds.length > 1) {
      problemas.push(`${nomeTime}: ${jogadorIds.length} capitães marcados (deve ser 1).`);
      continue;
    }
    const capitaoId = jogadorIds[0];
    if (!idsValidos.has(capitaoId)) continue;
    const oficial = ORDEM_TIMES.find((t) => chaveTime(t) === chave);
    times.push({ id: `t-${slug(oficial ?? nomeTime)}`, nome: oficial ?? nomeTime, capitaoId });
  }

  for (const nomeTime of ORDEM_TIMES) {
    if (!capitaesPorTime.has(chaveTime(nomeTime))) problemas.push(`${nomeTime}: sem capitão.`);
  }

  return { jogadores, times, problemas, ignorados };
}

// Inscrições do sorteio no banco (substituem a aba INSCRITOS da planilha).

import { asc, eq } from 'drizzle-orm';
import { banco, type Banco } from '@/lib/db/cliente';
import { inscricao } from '@/lib/db/schema';
import type { Posicao } from '@/lib/domain/tipos';
import { linhasDoCsv, normalizar, type LinhaInscricao } from './planilha';

export type Inscricao = typeof inscricao.$inferSelect;
export type StatusInscricao = Inscricao['status'];

export interface DadosInscricao {
  nome: string;
  apelido?: string | null;
  posicao?: Posicao | null;
  estrelas?: number | null;
  capitaoDe?: string | null;
  status?: StatusInscricao;
}

const POSICOES: readonly Posicao[] = ['GOL', 'ZAG', 'MEI', 'ATA'];

export function lerPosicao(valor: string | null | undefined): Posicao | null {
  const p = (valor ?? '').trim().toUpperCase();
  return POSICOES.find((x) => x === p) ?? null;
}

export function lerEstrelas(valor: string | number | null | undefined): number | null {
  const n = Number(String(valor ?? '').replace(',', '.').trim());
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
}

export function lerStatus(valor: string | null | undefined): StatusInscricao {
  const s = normalizar(valor ?? '');
  return s === '' || s === 'confirmado' ? 'confirmado' : 'espera';
}

function novoId(): string {
  return `i${crypto.randomUUID().slice(0, 8)}`;
}

export async function listarInscricoes(db?: Banco): Promise<Inscricao[]> {
  const c = db ?? (await banco());
  return c.select().from(inscricao).orderBy(asc(inscricao.criadoEm), asc(inscricao.id));
}

export async function criarInscricao(dados: DadosInscricao, db?: Banco): Promise<Inscricao> {
  const c = db ?? (await banco());
  const [nova] = await c
    .insert(inscricao)
    .values({
      id: novoId(),
      nome: dados.nome.trim(),
      apelido: dados.apelido?.trim() || null,
      posicao: dados.posicao ?? null,
      estrelas: dados.estrelas ?? null,
      capitaoDe: dados.capitaoDe?.trim() || null,
      status: dados.status ?? 'confirmado',
    })
    .returning();
  return nova;
}

export async function atualizarInscricao(id: string, dados: DadosInscricao, db?: Banco): Promise<void> {
  const c = db ?? (await banco());
  await c
    .update(inscricao)
    .set({
      nome: dados.nome.trim(),
      apelido: dados.apelido?.trim() || null,
      posicao: dados.posicao ?? null,
      estrelas: dados.estrelas ?? null,
      capitaoDe: dados.capitaoDe?.trim() || null,
      status: dados.status ?? 'confirmado',
    })
    .where(eq(inscricao.id, id));
}

export async function removerInscricao(id: string, db?: Banco): Promise<void> {
  const c = db ?? (await banco());
  await c.delete(inscricao).where(eq(inscricao.id, id));
}

/**
 * Importa o CSV da aba INSCRITOS. Acrescenta só quem ainda não está cadastrado
 * (comparando o nome sem acento e sem caixa); não altera quem já existe.
 */
export async function importarCsv(
  csv: string,
  db?: Banco,
): Promise<{ importadas: number; puladas: number; erro?: string }> {
  const c = db ?? (await banco());
  const { linhas, erro } = linhasDoCsv(csv);
  if (erro) return { importadas: 0, puladas: 0, erro };

  const existentes = new Set((await listarInscricoes(c)).map((i) => normalizar(i.nome)));
  const novas = linhas.filter((l) => !existentes.has(normalizar(l.nome)));
  if (novas.length) {
    // criado_em crescente preserva a ordem da planilha.
    const base = Date.now();
    await c.insert(inscricao).values(
      novas.map((l, i) => ({
        id: novoId(),
        nome: l.nome.trim(),
        apelido: l.apelido?.trim() || null,
        posicao: lerPosicao(l.posicao),
        estrelas: lerEstrelas(l.estrelas),
        capitaoDe: l.capitaoDe?.trim() || null,
        status: lerStatus(l.status),
        criadoEm: new Date(base + i),
      })),
    );
  }
  return { importadas: novas.length, puladas: linhas.length - novas.length };
}

/** Converte para o formato que a validação do sorteio entende. */
export function paraLinhas(inscricoes: readonly Inscricao[]): LinhaInscricao[] {
  return inscricoes.map((i) => ({
    id: i.id,
    nome: i.nome,
    apelido: i.apelido,
    posicao: i.posicao,
    estrelas: i.estrelas,
    capitaoDe: i.capitaoDe,
    status: i.status,
  }));
}

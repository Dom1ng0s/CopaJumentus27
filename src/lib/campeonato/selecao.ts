// Qual campeonato cada tela mostra (CLAUDE.md §8.6).
// - Admin: o "campeonato em edição", escolhido em Admin › Campeonatos e guardado
//   num cookie do navegador de cada admin. Sem escolha, o atual do site público.
// - Público: o atual (escolherAtual) nas rotas da raiz; qualquer edição não
//   rascunho em /edicoes/[slug].

import { cookies } from 'next/headers';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';
import { carregarCampeonato, escolherAtual, listarCampeonatos, type ResumoCampeonato } from '@/lib/repo/campeonato-repo';

export const COOKIE_CAMPEONATO = 'cj_campeonato';

export async function idDoCampeonatoDoAdmin(): Promise<number> {
  const lista = await listarCampeonatos();
  const escolhido = Number((await cookies()).get(COOKIE_CAMPEONATO)?.value);
  if (lista.some((c) => c.id === escolhido)) return escolhido;
  return (escolherAtual(lista) ?? lista[0]).id;
}

export async function campeonatoDoAdmin(): Promise<Campeonato> {
  return carregarCampeonato(await idDoCampeonatoDoAdmin());
}

export async function edicoesPublicas(): Promise<ResumoCampeonato[]> {
  return (await listarCampeonatos()).filter((c) => c.status !== 'rascunho');
}

export interface CampeonatoPublico {
  c: Campeonato;
  /** Prefixo dos links internos: '' na raiz, '/edicoes/<slug>' no histórico. */
  base: string;
  /** Edições públicas, para o histórico. */
  edicoes: ResumoCampeonato[];
}

/** Campeonato do site público: por slug (histórico) ou o atual. null = não existe ou é rascunho. */
export async function campeonatoPublico(slug?: string): Promise<CampeonatoPublico | null> {
  const edicoes = await edicoesPublicas();
  const resumo = slug ? edicoes.find((c) => c.slug === slug) : escolherAtual(edicoes);
  if (!resumo) return null;
  return { c: await carregarCampeonato(resumo.id), base: slug ? `/edicoes/${slug}` : '', edicoes };
}

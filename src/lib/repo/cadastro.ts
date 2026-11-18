// Cadastro do sorteio, lido das inscrições no banco (Admin › Inscrições).
// Sem nenhuma inscrição, usa o elenco de exemplo para a tela não ficar vazia.

import type { Jogador, Time } from '@/lib/domain/tipos';
import { carregarCampeonato } from './campeonato-repo';
import { listarInscricoes, paraLinhas } from './inscricoes-repo';
import { interpretarInscricoes, ORDEM_TIMES } from './planilha';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from './seed';

export interface Cadastro {
  jogadores: Jogador[];
  times: Time[];
  problemas: string[];
  ignorados: number;
  origem: 'banco' | 'exemplo';
}

/** Cadastro do sorteio do campeonato (cada campeonato tem as suas inscrições). */
export async function carregarCadastro(campeonatoId: number): Promise<Cadastro> {
  const inscricoes = await listarInscricoes(campeonatoId);
  if (inscricoes.length === 0) {
    return { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO, problemas: [], ignorados: 0, origem: 'exemplo' };
  }
  // Os times do sorteio são as equipes do campeonato, na ordem cadastrada.
  const { equipes } = await carregarCampeonato(campeonatoId);
  const nomes = equipes.length > 0 ? equipes.map((e) => e.nome) : [...ORDEM_TIMES];
  return { ...interpretarInscricoes(paraLinhas(inscricoes), nomes), origem: 'banco' };
}

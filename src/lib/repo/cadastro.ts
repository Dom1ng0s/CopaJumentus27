// Cadastro do sorteio, lido das inscrições no banco (Admin › Inscrições).
// Sem nenhuma inscrição, usa o elenco de exemplo para a tela não ficar vazia.

import { AVISO_COTAS_SORTEIO, calcularCotas, type Cotas } from '@/lib/domain/cotas';
import type { Jogador, Time } from '@/lib/domain/tipos';
import { carregarCampeonato } from './campeonato-repo';
import { listarInscricoes, paraLinhas } from './inscricoes-repo';
import { interpretarInscricoes, ORDEM_TIMES } from './planilha';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from './seed';

export interface Cadastro {
  jogadores: Jogador[];
  times: Time[];
  /** Pendências que bloqueiam o sorteio. Cotas abertas aparecem só como AVISO_COTAS_SORTEIO. */
  problemas: string[];
  /** Cotas por nível, com detalhe. Só para Admin › Inscrições, nunca para a tela de sorteio. */
  cotas: Cotas;
  ignorados: number;
  origem: 'banco' | 'exemplo';
}

/** Cadastro do sorteio do campeonato (cada campeonato tem as suas inscrições). */
export async function carregarCadastro(campeonatoId: number): Promise<Cadastro> {
  const inscricoes = await listarInscricoes(campeonatoId);
  if (inscricoes.length === 0) {
    return comCotas({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO, problemas: [], ignorados: 0, origem: 'exemplo' });
  }
  // Os times do sorteio são as equipes do campeonato, na ordem cadastrada.
  const { equipes } = await carregarCampeonato(campeonatoId);
  const nomes = equipes.length > 0 ? equipes.map((e) => e.nome) : [...ORDEM_TIMES];
  return comCotas({ ...interpretarInscricoes(paraLinhas(inscricoes), nomes), origem: 'banco' });
}

/** Acrescenta as cotas de estrela; cota aberta bloqueia o sorteio sem citar níveis. */
function comCotas(c: Omit<Cadastro, 'cotas'>): Cadastro {
  const cotas = calcularCotas(c.jogadores, c.times.length);
  return { ...c, cotas, problemas: cotas.fechou ? c.problemas : [...c.problemas, AVISO_COTAS_SORTEIO] };
}

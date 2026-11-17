// Cadastro do sorteio, lido das inscrições no banco (Admin › Inscrições).
// Sem nenhuma inscrição, usa o elenco de exemplo para a tela não ficar vazia.

import type { Jogador, Time } from '@/lib/domain/tipos';
import { listarInscricoes, paraLinhas } from './inscricoes-repo';
import { interpretarInscricoes } from './planilha';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from './seed';

export interface Cadastro {
  jogadores: Jogador[];
  times: Time[];
  problemas: string[];
  ignorados: number;
  origem: 'banco' | 'exemplo';
}

export async function carregarCadastro(): Promise<Cadastro> {
  const inscricoes = await listarInscricoes();
  if (inscricoes.length === 0) {
    return { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO, problemas: [], ignorados: 0, origem: 'exemplo' };
  }
  return { ...interpretarInscricoes(paraLinhas(inscricoes)), origem: 'banco' };
}

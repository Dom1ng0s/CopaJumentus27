// Fonte do cadastro no servidor. Unico ponto que le disco para elenco/times.
// Ordem: dados/inscritos.csv (exportado da planilha via `npm run importar`) -> seed de exemplo.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Jogador, Time } from '@/lib/domain/tipos';
import { interpretarPlanilha } from './planilha';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from './seed';

export interface Cadastro {
  jogadores: Jogador[];
  times: Time[];
  problemas: string[];
  ignorados: number;
  origem: 'planilha' | 'exemplo';
}

export const ARQUIVO_INSCRITOS = path.join(process.cwd(), 'dados', 'inscritos.csv');

export async function carregarCadastro(): Promise<Cadastro> {
  let csv: string;
  try {
    csv = await readFile(ARQUIVO_INSCRITOS, 'utf8');
  } catch {
    return {
      jogadores: JOGADORES_EXEMPLO,
      times: TIMES_EXEMPLO,
      problemas: [],
      ignorados: 0,
      origem: 'exemplo',
    };
  }
  return { ...interpretarPlanilha(csv), origem: 'planilha' };
}

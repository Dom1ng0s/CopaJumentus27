// Rankings lançados à mão para edições antigas (sem súmulas no sistema).
// Formato de cada linha, como no Copa Fácil: "Nome; Equipe; número". Puro e testado.

import type { Equipe, LinhaRankingManual } from './tipos';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export interface Leitura {
  linhas: LinhaRankingManual[];
  erros: string[];
}

/**
 * Lê "Nome; Equipe; 5" (também aceita tabulação ou " - " como separador). A equipe
 * é casada pelo nome ou pela sigla, sem diferenciar acento e caixa. Linhas vazias
 * são ignoradas. A ordem final é pelo número, maior primeiro (empates mantêm a ordem dada).
 */
export function lerRankingManual(texto: string, equipes: readonly Equipe[]): Leitura {
  const linhas: LinhaRankingManual[] = [];
  const erros: string[] = [];
  texto.split(/\r?\n/).forEach((bruta, i) => {
    const linha = bruta.trim();
    if (!linha) return;
    const partes = linha.split(/\s*[;\t]\s*|\s+-\s+/).map((p) => p.trim());
    if (partes.length !== 3) {
      erros.push(`Linha ${i + 1}: use "Nome; Equipe; número".`);
      return;
    }
    const [jogador, nomeEquipe, numero] = partes;
    const valor = Number(numero.replace(',', '.'));
    if (!jogador) erros.push(`Linha ${i + 1}: falta o nome.`);
    else if (!Number.isInteger(valor) || valor < 0) erros.push(`Linha ${i + 1}: "${numero}" não é um número inteiro.`);
    else {
      const equipe = equipes.find((e) => semAcento(e.nome) === semAcento(nomeEquipe) || semAcento(e.sigla) === semAcento(nomeEquipe));
      if (nomeEquipe && !equipe) erros.push(`Linha ${i + 1}: equipe "${nomeEquipe}" não existe nesta edição.`);
      else linhas.push({ jogador, equipeId: equipe?.id, valor });
    }
  });
  const ordenadas = linhas.map((l, i) => ({ l, i })).sort((a, b) => b.l.valor - a.l.valor || a.i - b.i).map((x) => x.l);
  return { linhas: ordenadas, erros };
}

/** O inverso de lerRankingManual, para o texto do formulário. */
export function escreverRankingManual(linhas: readonly LinhaRankingManual[] | undefined, equipes: readonly Equipe[]): string {
  return (linhas ?? []).map((l) => `${l.jogador}; ${equipes.find((e) => e.id === l.equipeId)?.nome ?? ''}; ${l.valor}`).join('\n');
}

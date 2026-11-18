import { describe, expect, it } from 'vitest';
import { escreverRankingManual, lerRankingManual } from './historico';
import type { Equipe } from './tipos';

const equipes: Equipe[] = [
  { id: 'rom', nome: 'Roma', sigla: 'ROM', corPrimaria: '#8E1F2F', corSecundaria: '#F0BC42', corTexto: '#fff' },
  { id: 'fio', nome: 'Fiorentina', sigla: 'FIO', corPrimaria: '#482E92', corSecundaria: '#fff', corTexto: '#fff' },
  { id: 'esp', nome: 'Espanha', sigla: 'ESP', corPrimaria: '#C60B1E', corSecundaria: '#FFC400', corTexto: '#fff' },
];

describe('ranking lançado à mão (edições antigas)', () => {
  it('lê "Nome; Equipe; número", casa a equipe sem acento/caixa e ordena pelo número', () => {
    const r = lerRankingManual('Cauã; roma; 4\nEdu; Roma; 5\n\nLamba;FIORENTINA;4', equipes);
    expect(r.erros).toEqual([]);
    expect(r.linhas).toEqual([
      { jogador: 'Edu', equipeId: 'rom', valor: 5 },
      { jogador: 'Cauã', equipeId: 'rom', valor: 4 },
      { jogador: 'Lamba', equipeId: 'fio', valor: 4 },
    ]);
  });

  it('aceita tabulação, " - " e a sigla da equipe; equipe vazia é permitida', () => {
    const r = lerRankingManual('Vitinho\tESP\t5\nNatanael - Espanha - 4\nConvidado;;1', equipes);
    expect(r.erros).toEqual([]);
    expect(r.linhas.map((l) => [l.jogador, l.equipeId, l.valor])).toEqual([
      ['Vitinho', 'esp', 5],
      ['Natanael', 'esp', 4],
      ['Convidado', undefined, 1],
    ]);
  });

  it('aponta a linha com problema e não inventa equipe nem número', () => {
    const r = lerRankingManual('Edu; Roma; cinco\nPedrão; Lazio; 2\nsó o nome', equipes);
    expect(r.linhas).toEqual([]);
    expect(r.erros).toEqual([
      'Linha 1: "cinco" não é um número inteiro.',
      'Linha 2: equipe "Lazio" não existe nesta edição.',
      'Linha 3: use "Nome; Equipe; número".',
    ]);
  });

  it('escreve de volta no mesmo formato', () => {
    const { linhas } = lerRankingManual('Edu; Roma; 5\nLamba; Fiorentina; 4', equipes);
    expect(escreverRankingManual(linhas, equipes)).toBe('Edu; Roma; 5\nLamba; Fiorentina; 4');
    expect(lerRankingManual(escreverRankingManual(linhas, equipes), equipes).linhas).toEqual(linhas);
  });
});

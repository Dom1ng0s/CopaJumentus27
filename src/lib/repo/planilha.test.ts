import { describe, expect, it } from 'vitest';
import { sortear } from '@/lib/domain/sorteio';
import { interpretarPlanilha, lerCsv, ORDEM_TIMES } from './planilha';

const CAB = 'ID,Nome,Apelido,Posição,Estrelas,Capitão do time,Status,Ref';

function linha(nome: string, pos: string, est: string, cap = '', status = 'Confirmado'): string {
  return `,${nome},,${pos},${est},${cap},${status},`;
}

function cadastroCompleto(): string {
  const linhas = [CAB];
  ORDEM_TIMES.forEach((t, i) => {
    linhas.push(linha(`Capitao ${i}`, 'MEI', String((i % 6) + 1), t));
    linhas.push(linha(`Goleiro ${i}`, 'GOL', ''));
    for (let k = 0; k < 6; k++) linhas.push(linha(`Jogador ${i}-${k}`, 'ATA', String(((i + k) % 6) + 1)));
  });
  linhas.push(linha('Reserva', 'ZAG', '3', '', 'Lista de espera'));
  return linhas.join('\r\n');
}

describe('lerCsv', () => {
  it('respeita aspas, virgulas e aspas escapadas', () => {
    expect(lerCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('interpretarPlanilha', () => {
  it('monta 64 jogadores, 8 times na ordem oficial e ignora a lista de espera', () => {
    const r = interpretarPlanilha(cadastroCompleto());
    expect(r.problemas).toEqual([]);
    expect(r.jogadores).toHaveLength(64);
    expect(r.ignorados).toBe(1);
    expect(r.times.map((t) => t.nome)).toEqual([...ORDEM_TIMES]);
    expect(r.jogadores.filter((j) => j.ehCapitao)).toHaveLength(8);
  });

  it('o resultado alimenta o sorteio sem erro', () => {
    const r = interpretarPlanilha(cadastroCompleto());
    const s = sortear({ jogadores: r.jogadores, times: r.times });
    expect(s.sorteio.linha).toHaveLength(48);
    expect(s.sorteio.goleiros).toHaveLength(8);
  });

  it('goleiro sem estrelas nao e pendencia; jogador de linha sem estrelas e', () => {
    const csv = [CAB, linha('Gol', 'GOL', ''), linha('Linha', 'MEI', '')].join('\n');
    const r = interpretarPlanilha(csv);
    expect(r.jogadores.map((j) => j.nome)).toEqual(['Gol']);
    expect(r.problemas.some((p) => p.startsWith('Linha (linha 3): estrelas vazias'))).toBe(true);
  });

  it('acusa posicao vazia, capitao duplicado, time sem capitao e nome repetido', () => {
    const csv = [
      CAB,
      linha('Ana', '', '3'),
      linha('Bia', 'MEI', '4', 'LAFC'),
      linha('Caio', 'ATA', '4', 'LA FC'),
      linha('bia', 'ZAG', '2'),
    ].join('\n');
    const r = interpretarPlanilha(csv);
    expect(r.problemas).toContain('Ana (linha 2): posição vazia.');
    expect(r.problemas).toContain('LAFC: 2 capitães marcados (deve ser 1).');
    expect(r.problemas).toContain('Inter Miami: sem capitão.');
    expect(r.problemas).toContain('Nome repetido: bia (linhas 3 e 5).');
    expect(r.times).toHaveLength(0);
  });

  it('acusa cabecalho incompleto', () => {
    const r = interpretarPlanilha('Nome,Posição\nAna,MEI');
    expect(r.problemas[0]).toMatch(/^Colunas ausentes/);
  });
});

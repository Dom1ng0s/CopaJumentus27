// Testes das invariantes de CLAUDE.md §3.3 e das regras de goleiro de §3.4.

import { describe, expect, it } from 'vitest';
import { TOLERANCIA_ESTRELAS } from '@/lib/config';
import { montarElencos, sortear } from './sorteio';
import { poteDeLinha, somasDeEstrelas, amplitude } from './validacao';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from '@/lib/repo/seed';
import type { Estrelas, Jogador, Posicao, Time } from './tipos';

/** Fonte determinística para os testes (LCG) — o domínio não usa crypto aqui. */
function fonteSemente(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 0x1_0000_0000;
    return estado / 0x1_0000_0000;
  };
}

function jogador(
  id: string,
  estrelas: Estrelas,
  posicao: Posicao = 'MEI',
  ehCapitao = false,
): Jogador {
  return { id, nome: `Jogador ${id}`, posicao, estrelas, ehCapitao };
}

describe('sortear — invariantes', () => {
  const casos = [1, 2, 3, 7, 42, 99, 12345];

  it.each(casos)('seed %i: elenco de exemplo respeita todas as invariantes', (semente) => {
    const { sorteio, violacoes } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(semente),
    );

    expect(violacoes).toEqual([]);
    expect(sorteio.toleranciaEstourada).toBe(false);
    expect(sorteio.amplitudeEstrelas).toBeLessThanOrEqual(TOLERANCIA_ESTRELAS);
  });

  it('invariante 1: todo jogador do pote é alocado exatamente uma vez', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(7),
    );
    const pote = poteDeLinha(JOGADORES_EXEMPLO);
    const ids = sorteio.linha.map((a) => a.jogadorId);

    expect(ids).toHaveLength(pote.length);
    expect(new Set(ids).size).toBe(pote.length);
  });

  it('invariante 2: diferença de tamanho de elenco é no máximo 1', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(13),
    );
    const tamanhos = TIMES_EXEMPLO.map(
      (t) => sorteio.linha.filter((a) => a.timeId === t.id).length,
    );
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
  });

  it('invariante 4: capitão nunca aparece no sorteio de linha', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(21),
    );
    const capitaes = new Set(TIMES_EXEMPLO.map((t) => t.capitaoId));
    expect(sorteio.linha.some((a) => capitaes.has(a.jogadorId))).toBe(false);
  });

  it('não muta a entrada', () => {
    const copia = structuredClone(JOGADORES_EXEMPLO);
    sortear({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO }, fonteSemente(5));
    expect(JOGADORES_EXEMPLO).toEqual(copia);
  });
});

describe('sortear — estrelas', () => {
  it('estrelas do capitão contam na soma do time (§3.2)', () => {
    const jogadores: Jogador[] = [
      jogador('c1', 6, 'MEI', true),
      jogador('c2', 2, 'MEI', true),
      jogador('j1', 3),
      jogador('j2', 3),
    ];
    const times: Time[] = [
      { id: 't1', nome: 'A', capitaoId: 'c1' },
      { id: 't2', nome: 'B', capitaoId: 'c2' },
    ];

    const { sorteio } = sortear({ jogadores, times }, fonteSemente(1));
    const somas = somasDeEstrelas(jogadores, times, sorteio.linha);

    // O capitão entra na conta: 6+3=9 contra 2+3=5.
    expect([...somas.values()].sort((a, b) => b - a)).toEqual([9, 5]);
  });

  it('tamanho de elenco (inv. 2) tem prioridade sobre tolerância (inv. 3)', () => {
    // Capitães muito desiguais e só 1 jogador por time: dar os dois reforços ao
    // time fraco fecharia a conta de estrelas, mas quebraria o tamanho do elenco.
    // O sistema mantém os elencos iguais e avisa o operador.
    const jogadores: Jogador[] = [
      jogador('c1', 6, 'MEI', true),
      jogador('c2', 2, 'MEI', true),
      jogador('j1', 3),
      jogador('j2', 3),
    ];
    const times: Time[] = [
      { id: 't1', nome: 'A', capitaoId: 'c1' },
      { id: 't2', nome: 'B', capitaoId: 'c2' },
    ];

    const { sorteio, violacoes } = sortear({ jogadores, times }, fonteSemente(1));
    const tamanhos = times.map((t) => sorteio.linha.filter((a) => a.timeId === t.id).length);

    expect(tamanhos).toEqual([1, 1]);
    expect(sorteio.amplitudeEstrelas).toBeGreaterThan(TOLERANCIA_ESTRELAS);
    expect(sorteio.toleranciaEstourada).toBe(true);
    expect(violacoes.some((v) => v.invariante === 3)).toBe(true);
    expect(violacoes.some((v) => v.invariante === 2)).toBe(false);
  });

  it('estrelas do goleiro NÃO entram na soma do time (§3.2)', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(3),
    );
    const elencos = montarElencos(JOGADORES_EXEMPLO, TIMES_EXEMPLO, sorteio);

    for (const e of elencos) {
      const esperado = e.capitao.estrelas + e.linha.reduce((s, j) => s + j.estrelas, 0);
      expect(e.somaEstrelas).toBe(esperado);
    }
  });

  it('avisa em vez de falhar quando a tolerância é impossível', () => {
    // Um craque de 6 e nada para compensar: amplitude mínima possível é 6.
    const jogadores: Jogador[] = [
      jogador('c1', 1, 'MEI', true),
      jogador('c2', 1, 'MEI', true),
      jogador('j1', 6),
    ];
    const times: Time[] = [
      { id: 't1', nome: 'A', capitaoId: 'c1' },
      { id: 't2', nome: 'B', capitaoId: 'c2' },
    ];

    const { sorteio, violacoes } = sortear({ jogadores, times }, fonteSemente(9));

    expect(sorteio.toleranciaEstourada).toBe(true);
    expect(sorteio.linha).toHaveLength(1);
    expect(violacoes.some((v) => v.invariante === 3)).toBe(true);
  });
});

describe('sortear — goleiros (§3.4)', () => {
  it('aloca exatamente 1 goleiro por time', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(11),
    );
    expect(sorteio.goleiros).toHaveLength(TIMES_EXEMPLO.length);
    expect(new Set(sorteio.goleiros.map((a) => a.timeId)).size).toBe(TIMES_EXEMPLO.length);
    expect(new Set(sorteio.goleiros.map((a) => a.jogadorId)).size).toBe(TIMES_EXEMPLO.length);
  });

  it('faltando goleiro: marca o time em vez de reutilizar ou inventar', () => {
    const jogadores: Jogador[] = [
      jogador('c1', 3, 'MEI', true),
      jogador('c2', 3, 'MEI', true),
      jogador('g1', 3, 'GOL'),
      jogador('j1', 2),
      jogador('j2', 2),
    ];
    const times: Time[] = [
      { id: 't1', nome: 'A', capitaoId: 'c1' },
      { id: 't2', nome: 'B', capitaoId: 'c2' },
    ];

    const { sorteio } = sortear({ jogadores, times }, fonteSemente(4));

    expect(sorteio.goleiros).toHaveLength(1);
    expect(sorteio.timesSemGoleiroIds).toHaveLength(1);
    expect(sorteio.goleirosReservaIds).toHaveLength(0);
  });

  it('goleiro sobrando vira reserva e não volta ao pote de linha', () => {
    const jogadores: Jogador[] = [
      jogador('c1', 3, 'MEI', true),
      jogador('g1', 3, 'GOL'),
      jogador('g2', 4, 'GOL'),
      jogador('j1', 2),
    ];
    const times: Time[] = [{ id: 't1', nome: 'A', capitaoId: 'c1' }];

    const { sorteio } = sortear({ jogadores, times }, fonteSemente(6));

    expect(sorteio.goleiros).toHaveLength(1);
    expect(sorteio.goleirosReservaIds).toHaveLength(1);
    // O reserva nao aparece na etapa de linha.
    expect(sorteio.linha.map((a) => a.jogadorId)).not.toContain(sorteio.goleirosReservaIds[0]);
  });
});

describe('montarElencos — cerimônia parcial', () => {
  it('revela progressivamente sem vazar quem ainda não saiu', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(8),
    );

    const parcial = montarElencos(JOGADORES_EXEMPLO, TIMES_EXEMPLO, sorteio, 5, 0);
    const totalRevelado = parcial.reduce((s, e) => s + e.linha.length, 0);

    expect(totalRevelado).toBe(5);
    expect(parcial.every((e) => e.goleiro === null)).toBe(true);
  });

  it('ao final, todo o pote está distribuído', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(2),
    );
    const completo = montarElencos(JOGADORES_EXEMPLO, TIMES_EXEMPLO, sorteio);

    expect(completo.reduce((s, e) => s + e.linha.length, 0)).toBe(
      poteDeLinha(JOGADORES_EXEMPLO).length,
    );
    expect(completo.every((e) => e.goleiro !== null)).toBe(true);
  });
});

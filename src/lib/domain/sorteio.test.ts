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

function jogador(id: string, estrelas: Estrelas, posicao: Posicao = 'MEI'): Jogador {
  return { id, nome: `Jogador ${id}`, posicao, estrelas };
}

const DOIS_TIMES: Time[] = [
  { id: 't1', nome: 'A' },
  { id: 't2', nome: 'B' },
];

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

  it('sem capitão fixo: todo jogador de linha entra no pote e os times começam vazios', () => {
    const { sorteio } = sortear(
      { jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO },
      fonteSemente(21),
    );
    const linha = JOGADORES_EXEMPLO.filter((j) => j.posicao !== 'GOL');
    expect(sorteio.linha).toHaveLength(linha.length);
    const somasVazias = somasDeEstrelas(JOGADORES_EXEMPLO, TIMES_EXEMPLO, []);
    expect([...somasVazias.values()].every((v) => v === 0)).toBe(true);
  });

  it('não muta a entrada', () => {
    const copia = structuredClone(JOGADORES_EXEMPLO);
    sortear({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO }, fonteSemente(5));
    expect(JOGADORES_EXEMPLO).toEqual(copia);
  });
});

describe('sortear — estrelas', () => {
  it('tamanho de elenco (inv. 2) tem prioridade sobre tolerância (inv. 3)', () => {
    // Um craque de 6 e três de 1: dar os dois mais fracos ao time do craque fecharia
    // pior; dar três ao outro time quebraria o tamanho. O sistema mantém 2 x 2 e avisa.
    const jogadores: Jogador[] = [jogador('j1', 6), jogador('j2', 1), jogador('j3', 1), jogador('j4', 1)];

    const { sorteio, violacoes } = sortear({ jogadores, times: DOIS_TIMES }, fonteSemente(1));
    const tamanhos = DOIS_TIMES.map((t) => sorteio.linha.filter((a) => a.timeId === t.id).length);

    expect(tamanhos).toEqual([2, 2]);
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
      const esperado = e.linha.reduce((s, j) => s + j.estrelas, 0);
      expect(e.somaEstrelas).toBe(esperado);
    }
  });

  it('avisa em vez de falhar quando a tolerância é impossível', () => {
    // Um craque de 6 e nada para compensar: amplitude mínima possível é 6.
    const jogadores: Jogador[] = [jogador('j1', 6)];

    const { sorteio, violacoes } = sortear({ jogadores, times: DOIS_TIMES }, fonteSemente(9));

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
    const jogadores: Jogador[] = [jogador('g1', 3, 'GOL'), jogador('j1', 2), jogador('j2', 2)];

    const { sorteio } = sortear({ jogadores, times: DOIS_TIMES }, fonteSemente(4));

    expect(sorteio.goleiros).toHaveLength(1);
    expect(sorteio.timesSemGoleiroIds).toHaveLength(1);
    expect(sorteio.goleirosReservaIds).toHaveLength(0);
  });

  it('goleiro sobrando vira reserva e não volta ao pote de linha', () => {
    const jogadores: Jogador[] = [jogador('g1', 3, 'GOL'), jogador('g2', 4, 'GOL'), jogador('j1', 2)];
    const times: Time[] = [{ id: 't1', nome: 'A' }];

    const { sorteio } = sortear({ jogadores, times }, fonteSemente(6));

    expect(sorteio.goleiros).toHaveLength(1);
    expect(sorteio.goleirosReservaIds).toHaveLength(1);
    // O reserva nao aparece na etapa de linha.
    expect(sorteio.linha.map((a) => a.jogadorId)).not.toContain(sorteio.goleirosReservaIds[0]);
  });
});

describe('sortear — ordem de revelação aleatória (decisão de 18/11/2026)', () => {
  const nivel = (id: string) => JOGADORES_EXEMPLO.find((j) => j.id === id)?.estrelas ?? 0;

  it.each([1, 2, 3, 7, 42])('seed %i: a revelação não sai agrupada do maior nível para o menor', (semente) => {
    const { sorteio } = sortear({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO }, fonteSemente(semente));
    const niveis = sorteio.linha.map((a) => nivel(a.jogadorId));
    const decrescente = niveis.every((n, i) => i === 0 || niveis[i - 1] >= n);
    expect(decrescente).toBe(false);
  });

  it('embaralhar a revelação não mexe no equilíbrio: cada um continua no time sorteado', () => {
    const { sorteio, violacoes } = sortear({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO }, fonteSemente(11));
    expect(violacoes).toEqual([]);
    const somas = somasDeEstrelas(JOGADORES_EXEMPLO, TIMES_EXEMPLO, sorteio.linha);
    expect(amplitude(somas)).toBe(sorteio.amplitudeEstrelas);
    expect(new Set(sorteio.linha.map((a) => a.jogadorId)).size).toBe(sorteio.linha.length);
  });

  it('em sorteios diferentes, a ordem de revelação muda', () => {
    const ordem = (semente: number) =>
      sortear({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO }, fonteSemente(semente)).sorteio.linha.map((a) => a.jogadorId).join();
    expect(new Set([1, 2, 3, 4, 5].map(ordem)).size).toBeGreaterThan(1);
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

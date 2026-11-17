import { describe, expect, it } from 'vitest';
import { calcularClassificacao, resumirJogos, vencedor } from './classificacao';
import { gerarRodadas, sortearGrupos } from './grupos';
import { artilharia, assistencias, cartoes } from './rankings';
import { calcularSuspensoes } from './suspensoes';
import { CRITERIOS_PADRAO, type EventoPartida, type Partida, type StatusPartida } from './tipos';

const PONTOS = { vitoria: 3, empate: 1, derrota: 0 };

let seq = 0;
function jogo(
  m: string,
  v: string,
  gm: number,
  gv: number,
  extra: Partial<Partida> & { status?: StatusPartida; eventos?: EventoPartida[] } = {},
): Partida {
  seq += 1;
  return {
    id: `j${seq}`,
    faseId: 'f1',
    mandanteId: m,
    visitanteId: v,
    golsMandante: gm,
    golsVisitante: gv,
    status: 'encerrada',
    eventos: [],
    ...extra,
  };
}

function fonteSemente(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 0x1_0000_0000;
    return estado / 0x1_0000_0000;
  };
}

describe('calcularClassificacao', () => {
  it('soma pontos 3/1/0, saldo e aproveitamento', () => {
    const tabela = calcularClassificacao(
      ['A', 'B', 'C'],
      [jogo('A', 'B', 2, 0), jogo('B', 'C', 1, 1), jogo('C', 'A', 0, 1)],
      PONTOS,
      CRITERIOS_PADRAO,
    );
    // B e C com 1 ponto; C perdeu só por 1 (saldo -1) e B por 2 (saldo -2).
    expect(tabela.map((l) => l.equipeId)).toEqual(['A', 'C', 'B']);
    expect(tabela[0]).toMatchObject({ pontos: 6, jogos: 2, vitorias: 2, golsPro: 3, golsContra: 0, saldo: 3, aproveitamento: 100 });
    expect(tabela[2]).toMatchObject({ pontos: 1, empates: 1, derrotas: 1, saldo: -2 });
  });

  it('ignora partidas agendadas e ao vivo', () => {
    const tabela = calcularClassificacao(
      ['A', 'B'],
      [jogo('A', 'B', 5, 0, { status: 'ao-vivo' }), jogo('A', 'B', 0, 0, { status: 'agendada' })],
      PONTOS,
      CRITERIOS_PADRAO,
    );
    expect(tabela.every((l) => l.jogos === 0)).toBe(true);
  });

  it('desempata pela ordem de critérios configurada', () => {
    // A e B com 3 pontos; A tem mais gols, B tem saldo melhor.
    const partidas = [jogo('A', 'C', 4, 3), jogo('B', 'C', 1, 0), jogo('A', 'B', 0, 0, { status: 'agendada' })];
    const porSaldo = calcularClassificacao(['A', 'B', 'C'], partidas, PONTOS, ['pontos', 'saldo', 'golsPro']);
    expect(porSaldo.slice(0, 2).map((l) => l.equipeId)).toEqual(['A', 'B']); // saldo igual (+1), decide gols
    const porGols = calcularClassificacao(['A', 'B', 'C'], partidas, PONTOS, ['pontos', 'golsContra']);
    expect(porGols[0].equipeId).toBe('B');
  });

  it('confronto direto decide entre duas equipes empatadas', () => {
    const partidas = [jogo('A', 'B', 0, 1), jogo('A', 'C', 2, 0), jogo('B', 'C', 0, 2)];
    // A: 3 pts, saldo +1; B: 3 pts, saldo -1; C: 3 pts, saldo 0. Só confronto: B venceu A.
    const tabela = calcularClassificacao(['A', 'B'], partidas, PONTOS, ['pontos', 'confronto']);
    expect(tabela.map((l) => l.equipeId)).toEqual(['B', 'A']);
  });
});

describe('resumirJogos e vencedor', () => {
  it('conta só encerradas', () => {
    const r = resumirJogos([jogo('A', 'B', 2, 2), jogo('A', 'C', 3, 0), jogo('B', 'C', 9, 9, { status: 'ao-vivo' })]);
    expect(r).toEqual({ jogos: 2, empates: 1, gols: 7, mediaGols: 3.5 });
  });

  it('usa pênaltis no empate', () => {
    expect(vencedor(jogo('A', 'B', 1, 1, { penaltisMandante: 4, penaltisVisitante: 5 }))).toBe('B');
    expect(vencedor(jogo('A', 'B', 1, 1))).toBeNull();
    expect(vencedor(jogo('A', 'B', 2, 1, { status: 'ao-vivo' }))).toBeNull();
  });
});

describe('grupos', () => {
  it('sorteia todas as equipes em grupos equilibrados', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const semente of [1, 7, 42]) {
      const grupos = sortearGrupos(ids, 2, fonteSemente(semente));
      expect(grupos.map((g) => g.length)).toEqual([4, 4]);
      expect(grupos.flat().sort()).toEqual(ids);
    }
    expect(sortearGrupos(ids, 3, fonteSemente(3)).map((g) => g.length).sort()).toEqual([2, 3, 3]);
  });

  it('gera todos contra todos sem repetir confronto', () => {
    const rodadas = gerarRodadas(['a', 'b', 'c', 'd']);
    expect(rodadas).toHaveLength(3);
    const pares = rodadas.flat().map(([x, y]) => [x, y].sort().join('-'));
    expect(new Set(pares).size).toBe(6);
    rodadas.forEach((r) => expect(new Set(r.flat()).size).toBe(4));
  });

  it('com número ímpar, cada equipe folga uma vez', () => {
    const rodadas = gerarRodadas(['a', 'b', 'c']);
    expect(rodadas).toHaveLength(3);
    expect(rodadas.flat()).toHaveLength(3);
  });
});

describe('suspensões', () => {
  const equipe = new Map([
    ['p1', 'A'],
    ['p2', 'B'],
  ]);
  const amarelo = (jogadorId: string, equipeId = 'A'): EventoPartida => ({ id: `e${jogadorId}${Math.random()}`, tipo: 'amarelo', jogadorId, equipeId });

  it('3 amarelos suspendem o jogo seguinte e zeram a contagem', () => {
    const partidas = [
      jogo('A', 'B', 0, 0, { dataHora: '2027-01-16T08:00', eventos: [amarelo('p1')] }),
      jogo('A', 'C', 0, 0, { dataHora: '2027-01-16T09:00', eventos: [amarelo('p1')] }),
      jogo('A', 'D', 0, 0, { dataHora: '2027-01-16T10:00', eventos: [amarelo('p1')] }),
    ];
    const s = calcularSuspensoes(partidas, equipe).get('p1')!;
    expect(s).toMatchObject({ suspenso: true, motivo: 'amarelos', amarelos: 0 });

    const comProximo = [...partidas, jogo('B', 'A', 1, 0, { dataHora: '2027-01-16T11:00' })];
    const depois = calcularSuspensoes(comProximo, equipe).get('p1')!;
    expect(depois.suspenso).toBe(false);
    expect(depois.cumpridas).toHaveLength(1);
  });

  it('vermelho suspende o jogo seguinte', () => {
    const partidas = [
      jogo('A', 'B', 0, 0, {
        dataHora: '2027-01-16T08:00',
        eventos: [{ id: 'v', tipo: 'vermelho', jogadorId: 'p2', equipeId: 'B' }],
      }),
    ];
    expect(calcularSuspensoes(partidas, equipe).get('p2')).toMatchObject({ suspenso: true, motivo: 'vermelho' });
  });

  it('suspensão só é cumprida quando o jogo seguinte termina', () => {
    const partidas = [
      jogo('A', 'B', 0, 0, { dataHora: '2027-01-16T08:00', eventos: [{ id: 'v', tipo: 'vermelho', jogadorId: 'p1', equipeId: 'A' }] }),
      jogo('A', 'C', 0, 0, { dataHora: '2027-01-16T09:00', status: 'ao-vivo' }),
    ];
    expect(calcularSuspensoes(partidas, equipe).get('p1')!.suspenso).toBe(true);
  });
});

describe('rankings', () => {
  const partidas = [
    jogo('A', 'B', 2, 1, {
      eventos: [
        { id: '1', tipo: 'gol', jogadorId: 'p1', equipeId: 'A', assistenciaId: 'p3' },
        { id: '2', tipo: 'gol', jogadorId: 'p1', equipeId: 'A' },
        { id: '3', tipo: 'gol-contra', jogadorId: 'p1', equipeId: 'A' },
        { id: '4', tipo: 'amarelo', jogadorId: 'p2', equipeId: 'B' },
        { id: '5', tipo: 'vermelho', jogadorId: 'p4', equipeId: 'B' },
      ],
    }),
    jogo('A', 'B', 0, 0, { status: 'agendada', eventos: [{ id: '6', tipo: 'gol', jogadorId: 'p9', equipeId: 'A' }] }),
  ];

  it('artilharia ignora gol contra e partidas agendadas', () => {
    expect(artilharia(partidas)).toEqual([{ jogadorId: 'p1', valor: 2 }]);
  });

  it('assistências e cartões', () => {
    expect(assistencias(partidas)).toEqual([{ jogadorId: 'p3', valor: 1 }]);
    expect(cartoes(partidas).map((c) => c.jogadorId)).toEqual(['p4', 'p2']);
  });
});

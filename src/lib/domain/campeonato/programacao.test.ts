import { describe, expect, it } from 'vitest';
import { aplicarModelo } from './modelo';
import {
  aplicarProgramacao,
  lerDataHora,
  problemaNaProgramacao,
  programacaoPadrao,
  remarcarPartida,
  resumirProgramacao,
  type Programacao,
} from './programacao';
import { CRITERIOS_PADRAO, type Campeonato, type Partida } from './tipos';

function campeonatoModelo(): Campeonato {
  let n = 0;
  const c: Campeonato = {
    versao: 1,
    id: 1,
    slug: 't',
    nome: 'T',
    status: 'andamento',
    modelo: 'copa-jumentus-8',
    pontuacao: { vitoria: 3, empate: 1, derrota: 0 },
    criterios: [...CRITERIOS_PADRAO],
    valorInscricao: 0,
    equipes: 'abcdefgh'.split('').map((id) => ({ id, nome: id, sigla: id, corPrimaria: '#000', corSecundaria: '#111', corTexto: '#fff' })),
    jogadores: [],
    fases: [],
    grupos: [],
    partidas: [],
  };
  aplicarModelo(c, () => `id${++n}`);
  return c;
}

const PROG: Programacao = {
  dias: [
    { data: '2027-01-16', inicio: '08:00' },
    { data: '2027-01-17', inicio: '08:30' },
  ],
  duracaoMin: 30,
  intervaloMin: 5,
};

const porNumero = (c: Campeonato, n: number): Partida => c.partidas.find((p) => p.numero === n)!;

describe('programação dos jogos', () => {
  it('gera os 34 horários em sequência por dia: um campo, um jogo por vez', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    expect(porNumero(c, 1).dataHora).toBe('2027-01-16T08:00');
    expect(porNumero(c, 2).dataHora).toBe('2027-01-16T08:35');
    expect(porNumero(c, 16).dataHora).toBe('2027-01-16T16:45');
    // Dia 2 recomeça no horário do dia 2 e o mata-mata continua a sequência.
    expect(porNumero(c, 17).dataHora).toBe('2027-01-17T08:30');
    expect(porNumero(c, 28).dataHora).toBe('2027-01-17T14:55');
    expect(porNumero(c, 29).dataHora).toBe('2027-01-17T15:30');
    expect(porNumero(c, 34).dataHora).toBe('2027-01-17T18:25');
    expect(c.partidas.every((p) => p.dataHora)).toBe(true);
  });

  it('resume cada dia: quantidade de jogos e horário do fim', () => {
    const c = campeonatoModelo();
    expect(resumirProgramacao(c.partidas, PROG)).toEqual([
      { dia: 1, data: '2027-01-16', jogos: 16, primeiro: '08:00', fim: '17:15', passaDaMeiaNoite: false },
      { dia: 2, data: '2027-01-17', jogos: 18, primeiro: '08:30', fim: '18:55', passaDaMeiaNoite: false },
    ]);
  });

  it('jogo que já começou ou acabou mantém o horário', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    porNumero(c, 1).status = 'encerrada';
    porNumero(c, 2).status = 'ao-vivo';
    aplicarProgramacao(c.partidas, { ...PROG, dias: [{ data: '2027-01-16', inicio: '09:00' }, PROG.dias[1]] });
    expect(porNumero(c, 1).dataHora).toBe('2027-01-16T08:00');
    expect(porNumero(c, 2).dataHora).toBe('2027-01-16T08:35');
    expect(porNumero(c, 3).dataHora).toBe('2027-01-16T10:10');
  });

  it('jogo já jogado sem horário recebe o horário da vez', () => {
    const c = campeonatoModelo();
    porNumero(c, 1).status = 'encerrada';
    aplicarProgramacao(c.partidas, PROG);
    expect(porNumero(c, 1).dataHora).toBe('2027-01-16T08:00');
  });

  it('recusa programação que passaria da meia-noite', () => {
    const c = campeonatoModelo();
    expect(() => aplicarProgramacao(c.partidas, { ...PROG, dias: [{ data: '2027-01-16', inicio: '20:00' }, PROG.dias[1]] })).toThrow(/meia-noite/);
  });

  it('valida o preenchimento', () => {
    expect(problemaNaProgramacao(PROG, 2)).toBeNull();
    expect(problemaNaProgramacao({ ...PROG, dias: [PROG.dias[0]] }, 2)).toMatch(/2 dias/);
    expect(problemaNaProgramacao({ ...PROG, dias: [PROG.dias[0], { data: '', inicio: '08:00' }] }, 2)).toMatch(/data do dia 2/);
    expect(problemaNaProgramacao({ ...PROG, dias: [{ data: '2027-01-16', inicio: '25:00' }, PROG.dias[1]] }, 2)).toMatch(/horário/);
    expect(problemaNaProgramacao({ ...PROG, duracaoMin: 0 }, 2)).toMatch(/duração/);
    expect(problemaNaProgramacao({ ...PROG, intervaloMin: -1 }, 2)).toMatch(/intervalo/);
  });

  it('sugere a programação a partir do período do campeonato', () => {
    expect(programacaoPadrao('2027-01-16', '2027-01-17', 2)).toEqual({
      dias: [
        { data: '2027-01-16', inicio: '08:00' },
        { data: '2027-01-17', inicio: '08:00' },
      ],
      duracaoMin: 30,
      intervaloMin: 5,
    });
  });

  it('lê o texto do input datetime-local', () => {
    expect(lerDataHora('2027-01-16T08:35')).toEqual({ data: '2027-01-16', minutos: 515 });
    expect(lerDataHora('2027-01-16')).toBeNull();
    expect(lerDataHora(undefined)).toBeNull();
  });
});

describe('remarcar jogo', () => {
  it('sem empurrar, muda só o jogo escolhido', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    expect(remarcarPartida(c.partidas, porNumero(c, 5).id, '2027-01-16T10:40', false)).toBe(0);
    expect(porNumero(c, 5).dataHora).toBe('2027-01-16T10:40');
    expect(porNumero(c, 6).dataHora).toBe('2027-01-16T10:55');
  });

  it('atraso: empurra os jogos seguintes do mesmo dia pela mesma diferença', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    // Jogo 5 era 10:20; atrasou 20 minutos.
    expect(remarcarPartida(c.partidas, porNumero(c, 5).id, '2027-01-16T10:40', true)).toBe(11);
    expect(porNumero(c, 4).dataHora).toBe('2027-01-16T09:45');
    expect(porNumero(c, 6).dataHora).toBe('2027-01-16T11:15');
    expect(porNumero(c, 16).dataHora).toBe('2027-01-16T17:05');
    // O dia 2 não muda.
    expect(porNumero(c, 17).dataHora).toBe('2027-01-17T08:30');
  });

  it('adiantar também funciona, e jogo já começado não anda', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    porNumero(c, 7).status = 'encerrada';
    remarcarPartida(c.partidas, porNumero(c, 5).id, '2027-01-16T10:10', true);
    expect(porNumero(c, 6).dataHora).toBe('2027-01-16T10:45');
    expect(porNumero(c, 7).dataHora).toBe('2027-01-16T11:30');
    expect(porNumero(c, 8).dataHora).toBe('2027-01-16T11:55');
  });

  it('mudando o jogo de dia, não empurra nada', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    expect(remarcarPartida(c.partidas, porNumero(c, 16).id, '2027-01-17T07:30', true)).toBe(0);
    expect(porNumero(c, 16).dataHora).toBe('2027-01-17T07:30');
  });

  it('recusa empurrar jogos para além da meia-noite', () => {
    const c = campeonatoModelo();
    aplicarProgramacao(c.partidas, PROG);
    expect(() => remarcarPartida(c.partidas, porNumero(c, 2).id, '2027-01-16T23:00', true)).toThrow(/sairia do dia/);
  });
});

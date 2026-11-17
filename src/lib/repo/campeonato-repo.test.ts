import { beforeEach, describe, expect, it, vi } from 'vitest';

// O teste não pode depender do que há em dados/ (ex.: o campeonato.json do `npm run demo`).
vi.mock('node:fs/promises', () => ({
  readFile: () => Promise.reject(Object.assign(new Error('sem arquivo'), { code: 'ENOENT' })),
}));
import { bancoDeTeste, type Banco } from '@/lib/db/cliente';
import { atualizarCampeonato, campeonatoPadrao, carregarCampeonato } from './campeonato-repo';

let db: Banco;
beforeEach(async () => {
  db = await bancoDeTeste();
});

describe('campeonato no banco', () => {
  it('banco vazio começa com as 8 equipes e as 2 fases padrão', async () => {
    const c = await carregarCampeonato(db);
    expect(c.equipes).toHaveLength(8);
    expect(c.fases.map((f) => f.id)).toEqual(['grupos', 'mata-mata']);
    expect(c.pontuacao).toEqual({ vitoria: 3, empate: 1, derrota: 0 });
  });

  it('grava e lê de volta o documento completo, na mesma ordem', async () => {
    await carregarCampeonato(db);
    const [a, b] = campeonatoPadrao().equipes;
    await atualizarCampeonato((c) => {
      c.valorInscricao = 78.5;
      c.criterios = ['saldo', 'pontos', 'vitorias', 'golsPro', 'golsContra', 'confronto'];
      c.jogadores.push(
        { id: 'j1', nome: 'Digão', equipeId: a.id, posicao: 'ATA', numero: 9, pago: true },
        { id: 'j2', nome: 'Celo', equipeId: a.id, posicao: 'MEI', pago: false },
        { id: 'j3', nome: 'Nando', equipeId: b.id, posicao: 'ZAG', numero: 4, pago: false },
      );
      c.equipes[0].capitaoId = 'j1';
      c.grupos.push({ id: 'g1', faseId: 'grupos', nome: 'Grupo A', equipeIds: [b.id, a.id] });
      c.partidas.push({
        id: 'p1',
        faseId: 'grupos',
        grupoId: 'g1',
        rotulo: 'Grupo A · Rodada 1',
        mandanteId: a.id,
        visitanteId: b.id,
        dataHora: '2027-01-16T08:00',
        local: 'Campo 1',
        status: 'encerrada',
        golsMandante: 2,
        golsVisitante: 1,
        penaltisMandante: undefined,
        eventos: [
          { id: 'e1', tipo: 'gol', jogadorId: 'j1', equipeId: a.id, assistenciaId: 'j2', minuto: 12 },
          { id: 'e2', tipo: 'amarelo', jogadorId: 'j3', equipeId: b.id },
        ],
      });
    }, db);

    const c = await carregarCampeonato(db);
    expect(c.valorInscricao).toBe(78.5);
    expect(c.criterios[0]).toBe('saldo');
    expect(c.equipes[0].capitaoId).toBe('j1');
    expect(c.jogadores.map((j) => j.nome)).toEqual(['Digão', 'Celo', 'Nando']);
    expect(c.jogadores[1].numero).toBeUndefined();
    expect(c.grupos[0].equipeIds).toEqual([b.id, a.id]);
    expect(c.partidas[0]).toMatchObject({ golsMandante: 2, dataHora: '2027-01-16T08:00', status: 'encerrada' });
    expect(c.partidas[0].eventos).toEqual([
      { id: 'e1', tipo: 'gol', jogadorId: 'j1', equipeId: a.id, assistenciaId: 'j2', minuto: 12 },
      { id: 'e2', tipo: 'amarelo', jogadorId: 'j3', equipeId: b.id },
    ]);
  });

  it('alteração inválida não grava nada (transação desfeita)', async () => {
    await carregarCampeonato(db);
    await expect(
      atualizarCampeonato((c) => {
        c.nome = 'Não pode ficar';
        c.jogadores.push({ id: 'x', nome: 'Fantasma', equipeId: 'equipe-que-nao-existe', posicao: 'ATA', pago: false });
      }, db),
    ).rejects.toThrow();
    const c = await carregarCampeonato(db);
    expect(c.nome).toBe('Copa Jumentus 2027');
    expect(c.jogadores).toHaveLength(0);
  });

  it('alterações seguidas não se perdem', async () => {
    await carregarCampeonato(db);
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        atualizarCampeonato((c) => {
          c.fases.push({ id: `f${i}`, nome: `Fase ${i}`, tipo: 'mata-mata' });
        }, db),
      ),
    );
    const c = await carregarCampeonato(db);
    expect(c.fases).toHaveLength(7);
  });
});

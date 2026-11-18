import { beforeEach, describe, expect, it, vi } from 'vitest';

// O teste não pode depender do que há em dados/ (ex.: o campeonato.json do `npm run demo`).
vi.mock('node:fs/promises', () => ({
  readFile: () => Promise.reject(Object.assign(new Error('sem arquivo'), { code: 'ENOENT' })),
}));
import { bancoDeTeste, type Banco } from '@/lib/db/cliente';
import {
  ErroCampeonato,
  aplicarModeloOficial,
  atualizarCampeonato,
  carregarCampeonato,
  criarCampeonato,
  duplicarCampeonato,
  escolherAtual,
  listarCampeonatos,
} from './campeonato-repo';
import { criarInscricao, listarInscricoes } from './inscricoes-repo';
import { sortearNumerosTabela } from '@/lib/domain/campeonato/modelo';

let db: Banco;
beforeEach(async () => {
  db = await bancoDeTeste();
});

async function primeiro(): Promise<number> {
  const [c] = await listarCampeonatos(db);
  return c.id;
}

describe('campeonato no banco', () => {
  it('banco vazio começa com um campeonato, 8 equipes e 2 fases padrão', async () => {
    const lista = await listarCampeonatos(db);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ slug: 'copa-jumentus-2027', status: 'inscricoes', modelo: 'livre' });
    const c = await carregarCampeonato(lista[0].id, db);
    expect(c.equipes).toHaveLength(8);
    expect(c.fases.map((f) => f.id)).toEqual(['grupos', 'mata-mata']);
    expect(c.pontuacao).toEqual({ vitoria: 3, empate: 1, derrota: 0 });
    expect(c.criterios.at(-1)).toBe('cartoes');
  });

  it('grava e lê de volta o documento completo, na mesma ordem', async () => {
    const id = await primeiro();
    const base = await carregarCampeonato(id, db);
    const [a, b] = base.equipes;
    await atualizarCampeonato(
      id,
      (c) => {
        c.valorInscricao = 78.5;
        c.criterios = ['saldo', 'pontos', 'vitorias', 'golsPro', 'golsContra', 'confronto', 'cartoes'];
        c.jogadores.push(
          { id: 'j1', nome: 'Digão', equipeId: a.id, posicao: 'ATA', numero: 9, pago: true },
          { id: 'j2', nome: 'Celo', equipeId: a.id, posicao: 'MEI', pago: false },
          { id: 'j3', nome: 'Nando', equipeId: b.id, posicao: 'ZAG', numero: 4, pago: false },
        );
        c.equipes[0].capitaoId = 'j1';
        c.fases[0].zonas = [{ de: 1, ate: 2, zona: 'semifinal' }];
        c.grupos.push({ id: 'g1', faseId: 'grupos', nome: 'Grupo A', equipeIds: [b.id, a.id] });
        c.partidas.push({
          id: 'p1',
          faseId: 'grupos',
          grupoId: 'g1',
          rotulo: 'Grupo A · Rodada 1',
          mandanteId: a.id,
          visitanteId: b.id,
          goleiroMandanteId: 'j2',
          dataHora: '2027-01-16T08:00',
          local: 'Campo 1',
          status: 'encerrada',
          golsMandante: 2,
          golsVisitante: 1,
          eventos: [
            { id: 'e1', tipo: 'gol', jogadorId: 'j1', equipeId: a.id, assistenciaId: 'j2', minuto: 12 },
            { id: 'e2', tipo: 'defesa', jogadorId: 'j3', equipeId: b.id },
          ],
        });
      },
      db,
    );

    const c = await carregarCampeonato(id, db);
    expect(c.valorInscricao).toBe(78.5);
    expect(c.criterios[0]).toBe('saldo');
    expect(c.equipes[0].capitaoId).toBe('j1');
    expect(c.fases[0].zonas).toEqual([{ de: 1, ate: 2, zona: 'semifinal' }]);
    expect(c.jogadores.map((j) => j.nome)).toEqual(['Digão', 'Celo', 'Nando']);
    expect(c.grupos[0].equipeIds).toEqual([b.id, a.id]);
    expect(c.partidas[0]).toMatchObject({ golsMandante: 2, goleiroMandanteId: 'j2', status: 'encerrada' });
    expect(c.partidas[0].eventos[1]).toEqual({ id: 'e2', tipo: 'defesa', jogadorId: 'j3', equipeId: b.id });
  });

  it('alteração inválida não grava nada (transação desfeita)', async () => {
    const id = await primeiro();
    await expect(
      atualizarCampeonato(
        id,
        (c) => {
          c.nome = 'Não pode ficar';
          c.jogadores.push({ id: 'x', nome: 'Fantasma', equipeId: 'equipe-que-nao-existe', posicao: 'ATA', pago: false });
        },
        db,
      ),
    ).rejects.toThrow();
    const c = await carregarCampeonato(id, db);
    expect(c.nome).toBe('Copa Jumentus 2027');
    expect(c.jogadores).toHaveLength(0);
  });

  it('alterações seguidas não se perdem', async () => {
    const id = await primeiro();
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        atualizarCampeonato(id, (c) => void c.fases.push({ id: `f${i}`, nome: `Fase ${i}`, tipo: 'mata-mata' }), db),
      ),
    );
    expect((await carregarCampeonato(id, db)).fases).toHaveLength(7);
  });
});

describe('vários campeonatos', () => {
  it('criar a partir do modelo: 34 jogos, Grupo Único com zonas e status rascunho', async () => {
    await primeiro();
    const id = await criarCampeonato({ nome: 'Copa Jumentus', edicao: '2028', modelo: 'copa-jumentus-8' }, db);
    const c = await carregarCampeonato(id, db);
    expect(c).toMatchObject({ slug: 'copa-jumentus-2028', status: 'rascunho', modelo: 'copa-jumentus-8' });
    expect(c.partidas).toHaveLength(34);
    expect(c.partidas[30].origemVisitante).toEqual({ tipo: 'vencedor', partidaNumero: 30 });
    expect(c.fases[0].zonas).toHaveLength(3);
    // Nenhum participante antes do sorteio de T1–T8; nada gravado em mandante_id.
    expect(c.partidas.every((p) => !p.mandanteId)).toBe(true);
  });

  it('modelo com período preenchido já nasce com horário em todos os jogos; programação é gravada', async () => {
    await primeiro();
    const id = await criarCampeonato({ nome: 'Copa', edicao: '2029', modelo: 'copa-jumentus-8', inicio: '2029-01-13', fim: '2029-01-14' }, db);
    const c = await carregarCampeonato(id, db);
    expect(c.programacao).toEqual({
      dias: [
        { data: '2029-01-13', inicio: '08:00' },
        { data: '2029-01-14', inicio: '08:00' },
      ],
      duracaoMin: 30,
      intervaloMin: 5,
    });
    expect(c.partidas.find((p) => p.numero === 1)?.dataHora).toBe('2029-01-13T08:00');
    expect(c.partidas.find((p) => p.numero === 17)?.dataHora).toBe('2029-01-14T08:00');
    expect(c.partidas.every((p) => p.dataHora)).toBe(true);

    // Sem período, a programação fica sugerida e os jogos sem hora até o admin informar as datas.
    const semData = await carregarCampeonato(await criarCampeonato({ nome: 'Sem data', modelo: 'copa-jumentus-8' }, db), db);
    expect(semData.programacao?.dias.map((d) => d.data)).toEqual(['', '']);
    expect(semData.partidas.some((p) => p.dataHora)).toBe(false);
  });

  it('campeonatos não se misturam: gravar um não apaga o outro', async () => {
    const um = await primeiro();
    const dois = await criarCampeonato({ nome: 'Outra', modelo: 'copa-jumentus-8' }, db);
    await atualizarCampeonato(um, (c) => void (c.nome = 'Primeiro'), db);
    await atualizarCampeonato(dois, (c) => sortearNumerosTabela(c), db);
    const c1 = await carregarCampeonato(um, db);
    const c2 = await carregarCampeonato(dois, db);
    expect(c1.equipes).toHaveLength(8);
    expect(c1.partidas).toHaveLength(0);
    expect(c2.partidas).toHaveLength(34);
    expect(c2.partidas[0].mandanteId).toBeDefined();
    expect(new Set([...c1.equipes, ...c2.equipes].map((e) => e.id)).size).toBe(16);
  });

  it('slug é único: mesmo nome ganha sufixo', async () => {
    await primeiro();
    await criarCampeonato({ nome: 'Copa', modelo: 'livre' }, db);
    const id = await criarCampeonato({ nome: 'Copa', modelo: 'livre' }, db);
    expect((await carregarCampeonato(id, db)).slug).toBe('copa-2');
  });

  it('duplicar copia configuração, fases, zonas e equipes; elencos opcionais; nunca partidas', async () => {
    await primeiro();
    const origem = await criarCampeonato({ nome: 'Copa', edicao: '2027', modelo: 'copa-jumentus-8' }, db);
    await atualizarCampeonato(
      origem,
      (c) => {
        c.valorInscricao = 50;
        c.criterios = ['pontos', 'saldo', 'vitorias', 'golsPro', 'golsContra', 'confronto', 'cartoes'];
        c.jogadores.push({ id: 'j1', nome: 'Digão', equipeId: c.equipes[0].id, posicao: 'ATA', pago: true });
        c.equipes[0].capitaoId = 'j1';
        c.premios = [{ id: 'p1', titulo: 'Artilheiro', jogador: 'Digão', equipeId: c.equipes[0].id, detalhe: '9 gols' }];
        sortearNumerosTabela(c);
      },
      db,
    );
    const semElenco = await duplicarCampeonato(origem, { nome: 'Copa', edicao: '2028', comElencos: false }, db);
    const comElenco = await duplicarCampeonato(origem, { nome: 'Copa', edicao: '2029', comElencos: true }, db);
    const o = await carregarCampeonato(origem, db);
    const a = await carregarCampeonato(semElenco, db);
    const b = await carregarCampeonato(comElenco, db);
    expect(a).toMatchObject({ duplicadoDe: origem, status: 'rascunho', valorInscricao: 50, modelo: 'copa-jumentus-8', slug: 'copa-2028' });
    expect(a.criterios).toEqual(o.criterios);
    expect(a.fases.map((f) => [f.nome, f.zonas])).toEqual(o.fases.map((f) => [f.nome, f.zonas]));
    expect(a.equipes.map((e) => e.nome)).toEqual(o.equipes.map((e) => e.nome));
    expect(a.equipes.every((e) => e.numeroTabela === undefined && e.capitaoId === undefined)).toBe(true);
    expect(a.partidas).toHaveLength(0);
    expect(a.jogadores).toHaveLength(0);
    // Prêmios são gravados e lidos de volta, mas não passam para a cópia.
    expect(o.premios).toEqual([{ id: 'p1', titulo: 'Artilheiro', jogador: 'Digão', equipeId: o.equipes[0].id, detalhe: '9 gols' }]);
    expect(a.premios).toBeUndefined();
    expect(b.jogadores).toHaveLength(1);
    expect(b.jogadores[0]).toMatchObject({ nome: 'Digão', pago: false });
    expect(b.equipes[0].capitaoId).toBe(b.jogadores[0].id);
    expect(b.jogadores[0].equipeId).toBe(b.equipes[0].id);
    // O grupo da cópia aponta para as equipes e a fase da cópia.
    expect(a.grupos[0].faseId).toBe(a.fases[0].id);
    expect(new Set(a.grupos[0].equipeIds)).toEqual(new Set(a.equipes.map((e) => e.id)));
    // Modelo pode ser reaplicado na cópia, que não tem partidas.
    expect((await aplicarModeloOficial(semElenco, db)).partidas).toHaveLength(34);
  });

  it('inscrições são de cada campeonato', async () => {
    const um = await primeiro();
    const dois = await criarCampeonato({ nome: 'Outra', modelo: 'livre' }, db);
    await criarInscricao(um, { nome: 'Fulano' }, db);
    await criarInscricao(dois, { nome: 'Beltrano' }, db);
    expect((await listarInscricoes(um, db)).map((i) => i.nome)).toEqual(['Fulano']);
    expect((await listarInscricoes(dois, db)).map((i) => i.nome)).toEqual(['Beltrano']);
  });

  it('site público mostra o em andamento; senão inscrições; senão o último encerrado; nunca rascunho', () => {
    const r = (id: number, status: 'rascunho' | 'inscricoes' | 'andamento' | 'encerrado') => ({ id, slug: `c${id}`, nome: '', status, modelo: 'livre' as const });
    expect(escolherAtual([r(3, 'rascunho'), r(2, 'encerrado'), r(1, 'andamento')])?.id).toBe(1);
    expect(escolherAtual([r(3, 'inscricoes'), r(2, 'encerrado')])?.id).toBe(3);
    expect(escolherAtual([r(3, 'rascunho'), r(2, 'encerrado'), r(1, 'encerrado')])?.id).toBe(2);
    expect(escolherAtual([r(3, 'rascunho')])).toBeNull();
  });
});

describe('modelo no banco: trava e consistência ao gravar', () => {
  async function modeloComGrupoEncerrado(): Promise<number> {
    await primeiro();
    const id = await criarCampeonato({ nome: 'Copa', modelo: 'copa-jumentus-8' }, db);
    await atualizarCampeonato(
      id,
      (c) => {
        c.equipes.forEach((e, i) => (e.numeroTabela = i + 1));
      },
      db,
    );
    await atualizarCampeonato(
      id,
      (c) => {
        const ordem = c.equipes.map((e) => e.id);
        for (const p of c.partidas.filter((x) => x.numero! <= 28)) {
          const m = ordem.indexOf(p.mandanteId!);
          const v = ordem.indexOf(p.visitanteId!);
          Object.assign(p, { status: 'encerrada', golsMandante: m < v ? 1 : 0, golsVisitante: m < v ? 0 : 1 });
        }
      },
      db,
    );
    return id;
  }

  it('participantes do mata-mata são calculados ao ler e não são gravados', async () => {
    const id = await modeloComGrupoEncerrado();
    const c = await carregarCampeonato(id, db);
    const j29 = c.partidas.find((p) => p.numero === 29)!;
    expect([j29.mandanteId, j29.visitanteId]).toEqual([c.equipes[2].id, c.equipes[5].id]);
  });

  it('recusa encerrar jogo eliminatório empatado sem pênaltis', async () => {
    const id = await modeloComGrupoEncerrado();
    await expect(
      atualizarCampeonato(id, (c) => void Object.assign(c.partidas.find((p) => p.numero === 29)!, { status: 'encerrada', golsMandante: 1, golsVisitante: 1 }), db),
    ).rejects.toThrow(/pênaltis/);
  });

  it('trava: correção que mudaria participantes de jogo iniciado é recusada e nada é gravado', async () => {
    const id = await modeloComGrupoEncerrado();
    await atualizarCampeonato(id, (c) => void (c.partidas.find((p) => p.numero === 29)!.status = 'ao-vivo'), db);
    const erro = await atualizarCampeonato(
      id,
      (c) => {
        const p = c.partidas.find((x) => x.numero === 18)!; // T3 x T8
        p.golsMandante = 0;
        p.golsVisitante = 5;
      },
      db,
    ).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroCampeonato);
    expect(String(erro)).toMatch(/Jogo 29 \(Repescagem 1\)/);
    const c = await carregarCampeonato(id, db);
    expect(c.partidas.find((p) => p.numero === 18)!.golsVisitante).toBe(0);
  });
});

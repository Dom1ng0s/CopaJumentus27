// Persistência do campeonato no Postgres (CLAUDE.md §8.4 e §9).
// As telas e as ações continuam vendo um documento `Campeonato`; aqui ele é
// montado das tabelas e gravado de volta numa transação, com a linha do
// campeonato travada (SELECT ... FOR UPDATE) para dois admins não se atropelarem.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { asc, eq, sql } from 'drizzle-orm';
import { escudoDe, MARCAS } from '@/lib/campeonato/marcas';
import { banco, type Banco } from '@/lib/db/cliente';
import * as t from '@/lib/db/schema';
import {
  CRITERIOS_PADRAO,
  type Campeonato,
  type Criterio,
  type EventoPartida,
} from '@/lib/domain/campeonato/tipos';

/** Arquivo da versão antiga (antes do banco). Importado uma vez, se existir. */
export const ARQUIVO_LEGADO = path.join(process.cwd(), 'dados', 'campeonato.json');

export function campeonatoPadrao(): Campeonato {
  return {
    versao: 1,
    nome: 'Copa Jumentus 2027',
    subtitulo: 'Edição MLS',
    inicio: '2027-01-16',
    fim: '2027-01-17',
    pontuacao: { vitoria: 3, empate: 1, derrota: 0 },
    criterios: [...CRITERIOS_PADRAO],
    valorInscricao: 0,
    equipes: MARCAS.map((m) => ({
      id: m.slug,
      nome: m.nome,
      sigla: m.sigla,
      escudo: escudoDe(m.slug),
      corPrimaria: m.corPrimaria,
      corSecundaria: m.corSecundaria,
      corTexto: m.corTexto,
    })),
    jogadores: [],
    fases: [
      { id: 'grupos', nome: 'Fase de grupos', tipo: 'grupos' },
      { id: 'mata-mata', nome: 'Mata-mata', tipo: 'mata-mata' },
    ],
    grupos: [],
    partidas: [],
  };
}

type Tx = Parameters<Parameters<Banco['transaction']>[0]>[0];
type Leitor = Banco | Tx;

const CRITERIOS_VALIDOS = new Set<string>(CRITERIOS_PADRAO);
const ehCriterio = (c: string): c is Criterio => CRITERIOS_VALIDOS.has(c);

/** null quando o banco ainda não tem campeonato. */
async function ler(db: Leitor): Promise<Campeonato | null> {
  const [cfg] = await db.select().from(t.campeonato).where(eq(t.campeonato.id, 1));
  if (!cfg) return null;

  const [equipes, jogadores, fases, grupos, membros, partidas, eventos] = await Promise.all([
    db.select().from(t.equipe).orderBy(asc(t.equipe.ordem)),
    db.select().from(t.jogador).orderBy(asc(t.jogador.ordem)),
    db.select().from(t.fase).orderBy(asc(t.fase.ordem)),
    db.select().from(t.grupo).orderBy(asc(t.grupo.ordem)),
    db.select().from(t.grupoEquipe).orderBy(asc(t.grupoEquipe.ordem)),
    db.select().from(t.partida).orderBy(asc(t.partida.ordem)),
    db.select().from(t.evento).orderBy(asc(t.evento.ordem)),
  ]);

  const eventosDa = new Map<string, EventoPartida[]>();
  for (const e of eventos) {
    const lista = eventosDa.get(e.partidaId) ?? [];
    lista.push({
      id: e.id,
      tipo: e.tipo,
      jogadorId: e.jogadorId,
      equipeId: e.equipeId,
      ...(e.assistenciaId ? { assistenciaId: e.assistenciaId } : {}),
      ...(e.minuto !== null ? { minuto: e.minuto } : {}),
    });
    eventosDa.set(e.partidaId, lista);
  }

  return {
    versao: 1,
    nome: cfg.nome,
    subtitulo: cfg.subtitulo ?? undefined,
    inicio: cfg.inicio ?? undefined,
    fim: cfg.fim ?? undefined,
    local: cfg.local ?? undefined,
    pontuacao: { vitoria: cfg.pontosVitoria, empate: cfg.pontosEmpate, derrota: cfg.pontosDerrota },
    criterios: cfg.criterios.filter(ehCriterio),
    valorInscricao: Number(cfg.valorInscricao),
    sorteioOficializadoEm: cfg.sorteioOficializadoEm?.toISOString(),
    equipes: equipes.map((e) => ({
      id: e.id,
      nome: e.nome,
      sigla: e.sigla,
      escudo: e.escudo ?? undefined,
      corPrimaria: e.corPrimaria,
      corSecundaria: e.corSecundaria,
      corTexto: e.corTexto,
      capitaoId: e.capitaoId ?? undefined,
    })),
    jogadores: jogadores.map((j) => ({
      id: j.id,
      nome: j.nome,
      equipeId: j.equipeId,
      posicao: j.posicao,
      numero: j.numero ?? undefined,
      pago: j.pago,
    })),
    fases: fases.map((f) => ({ id: f.id, nome: f.nome, tipo: f.tipo })),
    grupos: grupos.map((g) => ({
      id: g.id,
      faseId: g.faseId,
      nome: g.nome,
      equipeIds: membros.filter((m) => m.grupoId === g.id).map((m) => m.equipeId),
    })),
    partidas: partidas.map((p) => ({
      id: p.id,
      faseId: p.faseId,
      grupoId: p.grupoId ?? undefined,
      rotulo: p.rotulo ?? undefined,
      mandanteId: p.mandanteId,
      visitanteId: p.visitanteId,
      dataHora: p.dataHora ?? undefined,
      local: p.local ?? undefined,
      status: p.status,
      golsMandante: p.golsMandante,
      golsVisitante: p.golsVisitante,
      penaltisMandante: p.penaltisMandante ?? undefined,
      penaltisVisitante: p.penaltisVisitante ?? undefined,
      eventos: eventosDa.get(p.id) ?? [],
    })),
  };
}

const ou = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

/** Grava o documento inteiro (dentro de uma transação). Filhos antes dos pais na remoção. */
async function gravar(tx: Tx, c: Campeonato): Promise<void> {
  await tx.delete(t.evento);
  await tx.delete(t.partida);
  await tx.delete(t.grupoEquipe);
  await tx.delete(t.grupo);
  await tx.delete(t.fase);
  await tx.delete(t.jogador);
  await tx.delete(t.equipe);

  const cfg = {
    nome: c.nome,
    subtitulo: ou(c.subtitulo),
    inicio: ou(c.inicio),
    fim: ou(c.fim),
    local: ou(c.local),
    pontosVitoria: c.pontuacao.vitoria,
    pontosEmpate: c.pontuacao.empate,
    pontosDerrota: c.pontuacao.derrota,
    criterios: c.criterios,
    valorInscricao: c.valorInscricao.toFixed(2),
    sorteioOficializadoEm: c.sorteioOficializadoEm ? new Date(c.sorteioOficializadoEm) : null,
    atualizadoEm: new Date(),
  };
  await tx
    .insert(t.campeonato)
    .values({ id: 1, ...cfg })
    .onConflictDoUpdate({ target: t.campeonato.id, set: cfg });

  if (c.equipes.length) {
    await tx.insert(t.equipe).values(
      c.equipes.map((e, i) => ({
        id: e.id,
        nome: e.nome,
        sigla: e.sigla,
        escudo: ou(e.escudo),
        corPrimaria: e.corPrimaria,
        corSecundaria: e.corSecundaria,
        corTexto: e.corTexto,
        capitaoId: ou(e.capitaoId),
        ordem: i,
      })),
    );
  }
  if (c.jogadores.length) {
    await tx.insert(t.jogador).values(
      c.jogadores.map((j, i) => ({
        id: j.id,
        nome: j.nome,
        equipeId: j.equipeId,
        posicao: j.posicao,
        numero: ou(j.numero),
        pago: j.pago,
        ordem: i,
      })),
    );
  }
  if (c.fases.length) {
    await tx.insert(t.fase).values(c.fases.map((f, i) => ({ id: f.id, nome: f.nome, tipo: f.tipo, ordem: i })));
  }
  if (c.grupos.length) {
    await tx.insert(t.grupo).values(c.grupos.map((g, i) => ({ id: g.id, faseId: g.faseId, nome: g.nome, ordem: i })));
    const membros = c.grupos.flatMap((g) => g.equipeIds.map((equipeId, i) => ({ grupoId: g.id, equipeId, ordem: i })));
    if (membros.length) await tx.insert(t.grupoEquipe).values(membros);
  }
  if (c.partidas.length) {
    await tx.insert(t.partida).values(
      c.partidas.map((p, i) => ({
        id: p.id,
        faseId: p.faseId,
        grupoId: ou(p.grupoId),
        rotulo: ou(p.rotulo),
        mandanteId: p.mandanteId,
        visitanteId: p.visitanteId,
        dataHora: ou(p.dataHora),
        local: ou(p.local),
        status: p.status,
        golsMandante: p.golsMandante,
        golsVisitante: p.golsVisitante,
        penaltisMandante: ou(p.penaltisMandante),
        penaltisVisitante: ou(p.penaltisVisitante),
        ordem: i,
      })),
    );
    const eventos = c.partidas.flatMap((p) =>
      p.eventos.map((e, i) => ({
        id: e.id,
        partidaId: p.id,
        tipo: e.tipo,
        jogadorId: e.jogadorId,
        equipeId: e.equipeId,
        assistenciaId: ou(e.assistenciaId),
        minuto: ou(e.minuto),
        ordem: i,
      })),
    );
    if (eventos.length) await tx.insert(t.evento).values(eventos);
  }
}

/** Conteúdo inicial: o arquivo da versão antiga, se houver; senão o padrão. */
async function inicial(): Promise<Campeonato> {
  try {
    return JSON.parse(await readFile(ARQUIVO_LEGADO, 'utf8')) as Campeonato;
  } catch {
    return campeonatoPadrao();
  }
}

// ---------- API usada pelas telas e ações ----------

export async function carregarCampeonato(db?: Banco): Promise<Campeonato> {
  const conexao = db ?? (await banco());
  const atual = await ler(conexao);
  if (atual) return atual;
  // Banco vazio: grava o conteúdo inicial uma vez. Se outra requisição gravou
  // ao mesmo tempo, a nossa falha por chave repetida e basta ler de novo.
  try {
    return await atualizarCampeonato(() => undefined, conexao);
  } catch (erro) {
    const depois = await ler(conexao);
    if (depois) return depois;
    throw erro;
  }
}

/** Lê, aplica a alteração e grava, tudo numa transação com a linha travada. */
export async function atualizarCampeonato(alterar: (c: Campeonato) => void, db?: Banco): Promise<Campeonato> {
  const conexao = db ?? (await banco());
  return conexao.transaction(async (tx) => {
    await tx.execute(sql`select id from campeonato where id = 1 for update`);
    const c = (await ler(tx)) ?? (await inicial());
    alterar(c);
    await gravar(tx, c);
    return c;
  });
}

export function novoId(): string {
  return crypto.randomUUID().slice(0, 8);
}

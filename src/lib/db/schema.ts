// Esquema relacional (Postgres). Ver CLAUDE.md §4.2 e §9.
// Nomes em português, como o domínio. Ids são texto: slugs para equipes,
// ids curtos gerados pelo servidor para o resto.

import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Configuração do campeonato: uma linha só (id = 1). */
export const campeonato = pgTable(
  'campeonato',
  {
    id: smallint('id').primaryKey().default(1),
    nome: text('nome').notNull(),
    subtitulo: text('subtitulo'),
    inicio: text('inicio'),
    fim: text('fim'),
    local: text('local'),
    pontosVitoria: smallint('pontos_vitoria').notNull().default(3),
    pontosEmpate: smallint('pontos_empate').notNull().default(1),
    pontosDerrota: smallint('pontos_derrota').notNull().default(0),
    /** Ordem dos critérios de desempate. */
    criterios: jsonb('criterios').$type<string[]>().notNull(),
    valorInscricao: numeric('valor_inscricao', { precision: 10, scale: 2 }).notNull().default('0'),
    sorteioOficializadoEm: timestamp('sorteio_oficializado_em', { withTimezone: true }),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('campeonato_unico', sql`${t.id} = 1`)],
);

/**
 * Inscrições: o cadastro do sorteio (substitui a aba INSCRITOS da planilha).
 * Estrelas ficam só aqui e nunca saem em página pública.
 */
export const inscricao = pgTable(
  'inscricao',
  {
    id: text('id').primaryKey(),
    nome: text('nome').notNull(),
    apelido: text('apelido'),
    posicao: text('posicao', { enum: ['GOL', 'ZAG', 'MEI', 'ATA'] }),
    estrelas: smallint('estrelas'),
    /** Nome do time do qual é capitão (vazio = não é capitão). */
    capitaoDe: text('capitao_de'),
    status: text('status', { enum: ['confirmado', 'espera'] }).notNull().default('confirmado'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('inscricao_estrelas', sql`${t.estrelas} is null or ${t.estrelas} between 1 and 6`)],
);

export const equipe = pgTable('equipe', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  sigla: text('sigla').notNull(),
  escudo: text('escudo'),
  corPrimaria: text('cor_primaria').notNull(),
  corSecundaria: text('cor_secundaria').notNull(),
  corTexto: text('cor_texto').notNull(),
  capitaoId: text('capitao_id'),
  ordem: smallint('ordem').notNull().default(0),
});

/** Jogador do campeonato (elenco). Vem do sorteio oficializado ou do cadastro manual. */
export const jogador = pgTable(
  'jogador',
  {
    id: text('id').primaryKey(),
    nome: text('nome').notNull(),
    equipeId: text('equipe_id')
      .notNull()
      .references(() => equipe.id, { onDelete: 'restrict' }),
    posicao: text('posicao', { enum: ['GOL', 'ZAG', 'MEI', 'ATA'] }).notNull(),
    numero: smallint('numero'),
    pago: boolean('pago').notNull().default(false),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [index('jogador_equipe').on(t.equipeId)],
);

export const fase = pgTable('fase', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo', { enum: ['grupos', 'mata-mata'] }).notNull(),
  ordem: smallint('ordem').notNull(),
});

export const grupo = pgTable('grupo', {
  id: text('id').primaryKey(),
  faseId: text('fase_id')
    .notNull()
    .references(() => fase.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  ordem: smallint('ordem').notNull(),
});

export const grupoEquipe = pgTable(
  'grupo_equipe',
  {
    grupoId: text('grupo_id')
      .notNull()
      .references(() => grupo.id, { onDelete: 'cascade' }),
    equipeId: text('equipe_id')
      .notNull()
      .references(() => equipe.id, { onDelete: 'cascade' }),
    ordem: smallint('ordem').notNull(),
  },
  (t) => [primaryKey({ columns: [t.grupoId, t.equipeId] })],
);

export const partida = pgTable(
  'partida',
  {
    id: text('id').primaryKey(),
    faseId: text('fase_id')
      .notNull()
      .references(() => fase.id, { onDelete: 'restrict' }),
    grupoId: text('grupo_id').references(() => grupo.id, { onDelete: 'set null' }),
    rotulo: text('rotulo'),
    mandanteId: text('mandante_id')
      .notNull()
      .references(() => equipe.id, { onDelete: 'restrict' }),
    visitanteId: text('visitante_id')
      .notNull()
      .references(() => equipe.id, { onDelete: 'restrict' }),
    /** Data e hora local, formato do input datetime-local (AAAA-MM-DDTHH:mm). */
    dataHora: text('data_hora'),
    local: text('local'),
    status: text('status', { enum: ['agendada', 'ao-vivo', 'encerrada'] }).notNull().default('agendada'),
    golsMandante: smallint('gols_mandante').notNull().default(0),
    golsVisitante: smallint('gols_visitante').notNull().default(0),
    penaltisMandante: smallint('penaltis_mandante'),
    penaltisVisitante: smallint('penaltis_visitante'),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [index('partida_fase').on(t.faseId), check('partida_equipes_diferentes', sql`${t.mandanteId} <> ${t.visitanteId}`)],
);

/** Súmula: um evento por linha. Placar da partida é mantido junto (CLAUDE.md §8.3). */
export const evento = pgTable(
  'evento',
  {
    id: text('id').primaryKey(),
    partidaId: text('partida_id')
      .notNull()
      .references(() => partida.id, { onDelete: 'cascade' }),
    tipo: text('tipo', { enum: ['gol', 'gol-contra', 'amarelo', 'vermelho'] }).notNull(),
    jogadorId: text('jogador_id')
      .notNull()
      .references(() => jogador.id, { onDelete: 'restrict' }),
    equipeId: text('equipe_id')
      .notNull()
      .references(() => equipe.id, { onDelete: 'restrict' }),
    assistenciaId: text('assistencia_id').references(() => jogador.id, { onDelete: 'set null' }),
    minuto: smallint('minuto'),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [index('evento_partida').on(t.partidaId), index('evento_jogador').on(t.jogadorId)],
);

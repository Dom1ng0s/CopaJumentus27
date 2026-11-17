CREATE TABLE "campeonato" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome" text NOT NULL,
	"subtitulo" text,
	"inicio" text,
	"fim" text,
	"local" text,
	"pontos_vitoria" smallint DEFAULT 3 NOT NULL,
	"pontos_empate" smallint DEFAULT 1 NOT NULL,
	"pontos_derrota" smallint DEFAULT 0 NOT NULL,
	"criterios" jsonb NOT NULL,
	"valor_inscricao" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sorteio_oficializado_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campeonato_unico" CHECK ("campeonato"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "equipe" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"sigla" text NOT NULL,
	"escudo" text,
	"cor_primaria" text NOT NULL,
	"cor_secundaria" text NOT NULL,
	"cor_texto" text NOT NULL,
	"capitao_id" text,
	"ordem" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento" (
	"id" text PRIMARY KEY NOT NULL,
	"partida_id" text NOT NULL,
	"tipo" text NOT NULL,
	"jogador_id" text NOT NULL,
	"equipe_id" text NOT NULL,
	"assistencia_id" text,
	"minuto" smallint,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fase" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"ordem" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupo" (
	"id" text PRIMARY KEY NOT NULL,
	"fase_id" text NOT NULL,
	"nome" text NOT NULL,
	"ordem" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupo_equipe" (
	"grupo_id" text NOT NULL,
	"equipe_id" text NOT NULL,
	"ordem" smallint NOT NULL,
	CONSTRAINT "grupo_equipe_grupo_id_equipe_id_pk" PRIMARY KEY("grupo_id","equipe_id")
);
--> statement-breakpoint
CREATE TABLE "inscricao" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"apelido" text,
	"posicao" text,
	"estrelas" smallint,
	"capitao_de" text,
	"status" text DEFAULT 'confirmado' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inscricao_estrelas" CHECK ("inscricao"."estrelas" is null or "inscricao"."estrelas" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "jogador" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"equipe_id" text NOT NULL,
	"posicao" text NOT NULL,
	"numero" smallint,
	"pago" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partida" (
	"id" text PRIMARY KEY NOT NULL,
	"fase_id" text NOT NULL,
	"grupo_id" text,
	"rotulo" text,
	"mandante_id" text NOT NULL,
	"visitante_id" text NOT NULL,
	"data_hora" text,
	"local" text,
	"status" text DEFAULT 'agendada' NOT NULL,
	"gols_mandante" smallint DEFAULT 0 NOT NULL,
	"gols_visitante" smallint DEFAULT 0 NOT NULL,
	"penaltis_mandante" smallint,
	"penaltis_visitante" smallint,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "partida_equipes_diferentes" CHECK ("partida"."mandante_id" <> "partida"."visitante_id")
);
--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_partida_id_partida_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partida"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_jogador_id_jogador_id_fk" FOREIGN KEY ("jogador_id") REFERENCES "public"."jogador"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_assistencia_id_jogador_id_fk" FOREIGN KEY ("assistencia_id") REFERENCES "public"."jogador"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_fase_id_fase_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."fase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo_equipe" ADD CONSTRAINT "grupo_equipe_grupo_id_grupo_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupo_equipe" ADD CONSTRAINT "grupo_equipe_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jogador" ADD CONSTRAINT "jogador_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida" ADD CONSTRAINT "partida_fase_id_fase_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."fase"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida" ADD CONSTRAINT "partida_grupo_id_grupo_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida" ADD CONSTRAINT "partida_mandante_id_equipe_id_fk" FOREIGN KEY ("mandante_id") REFERENCES "public"."equipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partida" ADD CONSTRAINT "partida_visitante_id_equipe_id_fk" FOREIGN KEY ("visitante_id") REFERENCES "public"."equipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evento_partida" ON "evento" USING btree ("partida_id");--> statement-breakpoint
CREATE INDEX "evento_jogador" ON "evento" USING btree ("jogador_id");--> statement-breakpoint
CREATE INDEX "jogador_equipe" ON "jogador" USING btree ("equipe_id");--> statement-breakpoint
CREATE INDEX "partida_fase" ON "partida" USING btree ("fase_id");
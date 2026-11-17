CREATE TABLE "admin" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"nome" text NOT NULL,
	"senha_hash" text NOT NULL,
	"deve_trocar_senha" boolean DEFAULT true NOT NULL,
	"versao_sessao" integer DEFAULT 1 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"tentativas_falhas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"senha_alterada_em" timestamp with time zone,
	CONSTRAINT "admin_usuario_unique" UNIQUE("usuario"),
	CONSTRAINT "admin_usuario_minusculo" CHECK ("admin"."usuario" = lower("admin"."usuario"))
);

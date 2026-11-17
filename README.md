<p align="center">
  <img src="public/imagens/logo/copa-jumentus-logo.png" alt="Copa Jumentus" width="160">
</p>

<h1 align="center">Copa Jumentus 2027 — Sistema de Sorteio</h1>

<p align="center">
  Sorteio balanceado dos times da Copa Jumentus, com cerimônia de revelação jogador por jogador e link de resultado para a galera.<br>
  16 e 17 de janeiro de 2027 · Instagram <a href="https://instagram.com/c.r.jumentus">@c.r.jumentus</a>
</p>

![Banner](public/banner-copa-jumentus.webp)

## O que o sistema faz

1. **Lê os inscritos** da planilha oficial (Google Sheets, aba `INSCRITOS`).
2. **Sorteia os jogadores de linha** entre 8 times de capitães fixos, equilibrando a soma de estrelas (diferença máxima de 2 entre o time mais forte e o mais fraco).
3. **Sorteia os goleiros** em etapa separada, 1 por time. Estrelas de goleiro não contam.
4. **Conduz a cerimônia** (só admins): o operador revela um jogador por vez (clique, espaço ou Enter), com a tela projetada.
5. **Gera um link de resultado** (`/resultado/...`) e **oficializa os elencos** no campeonato.

As regras completas estão em [CLAUDE.md](CLAUDE.md) §3, que é a fonte de verdade do projeto.

## Times

| Time | Kit |
|---|---|
| Inter Miami | rosa forte em todas as peças |
| LA Galaxy | sem alteração |
| LAFC | sem alteração |
| Seattle Sounders | meião branco |
| Atlanta United | listras frente e costas, short e meião vermelhos |
| New York City FC | reserva marinho, short branco, meião branco |
| Houston Dynamo | meião branco |
| Orlando City | meião branco |

![Kits finais](public/imagens/uniformes/kits-finais-copa-jumentus.webp)

## Como rodar

Requer Node 20+.

```bash
npm ci
npm run dev        # http://localhost:3100
npm test           # testes do domínio (Vitest)
```

Sem `DATABASE_URL`, o banco é um Postgres local (PGlite) em `dados/pglite`, criado sozinho no primeiro acesso. Para zerar, apague a pasta.

Sem inscrições cadastradas, o sorteio usa um elenco de exemplo.

## Campeonato

Além do sorteio, o site mostra o campeonato para a galera e tem uma área de admin para editar tudo.

| Público (sem login) | Admin (`/admin`, senha) |
|---|---|
| Início, classificação por grupo, jogos e súmulas, rankings (artilharia, assistências, cartões), elencos | Dados e pontuação, critérios de desempate, fases e grupos (sorteio aleatório ou manual), partidas com data/hora editáveis, placar e súmula ao vivo, elencos e transferências, pagamentos, pote e cerimônia |

Para ver as telas com um campeonato de exemplo (nomes fictícios), rode `npm run demo` antes de `npm run dev`. Ele gera `dados/campeonato.json` e zera o banco local, que importa o arquivo na próxima abertura.

Para liberar o admin, crie `.env.local` na raiz:

```
ADMIN_SENHA=uma-senha-forte
```

Regras: vitória 3, empate 1, derrota 0 (editável); 3 amarelos ou 1 vermelho suspendem o jogo seguinte. Detalhes em [CLAUDE.md §8](CLAUDE.md).

## Publicar (Vercel + Neon)

1. Crie um projeto no [Neon](https://neon.tech) (região São Paulo, `sa-east-1`) e copie a connection string **pooled** (o host tem `-pooler`).
2. Importe o repositório na [Vercel](https://vercel.com). Em **Settings › Environment Variables**, cadastre:
   - `DATABASE_URL`: a string do Neon
   - `ADMIN_SENHA`: a senha dos admins
3. Faça o deploy. O build aplica as migrações (`drizzle/`) no Neon antes de compilar.
4. Entre em `/admin`, cadastre os inscritos em **Inscrições** (ou importe o CSV) e siga para o sorteio.

Para usar o Neon na sua máquina, coloque a mesma `DATABASE_URL` no `.env.local` e rode `npm run db:migrar`. Detalhes em [CLAUDE.md §9](CLAUDE.md).

## Inscritos

Os inscritos ficam no banco e são editados em **Admin › Inscrições**: nome, apelido, posição, estrelas, capitão de qual time e status (confirmado ou lista de espera). A tela lista as pendências, e o botão de sorteio fica bloqueado até não restar nenhuma.

Para trazer a planilha de uma vez:

1. Preencha a aba **INSCRITOS** da planilha de sorteio:
   - **Posição**: GOL, ZAG, MEI ou ATA
   - **Estrelas**: 1 a 6 (goleiro pode ficar vazio)
   - **Capitão do time**: o nome do time, só na linha do capitão (1 por time)
   - **Status**: `Confirmado` entra no sorteio; `Lista de espera` fica de fora
2. Baixe a aba em **Arquivo › Fazer download › CSV**.
3. Em **Admin › Inscrições › Importar da planilha**, envie o arquivo. Quem já está cadastrado (mesmo nome) é mantido; as correções seguintes são feitas na própria tela.

Formato de referência: [`dados/inscritos.example.csv`](dados/inscritos.example.csv).

## Depois do sorteio

Cole os elencos finais em **TIMES › Times Definidos** na planilha de sorteio. A planilha de uniformes puxa os nomes dali automaticamente. Detalhes em [`docs/planilhas.md`](docs/planilhas.md).

## Estrutura

```
src/
  lib/
    config.ts        # constantes de regra (tolerância, tentativas, escala de estrelas)
    domain/          # tipos, sorteio e validação — puro e testado
    db/              # esquema Drizzle e conexão (Neon ou PGlite)
    repo/            # leitura e gravação: campeonato, inscrições, CSV
    share/           # codificação do link de resultado
  app/               # rotas públicas, /admin, /sorteio, /cerimonia, /resultado/[payload]
  components/        # UI (HUD cards, estrelas, wordmark)
drizzle/             # migrações SQL
scripts/
  migrar.mjs         # aplica as migrações (roda no build)
  gerar-demo.mjs     # campeonato de exemplo
public/
  banner-copa-jumentus.webp
  imagens/           # logo, uniformes, escudos, artes — ver public/imagens/README.md
docs/
  marca/             # manual de marca
  skill-gemini/      # skill copa-jumentus-design do Gemini
  planilhas.md       # planilhas oficiais e fluxo com o sistema
  referencias/       # artes da edição passada
dados/               # banco local de desenvolvimento (fora do Git)
```

## Identidade visual

- Identidade híbrida: estrutura MLS com atmosfera Vice City. Manual em [`docs/marca/`](docs/marca/) e skill do Gemini em [`docs/skill-gemini/`](docs/skill-gemini/). Índice geral em [`docs/`](docs/).
- A logo oficial fica em [`public/imagens/logo/`](public/imagens/logo/) e não deve ser redesenhada.
- O visual do site segue o design system descrito em CLAUDE.md §5.
- O wordmark "COPA JUMENTUS / VICE CITY" é SVG vetorizado. **A fonte Pricedown nunca entra no repositório** (restrição de licença).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 3 · Vitest

# COPA JUMENTUS — VICE CITY

Sistema de sorteio balanceado para uma competição de futebol amadora. Sorteia **jogadores de linha entre times de capitães fixos**, com equilíbrio por nível (estrelas), revelação jogador-por-jogador em formato de cerimônia, e um link compartilhável com o resultado final.

Este arquivo é a fonte de verdade do projeto. Ao implementar qualquer coisa, siga-o. Se uma decisão aqui estiver errada ou faltando, **pergunte antes de inventar** — não resolva ambiguidade de regra de sorteio por conta própria.

---

## 1. Contexto e papéis

| Papel | Quem | O que faz |
|---|---|---|
| **Operador** | o dono do projeto (única pessoa com acesso de escrita) | cadastra jogadores e capitães, dispara o sorteio, conduz a cerimônia na própria tela |
| **Plateia** | a galera da pelada | abre o **link de resultado** no celular depois da cerimônia e vê os elencos |

Não há login, não há contas, não há permissões. O operador roda a aplicação localmente (ou num deploy que só ele usa para operar); a plateia só consome resultado.

---

## 2. Escopo

### Fase 1 — Sorteio (escopo atual, único que deve ser implementado agora)
1. Cadastro/edição do **elenco**: jogadores de linha e goleiros, cada um com nome, posição e nível em estrelas.
2. Cadastro dos **times**: nome do time + capitão fixo (o capitão é um jogador, já pertence ao time, não entra no pote).
3. **Sorteio balanceado** dos jogadores de linha entre os times.
4. **Sorteio separado de goleiros**: segunda etapa, 1 goleiro por time.
5. **Cerimônia de revelação**: um jogador por vez, com animação e suspense, controlada pelo operador.
6. **Link de resultado estático**: ao fim, gerar uma URL compartilhável que renderiza os elencos finais sem precisar de backend.

### Fase 2 — Páginas de time (planejada, não implementar sem pedido)
Página por time com escudo, elenco em cards HUD, soma de estrelas, goleiro destacado.

### Fase 3 — Tabela e resultados (planejada, não implementar sem pedido)
Rodadas, placares, classificação, artilharia.

### Fora de escopo (não construir, nem "preparar terreno" com abstração especulativa)
Autenticação, sincronização ao vivo entre dispositivos, histórico de temporadas, app mobile nativo, notificações.

---

## 3. Regras de domínio

### 3.1 Entidades

```ts
type Posicao = 'GOL' | 'ZAG' | 'MEI' | 'ATA';

interface Jogador {
  id: string;
  nome: string;
  apelido?: string;        // o nome que a galera usa; preferir na UI quando existir
  posicao: Posicao;
  estrelas: 1|2|3|4|5|6;   // nível de força — ver 3.2
  ehCapitao: boolean;
}

interface Time {
  id: string;
  nome: string;
  capitaoId: string;       // obrigatório, aponta para um Jogador com ehCapitao
  escudo?: string;         // URL/asset; opcional na fase 1
}
```

### 3.2 Nível em estrelas
- Escala **1 a 6 estrelas**, atribuída manualmente pelo operador. 6 = craque, 1 = perna de pau.
- Visualmente a escala usa o **Wanted System de 6 estrelas** do design system (ver §5). A escala de domínio e a escala visual são a mesma coisa de propósito — nunca converta nem reescale.
- Estrelas do **capitão contam** na força do time (ele já está no elenco antes do sorteio).
- Estrelas do **goleiro NÃO contam** no balanceamento de linha (goleiro é sorteado em etapa separada, depois).

### 3.3 Sorteio balanceado de jogadores de linha

Objetivo: distribuir todos os jogadores de linha (exceto capitães e goleiros) entre os times de forma que **a soma de estrelas de cada time fique o mais próxima possível**, mantendo aleatoriedade real dentro das restrições.

Restrições obrigatórias (invariantes — valide-as antes de exibir qualquer resultado):
1. Todo jogador de linha não-capitão é alocado a exatamente um time.
2. O tamanho dos elencos é equilibrado: a diferença entre o maior e o menor elenco é no máximo 1 jogador.
3. A diferença entre a maior e a menor soma de estrelas entre os times é no máximo **`TOLERANCIA_ESTRELAS` (default: 2)**.
4. Capitão nunca é realocado.

Algoritmo (serpentina aleatorizada — simples, explicável em voz alta na hora do sorteio):
1. Agrupe os jogadores do pote por nível de estrelas (6, 5, 4, … 1).
2. **Embaralhe dentro de cada grupo de estrelas** (a aleatoriedade vive aqui).
3. Percorra os níveis do mais forte para o mais fraco, distribuindo em **ordem serpentina**, onde a ordem de cada passada é dada pela soma de estrelas atual crescente — time mais fraco recebe primeiro.
4. Ao fim, valide as invariantes. Se a restrição 3 falhar, execute até `MAX_TENTATIVAS` (default: 200) novas tentativas com novo embaralhamento. Se ainda falhar, **mostre o melhor resultado encontrado e avise o operador explicitamente** que a tolerância não foi atingida — nunca falhe em silêncio nem relaxe a regra escondido.

Balanceamento por posição é um **objetivo secundário**: distribua ZAG/MEI/ATA o mais uniformemente possível como critério de desempate entre tentativas válidas, mas nunca a ponto de violar as invariantes 1–3.

### 3.4 Sorteio de goleiros
- Etapa **separada e posterior**, disparada pelo operador.
- Pote = jogadores com `posicao === 'GOL'` que não são capitães.
- Exatamente **1 goleiro por time**, atribuição puramente aleatória (estrelas de goleiro não entram em nenhuma conta).
- Se houver menos goleiros que times, aloque os disponíveis e marque os times restantes como **"GOLEIRO: A DEFINIR"** na UI. Não invente jogador, não reutilize goleiro.
- Se houver mais goleiros que times, os excedentes **não** voltam para o pote de linha — ficam listados à parte como reservas. Qualquer mudança nessa regra é decisão do operador.

### 3.5 Aleatoriedade
- Use `crypto.getRandomValues` como fonte, encapsulado atrás de uma função única (`shuffle` / `randomInt`) para ser testável.
- O sorteio **não precisa ser reproduzível nem verificável por seed** — foi decisão explícita priorizar balanceamento sobre auditabilidade. Não adicione sistema de seed pública sem pedido.

### 3.6 Configuração
Constantes de regra ficam num único módulo (`src/lib/config.ts`), não espalhadas:
`TOLERANCIA_ESTRELAS = 2`, `MAX_TENTATIVAS = 200`, `ESTRELAS_MIN = 1`, `ESTRELAS_MAX = 6`.
Número de times e tamanho de elenco são **derivados do cadastro**, nunca hardcoded.

---

## 4. Arquitetura

### 4.1 Stack
- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS**
- Sem backend na fase 1. Sem ORM, sem banco.
- Testes: **Vitest** — obrigatórios para a camada de domínio (§4.3).

### 4.2 Camada de dados — trocável de propósito
A decisão de persistência foi **adiada**. Portanto toda leitura/escrita passa por uma interface única:

```ts
// src/lib/repo/types.ts
interface CopaRepo {
  carregarElenco(): Promise<Jogador[]>;
  salvarElenco(jogadores: Jogador[]): Promise<void>;
  carregarTimes(): Promise<Time[]>;
  salvarTimes(times: Time[]): Promise<void>;
  carregarSorteio(): Promise<Sorteio | null>;
  salvarSorteio(sorteio: Sorteio): Promise<void>;
}
```

- Implementação da fase 1: **`JsonLocalRepo`** — elenco e times em JSON (`dados/elenco.json`, `dados/times.json`); resultado do sorteio em `localStorage`.
- **Fonte atual do cadastro: a planilha oficial (Google Sheets, aba `INSCRITOS`).** `npm run importar -- "<url do CSV>"` baixa a aba para `dados/inscritos.csv`; `src/lib/repo/planilha.ts` (função pura, testada) converte o CSV em `Jogador[]`/`Time[]` e lista pendências; `src/lib/repo/cadastro.ts` lê o arquivo no servidor e cai no seed de exemplo se ele não existir. As páginas usam só `carregarCadastro()` — é o ponto a trocar quando o `CopaRepo` existir.
  - Colunas lidas (cabeçalho, sem acento/caixa): `Nome`, `Apelido`, `Posição` (GOL/ZAG/MEI/ATA), `Estrelas` (1–6), `Capitão do time` (nome do time; marca o capitão e cria o `Time`), `Status` (só `Confirmado` entra).
  - Goleiro com `Estrelas` vazio recebe `ESTRELAS_MIN` (não conta no balanceamento, §3.2).
  - Qualquer pendência (posição/estrelas vazias, nome repetido, time sem capitão ou com dois) **bloqueia** o botão de sorteio.
- **`dados/` está no `.gitignore`** (exceto `dados/*.example.*`). Mantenha os exemplos versionados como referência de formato (`dados/inscritos.example.csv`).
- Nenhum componente de UI importa `localStorage`, `fs` ou caminho de arquivo direto. Tudo pelo repo. Trocar por Postgres depois deve ser **uma implementação nova da interface, com zero mudança de UI**.

### 4.3 Separação obrigatória

```
src/
  lib/
    config.ts          # constantes de regra
    domain/            # tipos + sorteio. PURO: sem React, sem DOM, sem IO, sem random direto
      sorteio.ts
      validacao.ts     # as invariantes de 3.3 como funções
      random.ts        # única fonte de aleatoriedade, injetável nos testes
    repo/              # persistência atrás da interface
    share/             # codificação/decodificação do link de resultado
  app/                 # rotas Next
  components/          # UI
```

A lógica de sorteio em `lib/domain` precisa ser testável sem renderizar nada. Toda invariante de §3.3 tem teste. Todo bug de sorteio corrigido ganha um teste de regressão.

### 4.4 Link de resultado estático
- O resultado é serializado e **codificado na própria URL** (JSON compacto → base64url), rota `/resultado/[payload]`.
- A página de resultado é read-only: renderiza do payload, não lê `localStorage` nem repo.
- Mantenha o payload enxuto: ids curtos, nomes, estrelas, times. Se a URL passar de ~2000 caracteres, avise e proponha alternativa (publicar página estática) em vez de truncar dados.

---

## 5. Frontend e design

O visual é definido pela skill **`leonida-design`**, em `~/.claude/skills/leonida-design/`. **Invoque `/leonida-design` e leia o `SKILL.md` e os três arquivos em `references/` antes de escrever qualquer CSS ou componente.** Ela é normativa, não inspiracional.

A skill foi gerada a partir de duas fontes: o spec original de key art ([gta_vi_frontend_design_system_agent_guidelines.md](gta_vi_frontend_design_system_agent_guidelines.md), mantido como referência histórica) e os estilos computados medidos na página oficial `rockstargames.com/VI`. **Onde os dois divergirem, a skill vence**, porque os neutros, o raio pilula e a rampa de superfícies dela são medidos, não estimados.

Pontos em que a skill corrige o spec original:
- O campo é `#0C0D1B` (dusk roxo-marinho medido), não `#0B0716`.
- O display é **Bowlby One** e o corpo é **Manrope**, não Anton e Inter.
- Controles são **pílula** (`999px`); painéis **recortam** o canto e não arredondam. Nada entre 5 e 11px.
- O neon é racionado: **um elemento gritante por tela**.
- Texto de status tem token próprio (`--success-text` e irmãos), porque o passo 500 falha contraste sobre o próprio tint em fundo claro.

Este app é **dark-only de propósito** — a cerimônia acontece à noite. A skill define modo claro; o projeto não o usa.

### Wordmark: Pricedown vetorizada

Os títulos de marca ("COPA JUMENTUS" e "VICE CITY" no hero e na página de resultado) **não são texto**. São paths SVG em [Wordmark.tsx](src/components/Wordmark.tsx), extraídos das curvas da **Pricedown Black**, de Raymond Larabie (Typodermic Fonts) — a fonte real do logo do GTA.

Três regras que vêm da licença, e não são negociáveis:

1. **Nunca adicione o arquivo `.otf` ao repositório.** A Typodermic Desktop License é para uma pessoa física e proíbe colocar a fonte em servidor ou pasta compartilhada. Um repo Git é exatamente isso.
2. **Nunca sirva a Pricedown como webfont.** Isso exige uma licença de embedding, que o projeto não tem. O que a licença grátis cobre é "logos, wordmarks" e "outlined SVG" — arte fixa.
3. **Para mudar o texto de um wordmark**, gere um SVG novo a partir da fonte, numa máquina com ela instalada. Não dá para editar o texto no código.

Por isso **só títulos de marca** usam wordmark. Todo texto dinâmico — nome de jogador, nome de time, rótulo de botão — continua em **Bowlby One**, que é livre e vem do Google Fonts.

### Key art do hero

A home usa `public/banner-copa-jumentus.webp` (2000×504), arte da comissão com skyline, ponte, palmeiras e o wordmark já compostos. Substitui o palco que antes era montado em CSS.

- A arte é **4:1**. Em telas largas ela se basta; abaixo de `sm` vira uma tira de ~94px, então ganha moldura com a própria arte ampliada e desfocada atrás. Isso casa as cores da emenda por construção — não tente adivinhar um gradiente equivalente.
- O `<h1>` é `sr-only`, porque o título ali é pixel, não texto.
- **Trocar a arte**: mantenha a proporção próxima de 4:1 e atualize `width`/`height` no `next/image`. Proporções muito diferentes quebram a moldura do celular.

### Imagens da marca

Ficam em `public/imagens/` (logo oficial, kits, escudos, artes), descritas em `public/imagens/README.md`. Documentação de marca, a skill do Gemini e o guia das planilhas ficam em `docs/` (índice em `docs/README.md`). A logo oficial não é redesenhada. Escudo de time (`Time.escudo`, fase 2) usa `public/imagens/escudos/<slug-do-time>.webp`.

A página de resultado **não** usa o banner: ela é consumida no celular, onde 4:1 fica pequeno demais. Lá o título é o wordmark SVG, que escala melhor em retrato.

Pontos de amarração entre domínio e design:
- **Nível do jogador → Wanted System de 6 estrelas.** Mesma escala, sem conversão.
- **Cards de jogador e de time → HUD Cards**, com a barra segmentada inferior (health / armor / orange).
- **Botão de sortear e de revelar próximo → Primary CTA** com `--gradient-leonida`, o skew e o raio pílula.
- **Cerimônia de revelação** usa as transições snappy (140–320ms, `cubic-bezier(0.16, 1, 0.3, 1)`) e o selection flash. O suspense vem do **ritmo controlado pelo operador**, não de animação lenta: cada revelação é rápida; quem controla a pausa é o clique.

### Comportamento

A seção de movimento da skill (`references/tokens.md`) carrega as regras de interação. As quatro que mais pegam no dia a dia:

1. **Retorno nasce no pointer-down**, nunca na soltura. Todo controle tem `:active`, `touch-action: manipulation` e tap-highlight do sistema desligado.
2. **Tracking é específico de tamanho.** Use `.t-xl` acima de 2,2rem e `.t-sm` abaixo de 1,5rem junto de `.titulo-hero`. Um valor único numa escala que vai de 1,1rem a 6rem está errado em alguma ponta.
3. **Painel de vidro materializa**, não aparece: a entrada anima `blur` e escala junto com opacidade.
4. **Três preferências do sistema**, não uma: `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast` têm todas tratamento próprio.

A curva mecânica fixa vale porque **nada aqui é dirigido por gesto**. Se um dia entrar superfície arrastável — card que desliza, bottom sheet, slider que se arremessa —, a curva deixa de valer e o caso passa a pedir mola com entrega de velocidade. A skill descreve o que muda.
- **Tela de cerimônia é projetada/compartilhada** — dimensione tipografia para ser legível de longe. Prioridade visual: nome do jogador, estrelas, time que recebeu.
- **Página de resultado é consumida no celular** — mobile-first, sem scroll horizontal.

Nunca introduza visual corporativo/SaaS genérico, biblioteca de componentes com tema próprio (shadcn default, MUI, Chakra) ou paleta fora dos tokens.

---

## 6. Convenções

- **Idioma:** domínio, UI, nomes de entidade e mensagens em **português** (`Jogador`, `Time`, `sortear`, `estrelas`). Termos técnicos de framework ficam em inglês. Comentários e commits em português.
- **TypeScript strict.** Sem `any`. Sem `as` para calar o compilador.
- Sem classes onde função pura resolve. Domínio é funcional e imutável: `sortear(entrada) → resultado`, nunca mutando a entrada.
- Nomes de arquivo: `kebab-case.ts`; componentes React em `PascalCase.tsx`.
- Erros de regra violada são **visíveis ao operador na UI**, não só no console.
- Não adicione dependência sem necessidade clara. Animação: CSS primeiro; biblioteca só se o CSS não der conta.

---

## 7. Como trabalhar neste projeto

1. **Regra de sorteio é sagrada.** Mudança em §3 é decisão do operador. Se o código divergir deste arquivo, aponte a divergência antes de "consertar" qualquer lado.
2. **Teste o domínio antes da UI.** Sorteio sem teste não está pronto.
3. **Não amplie o escopo.** Fases 2 e 3 estão documentadas para dar contexto, não para serem implementadas.
4. **Não especule na abstração.** A única abstração deliberada é `CopaRepo` (§4.2), porque a decisão de dados foi adiada de propósito. Fora dela, código direto.
5. **Mantenha este arquivo vivo.** Decisão nova de regra, stack ou escopo → atualize o CLAUDE.md na mesma mudança.

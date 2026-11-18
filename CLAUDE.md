# COPA JUMENTUS — VICE CITY

Sistema de sorteio balanceado para uma competição de futebol amadora. Sorteia **jogadores de linha entre times de capitães fixos**, com equilíbrio por nível (estrelas), revelação jogador-por-jogador em formato de cerimônia, e um link compartilhável com o resultado final.

Este arquivo é a fonte de verdade do projeto. Ao implementar qualquer coisa, siga-o. Se uma decisão aqui estiver errada ou faltando, **pergunte antes de inventar** — não resolva ambiguidade de regra de sorteio por conta própria.

---

## 1. Contexto e papéis

| Papel | Quem | O que faz |
|---|---|---|
| **Operador** | o dono do projeto (única pessoa com acesso de escrita) | cadastra jogadores e capitães, dispara o sorteio, conduz a cerimônia na própria tela |
| **Plateia** | a galera da pelada | abre o **link de resultado** no celular depois da cerimônia e vê os elencos |

Há **contas de admin**, só para a organização (decisão do operador em 17/11/2026): cada admin entra com usuário e senha próprios e só admins editam qualquer coisa. Não há níveis entre admins. A plateia não tem conta nem login: vê o campeonato (tabela, jogos, rankings, elencos) e nunca vê estrelas.

---

## 2. Escopo

### Fase 1 — Sorteio (escopo atual, único que deve ser implementado agora)
1. Cadastro/edição do **elenco**: jogadores de linha e goleiros, cada um com nome, posição e nível em estrelas.
2. Cadastro dos **times**: nome do time + capitão fixo (o capitão é um jogador, já pertence ao time, não entra no pote).
3. **Sorteio balanceado** dos jogadores de linha entre os times.
4. **Sorteio separado de goleiros**: segunda etapa, 1 goleiro por time.
5. **Cerimônia de revelação**: um jogador por vez, com animação e suspense, controlada pelo operador.
6. **Link de resultado estático**: ao fim, gerar uma URL compartilhável que renderiza os elencos finais sem precisar de backend.

### Fase 2 — Campeonato (implementada, ver §8)
Equipes, elencos vindos do sorteio, fases e grupos editáveis, partidas com data/hora editáveis, súmula ao vivo, classificação, rankings e controle de pagamento. Pedido do operador em 17/11/2026: "só o simples do campeonato, apenas os admins editam".

Decisões do operador em 17/11/2026 que ampliaram esta fase (§8.6):
- **Vários campeonatos por instalação**, com painel de listagem, criação e **duplicação** de campeonato.
- **Histórico de edições**: cada campeonato encerrado continua consultável em `/edicoes/[slug]`.
- **Exportação/impressão limpa** de súmula, classificação e elencos (CSS de impressão; sem biblioteca de PDF).
- **Modelo oficial "Copa Jumentus · 8 times · 34 jogos"**, aplicado com um clique ao criar o campeonato. O formato livre (§8.1) continua existindo para outras edições.

### Fora de escopo (não construir, nem "preparar terreno" com abstração especulativa)
Contas de usuário para a plateia (só os admins têm conta, §4.5), seguidores, comentários, enquetes, mídia enviada pelo público, app mobile nativo, notificações, carteirinhas, geração de PDF por biblioteca (a impressão é pelo navegador).

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
- **Postgres com Drizzle ORM** (§9): Neon em produção (Vercel), PGlite (Postgres em WebAssembly, arquivo local) em desenvolvimento. Decisão do operador em 17/11/2026.
- **Contas de admin** (tabela `admin`, §9), detalhes em §4.5. `src/middleware.ts` protege `/admin`, `/sorteio` e `/cerimonia` conferindo só o cookie; cada server action e cada layout do admin passam por `exigirAdmin()`, que confere a conta no banco.
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

- O resultado do sorteio continua em `localStorage` e no link (§4.4); o que vale para o campeonato é o "Oficializar" (§8.4).
- **Fonte do cadastro: tabela `inscricao` no banco, editada em Admin › Inscrições** (decisão do operador em 17/11/2026: "direto no sistema"). A planilha vira só uma importação: o admin envia o CSV da aba `INSCRITOS` na mesma tela, e quem já existe (mesmo nome, sem acento/caixa) é mantido. `src/lib/repo/inscricoes-repo.ts` faz o CRUD; `interpretarInscricoes()` em `planilha.ts` (pura, testada) valida e monta `Jogador[]`/`Time[]` com as pendências, a mesma função para o CSV e para o banco. `carregarCadastro()` lê o banco e cai no seed de exemplo se não houver nenhuma inscrição.
  - Colunas do CSV (cabeçalho, sem acento/caixa): `Nome`, `Apelido`, `Posição` (GOL/ZAG/MEI/ATA), `Estrelas` (1–6), `Capitão do time` (nome do time; marca o capitão e cria o `Time`), `Status` (só `Confirmado` entra).
  - Goleiro com `Estrelas` vazio recebe `ESTRELAS_MIN` (não conta no balanceamento, §3.2).
  - Qualquer pendência (posição/estrelas vazias, nome repetido, time sem capitão ou com dois) **bloqueia** o botão de sorteio.
- **`dados/` está no `.gitignore`** (exceto `dados/*.example.*`): lá fica o banco local (`dados/pglite`). Mantenha `dados/inscritos.example.csv` como referência de formato do CSV.
- Nenhum componente de UI importa `localStorage`, `fs`, caminho de arquivo ou o cliente do banco direto. Tudo pelos módulos de `src/lib/repo/`.

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

### 4.5 Contas de admin

Substituiu a senha única `ADMIN_SENHA` em 17/11/2026. Código em `src/lib/auth/` (regras, testadas) e `src/lib/repo/admins-repo.ts` (banco).
- **Senha:** hash scrypt do `node:crypto`, formato `scrypt$N$r$p$<sal base64url>$<chave base64url>` (N=16384, r=8, p=1, sal de 16 bytes, chave de 64), comparação com `timingSafeEqual`. Nova senha: mínimo 10 caracteres, diferente da atual, digitada duas vezes. Senha temporária gerada com `node:crypto` (não pelo `random.ts`, que é do sorteio).
- **Login** em `/admin/entrar` com usuário (sem diferenciar maiúsculas) e senha. 5 erros seguidos bloqueiam a conta por 15 minutos. A mensagem de erro é a mesma para usuário inexistente, conta desativada, bloqueada e senha errada, e o usuário inexistente gasta o mesmo tempo de verificação.
- **Sessão:** cookie `cj_admin` httpOnly, `secure`, `sameSite=lax`, 30 dias, com `{adminId, versao, expira}` assinado por HMAC-SHA256 com `SESSAO_SEGREDO` (32+ caracteres). O middleware só confere assinatura e validade (Web Crypto, sem banco). `exigirAdmin()` confere conta ativa e `versao_sessao` igual. Trocar ou redefinir a senha e desativar a conta incrementam `versao_sessao`, encerrando as outras sessões. Sair apaga o cookie.
- **Troca obrigatória:** com `deve_trocar_senha`, toda página do admin (painel, `/sorteio`, `/cerimonia`, via `GuardaAdmin`) fica inerte sob um pop-up que não fecha (sem X, Esc ou clique fora) e `exigirAdmin()` recusa qualquer ação no servidor até a troca.
- **Gestão:** Admin › Admins lista, cria conta (senha temporária mostrada uma vez, só na resposta da ação), redefine senha (nova temporária, troca forçada, desbloqueia) e desativa. Ninguém desativa a própria conta nem o último admin ativo. Admin › Minha conta troca a própria senha (pede a atual).
- **Primeira conta** num banco vazio: `npm run admin:criar -- <usuario> [Nome]`.

---

## 5. Frontend e design

O visual segue o **Manual de Marca da Copa Jumentus 2027** ([docs/marca/manual-de-marca.md](docs/marca/manual-de-marca.md)), adaptado para tela. Decisão do operador em 17/11/2026: o site usa a mesma identidade das artes do Instagram. Ele substitui o design system `leonida-design` usado na primeira versão.

A identidade é **híbrida**: a estrutura MLS organiza a informação, Vice City dá o clima. As telas do sistema são "peças de jogo" no manual: marinho e dourado, com Vice City só como luz âmbar no topo. A cerimônia e o banner da home são "peças de evento": céu Vice City forte.

Tokens em `src/app/globals.css` (fonte única; o Tailwind só aponta para eles):
- **Cores:** fundo marinho profundo `#06122A`, superfícies marinho Jumentus `#0B1F3F` em diante, texto off-white `#F4F2EC` e cinza concreto `#C9CCD1`, acento dourado `#D4A12A`, vermelho destaque `#E4002B` só para "ao vivo", erro e eliminado. Paleta Vice City (`#1E0838` e o céu) só em atmosfera.
- **Dourado metálico** (`--gradient-leonida`, nome mantido por compatibilidade): `#9C6F14 → #F2CB57 → #D4A12A` a 45°. Exclusivo da Copa: botão principal, filetes, item ativo.
- **Fontes (Google Fonts, via `next/font`):** títulos em **Anton** (`.titulo-hero`), números e placar em **Big Shoulders Black** (a antiga Big Shoulders Display; servida localmente de `src/app/fontes/` via `next/font/local`, porque o `next/font/google` do Next 15.5 quebra o build com ela) (`.numero`, `font-numero`), rótulos em **Barlow Condensed** (`.hud-label`, `font-mono`), texto em **Barlow** (`font-sans`).
- **Forma:** módulos de transmissão retos, com canto cortado a 45° (`.hud-clip`) e filete dourado na base (`.modulo`). Botões retos com a ponta direita cortada a 45°. Nada de pílula.
- **Diagonais** (`.faixas`): grupo marinho, vermelho e dourado a 45°, subindo da esquerda para a direita, só no canto do cabeçalho de tela. Nunca atrás de título, número ou escudo.
- **Cores dos times:** vêm de `src/lib/campeonato/marcas.ts`, iguais ao manual. Nos cards de equipe, a faixa larga usa a secundária e a fina é dourada, no canto.
- **Brasão oficial** (`public/imagens/logo/copa-jumentus-logo.png`) na barra de navegação, nunca redesenhado. Escudos só dos arquivos oficiais.
- **Sem emojis na interface** (manual, "Proibido"): cartões e gol são ícones desenhados (`Cartao`, `Sumula`).

Este app é **dark-only de propósito** — a cerimônia acontece à noite.

### Wordmark: Pricedown vetorizada

Os títulos de marca ("COPA JUMENTUS" e "VICE CITY" no hero e na página de resultado) **não são texto**. São paths SVG em [Wordmark.tsx](src/components/Wordmark.tsx), extraídos das curvas da **Pricedown Black**, de Raymond Larabie (Typodermic Fonts) — a fonte real do logo do GTA.

Três regras que vêm da licença, e não são negociáveis:

1. **Nunca adicione o arquivo `.otf` ao repositório.** A Typodermic Desktop License é para uma pessoa física e proíbe colocar a fonte em servidor ou pasta compartilhada. Um repo Git é exatamente isso.
2. **Nunca sirva a Pricedown como webfont.** Isso exige uma licença de embedding, que o projeto não tem. O que a licença grátis cobre é "logos, wordmarks" e "outlined SVG" — arte fixa.
3. **Para mudar o texto de um wordmark**, gere um SVG novo a partir da fonte, numa máquina com ela instalada. Não dá para editar o texto no código.

Por isso **só títulos de marca** usam wordmark. Todo texto dinâmico — nome de jogador, nome de time, rótulo de botão — usa as fontes livres do manual (Anton, Big Shoulders Display, Barlow Condensed e Barlow).

### Key art do hero

A home usa `public/banner-copa-jumentus.webp` (2000×504), arte da comissão com skyline, ponte, palmeiras e o wordmark já compostos. Substitui o palco que antes era montado em CSS.

- A arte é **4:1**. Em telas largas ela se basta; abaixo de `sm` vira uma tira de ~94px, então ganha moldura com a própria arte ampliada e desfocada atrás. Isso casa as cores da emenda por construção — não tente adivinhar um gradiente equivalente.
- O `<h1>` é `sr-only`, porque o título ali é pixel, não texto.
- **Trocar a arte**: mantenha a proporção próxima de 4:1 e atualize `width`/`height` no `next/image`. Proporções muito diferentes quebram a moldura do celular.

### Imagens da marca

Ficam em `public/imagens/` (logo oficial, kits, escudos, artes), descritas em `public/imagens/README.md`. Documentação de marca, a skill do Gemini e o guia das planilhas ficam em `docs/` (índice em `docs/README.md`). A logo oficial não é redesenhada. Escudo de time (`Time.escudo`, fase 2) usa `public/imagens/escudos/<slug-do-time>.webp`.

A página de resultado **não** usa o banner: ela é consumida no celular, onde 4:1 fica pequeno demais. Lá o título é o wordmark SVG, que escala melhor em retrato.

Pontos de amarração entre domínio e design:
- **Nível do jogador → 6 estrelas.** Mesma escala do domínio, sem conversão. Estrelas só em telas de admin.
- **Cards de jogador e de time → módulos de transmissão** (`.hud-card`), com canto cortado e filete dourado na base.
- **Botão de sortear e de revelar próximo → botão principal** dourado metálico, com a ponta cortada a 45°.
- **Cerimônia de revelação** usa as transições snappy (140–320ms, `cubic-bezier(0.16, 1, 0.3, 1)`) e o selection flash. O suspense vem do **ritmo controlado pelo operador**, não de animação lenta: cada revelação é rápida; quem controla a pausa é o clique.

### Comportamento

Regras de interação que valem em todas as telas:

1. **Retorno nasce no pointer-down**, nunca na soltura. Todo controle tem `:active`, `touch-action: manipulation` e tap-highlight do sistema desligado.
2. **Tracking é específico de tamanho.** Use `.t-xl` acima de 2,2rem e `.t-sm` abaixo de 1,5rem junto de `.titulo-hero`. Um valor único numa escala que vai de 1,1rem a 6rem está errado em alguma ponta.
3. **Painel de vidro materializa**, não aparece: a entrada anima `blur` e escala junto com opacidade.
4. **Três preferências do sistema**, não uma: `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast` têm todas tratamento próprio.

A curva mecânica fixa vale porque **nada aqui é dirigido por gesto**. Se um dia entrar superfície arrastável — card que desliza, bottom sheet, slider que se arremessa —, a curva deixa de valer e o caso passa a pedir mola com entrega de velocidade.
- **Tela de cerimônia é projetada/compartilhada** — dimensione tipografia para ser legível de longe. Prioridade visual: nome do jogador, estrelas, time que recebeu.
- **Página de resultado é consumida no celular** — mobile-first, sem scroll horizontal.

Nunca introduza visual corporativo/SaaS genérico, biblioteca de componentes com tema próprio (shadcn default, MUI, Chakra) ou paleta fora do manual de marca.

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
3. **Não amplie o escopo.** Construa só o que está no §2; o resto é decisão do operador.
4. **Não especule na abstração.** A única abstração deliberada é `CopaRepo` (§4.2), porque a decisão de dados foi adiada de propósito. Fora dela, código direto.
5. **Mantenha este arquivo vivo.** Decisão nova de regra, stack ou escopo → atualize o CLAUDE.md na mesma mudança.

---

## 8. Campeonato

### 8.1 Regras de disputa (decididas pelo operador)
- **Pontuação:** vitória 3, empate 1, derrota 0 por padrão, editável em Admin › Campeonato.
- **Desempate** (`classificacao.ts`): pontos, vitórias, saldo, gols marcados, gols sofridos (menos é melhor), confronto direto, cartões. A ordem é editável (botões ↑/↓; arrastar só se o operador pedir). Cada critério só é aplicado entre as equipes que continuam empatadas.
  - **Confronto direto:** minitabela só com os jogos entre as empatadas (pontos, depois saldo); com 2 equipes é o confronto simples. Se ela separa só parte do grupo, as que seguem empatadas refazem a minitabela entre si. (A comparação par a par antiga não era transitiva.)
  - **Cartões** (último): menos vermelhos; persistindo, menos amarelos. Contam os jogos encerrados da fase.
  - **Empate em tudo:** a posição fica **empatada** e, com o grupo encerrado, o admin vê uma pendência em Fases e grupos para decidir a ordem à mão (`fase.desempates`). O sistema nunca sorteia sozinho. Com o grupo em andamento, a tabela só mostra a ordem.
- **Formato:** modelo oficial (§8.6) ou livre. No livre, o admin cria as fases na ordem; cada fase é `grupos` (pontos corridos) ou `mata-mata`.
- **Grupos (formato livre):** o admin escolhe a quantidade e sorteia aleatoriamente (via `random.ts`) ou define à mão. "Gerar jogos dos grupos" cria o todos contra todos que falta. No modelo oficial isso fica bloqueado.
- **Mata-mata:** no livre, confrontos criados à mão em Admin › Partidas. Empate decide nos pênaltis, lançados no controle da partida. Jogo eliminatório empatado **não encerra** sem placar de pênaltis com vencedor (erro visível). Pênaltis só valem e só aparecem com empate no tempo normal.
- **Datas, horários e local** de cada partida são editáveis a qualquer momento.

### 8.2 Cartões e suspensão
- 3 amarelos acumulados: suspenso no jogo seguinte da equipe; a contagem zera. Os amarelos **não** zeram entre as fases (confirmado pelo operador em 17/11/2026).
- Vermelho: suspenso no jogo seguinte da equipe.
- A suspensão é cumprida quando esse jogo seguinte é encerrado. Cartões contam em jogos ao vivo e encerrados.
- Cálculo em `lib/domain/campeonato/suspensoes.ts`, derivado das súmulas; nada é gravado. "Jogo seguinte" segue o número do jogo quando todas as partidas têm número (modelo oficial: um campo, um jogo por vez); senão, data/hora.

### 8.3 Súmula e placar
- Os admins editam o resultado durante o jogo em `/admin/partidas/[id]`.
- Gol registrado na súmula soma no placar (gol contra soma para o adversário); remover o evento desconta.
- Os botões + e − ajustam gols sem autor e pênaltis.
- Eventos: `gol`, `gol_penalti` (pênalti convertido durante o jogo, soma no placar e na artilharia), `gol-contra`, `penalti_perdido`, `amarelo`, `vermelho`, `defesa` (só do goleiro registrado na partida). A disputa de pênaltis é só placar (`penaltis_mandante/visitante`).
- **Goleiro de cada lado** (`partida.goleiro_mandante_id`/`goleiro_visitante_id`), escolhido na súmula; sem registro, vale o único GOL do elenco, se houver um só.
- Classificação e rankings são calculados das partidas (`lib/domain/campeonato/`); só jogos **encerrados** entram na tabela.
- **Rankings** (com filtro por fase): artilharia, assistências, penalidades (convertidos/perdidos), goleiros (gols sofridos, média, jogos sem sofrer gol, defesas; só jogos encerrados) e cartões.

### 8.4 Dados e integração com o sorteio
- `lib/repo/campeonato-repo.ts` monta o documento `Campeonato` de um campeonato a partir das tabelas (§9), já com os participantes derivados (§8.6), e o grava inteiro numa transação, só nas linhas daquele campeonato. Toda gravação passa pela **trava** e pelas **regras de consistência** (§8.6). Banco vazio: importa `dados/campeonato.json` se existir (legado e `npm run demo`), senão parte do `campeonatoPadrao()` (8 equipes do manual de marca, fases "Fase de grupos" e "Mata-mata").
- **Campeonato em edição** (`lib/campeonato/selecao.ts`): cada admin escolhe em Admin › Campeonatos; fica num cookie do navegador. Todas as telas e ações do admin, as inscrições, o pote e a cerimônia usam esse campeonato. Sem escolha, vale o atual do site público.
- **Inscrições** são de cada campeonato (`inscricao.campeonato_id`).
- No fim da cerimônia, **"Oficializar no campeonato"** grava equipes, jogadores e capitães no campeonato em edição. É bloqueado se já houver súmula preenchida. O pagamento de quem já estava cadastrado (pelo nome) é preservado.
- **Pagamentos** (pago/pendente por jogador, valor da inscrição) só aparecem em `/admin/pagamentos`.
- **Estrelas nunca aparecem em página pública.** O pote foi para `/sorteio`, protegido.

### 8.5 Rotas
- Públicas: `/`, `/classificacao`, `/jogos`, `/jogos/[id]`, `/rankings`, `/equipes` mostram o **campeonato atual**: o mais recente em andamento; senão em inscrições; senão o último encerrado. Rascunho nunca é público. Histórico: `/edicoes` e `/edicoes/[slug]/…` (as mesmas telas, componentes em `src/components/paginas/`). Mais `/resultado/[payload]`.
- Admin: `/admin`, `/admin/campeonatos`, `/admin/inscricoes`, `/admin/campeonato`, `/admin/fases`, `/admin/partidas`, `/admin/partidas/[id]`, `/admin/equipes`, `/admin/pagamentos`, `/admin/admins`, `/admin/conta`, `/sorteio`, `/cerimonia`. Login em `/admin/entrar`.

### 8.6 Modelo oficial "Copa Jumentus · 8 times · 34 jogos"
Decisão do operador em 17/11/2026. Código em `lib/domain/campeonato/modelo.ts` (tabela e aplicação) e `chaveamento.ts` (participantes, trava e consistência), puro e testado.
- **Criar:** Admin › Campeonatos cria o campeonato com as 8 equipes do manual e, no modelo, já com os 34 jogos. "Aplicar modelo oficial" (Admin › Campeonato) faz o mesmo num campeonato sem partidas. Nasce em rascunho.
- **1ª fase — Grupo Único:** 28 jogos, 7 rodadas, turno único, um campo, um jogo por vez; rodadas 1–4 no dia 1 e 5–7 no dia 2. A ordem (`TABELA_GRUPO_UNICO`) mantém os confrontos e o mando de Berger enviados pelo operador em cada rodada, reordenados dentro da rodada para dar **isonomia de descanso** (decisão do operador em 17/11/2026): no mesmo dia, todo time descansa **pelo menos 2 jogos** entre uma partida e outra (nunca joga duas seguidas), ninguém tem mais de 2 descansos curtos (de 2 jogos) e a maior espera é de 5 jogos. É a mais equilibrada entre as 8.192 ordens que garantem esse mínimo (testado). A ordem literal do texto do operador fazia um time jogar duas seguidas na virada de cada rodada; não volte a ela. Zonas: 1º–2º semifinal, 3º–6º repescagem, 7º–8º eliminados (`fase.zonas`).
- **T1 a T8** são sorteados (`random.ts`) num botão em Admin › Partidas, depois de oficializar os elencos, e gravados em `equipe.numero_tabela`. Refazer é permitido enquanto nenhuma partida tiver começado.
- **Mata-mata (dia 2):** J29 Repescagem 1 (3º x 6º), J30 Repescagem 2 (4º x 5º), J31 Semifinal 1 (1º x vencedor J30), J32 Semifinal 2 (2º x vencedor J29), J33 3º lugar (perdedores de J31 e J32), J34 Final (vencedores de J31 e J32). Sem vantagem de empate: empate no tempo normal vai para os pênaltis.
- **Participantes derivados, nunca gravados** (`resolverChaveamento`, como as suspensões): cada partida do modelo tem `origem_mandante`/`origem_visitante` (`{tipo:'tabela',numero}` | `{tipo:'posicao',faseId,posicao}` | `{tipo:'vencedor'|'perdedor',partidaNumero}`); `mandante_id`/`visitante_id` ficam vazios no banco. Origem por posição só resolve com todos os jogos da fase encerrados e sem empate pendente na posição; vencedor/perdedor, com o jogo de origem encerrado. Sem participante, a tela mostra a origem ("3º do Grupo Único", "Vencedor J30") e o jogo não pode começar.
- **Trava:** nenhuma mudança (correção de placar, súmula, T1–T8, desempate manual) pode alterar os participantes de uma partida já iniciada, com súmula ou com goleiro registrado; a mensagem diz qual jogo seria afetado. Antes disso, corrigir um resultado recalcula o chaveamento sozinho.
- **Pódio:** J34 (1º e 2º) e J33 (3º), mostrado no Início quando a final encerra.
- **Limite conhecido:** o descanso mínimo de 2 jogos vale dentro de cada dia do Grupo Único; do jogo 28 para o 29 o mesmo time pode jogar em seguida (depende da classificação).

---

## 9. Banco de dados

- **Produção:** Postgres no **Neon** (São Paulo, `sa-east-1`), app na **Vercel** com funções em São Paulo (`vercel.json`, `gru1`) para ficar perto do banco. Repositório na organização `copa-jumentus` do GitHub (a Vercel não publica repo de conta pessoal de outra pessoa). `DATABASE_URL` (connection string *pooled* do Neon) nas variáveis de ambiente da Vercel. O cliente usa `postgres` 3.x com `prepare: false` (exigido pelo pooler).
- **Desenvolvimento:** sem `DATABASE_URL`, `src/lib/db/cliente.ts` abre um **PGlite** em `dados/pglite` e aplica as migrações sozinho. Para começar do zero, apague a pasta. Testes usam PGlite em memória (`bancoDeTeste()`).
- **Esquema:** `src/lib/db/schema.ts`. Tabelas: `admin` (contas, §4.5), `campeonato` (um por edição: `slug` único, `edicao`, `status` rascunho|inscricoes|andamento|encerrado, `modelo` copa-jumentus-8|livre, `banner`, `escudo`, `duplicado_de`), `inscricao`, `equipe`, `jogador`, `fase`, `grupo`, `grupo_equipe`, `partida`, `evento`. As restrições do domínio que o banco consegue garantir (estrelas 1–6, mandante ≠ visitante, FKs) estão em `check` e `foreign key`.
- **Migrações:** SQL em `drizzle/`, geradas com `npm run db:gerar` depois de mudar o esquema (revise o SQL e versione). `npm run build` roda `scripts/migrar.mjs` antes do `next build`, então o deploy na Vercel atualiza o Neon sozinho. Nunca edite uma migração já aplicada; gere outra.
- **Vários campeonatos:** `inscricao`, `equipe` e `fase` têm `campeonato_id`; jogador, grupo, partida e evento pertencem pelo pai. Ids de texto novos (`novoId()`, 12 hex) são únicos entre campeonatos. `campeonato_id` tem default 1 só por compatibilidade com o código anterior (campeonato único) durante a transição; o código atual sempre informa.
- **Duplicar** copia configuração, fases, zonas, grupos e equipes (ids novos); elencos opcionais (pagamento zerado); nunca partidas, súmulas, pagamentos nem inscrições. Nasce em rascunho, com `duplicado_de`.
- **Escrita:** `atualizarCampeonato(id, alterar)` trava a linha do campeonato (`select … for update`), relê, aplica a mudança, recalcula o chaveamento, confere trava e consistência e regrava as tabelas filhas daquele campeonato numa transação. Ações concorrentes de dois admins são serializadas; erro em qualquer passo desfaz tudo. Volume esperado (~64 jogadores, ~20 partidas) torna a regravação inteira barata; se crescer muito, troque por escritas pontuais.
- **Segredos:** `DATABASE_URL` e `SESSAO_SEGREDO` só em `.env.local` e nas variáveis da Vercel. Nunca no Git, nem hashes de senha de contas reais (as contas iniciais foram inseridas uma vez no Neon por SQL fora do repositório).
- **Preview usa o banco de produção:** na Vercel, `DATABASE_URL` vale para production e preview, então o build de qualquer PR aplica as migrações dele no Neon de produção antes do merge. Toda migração precisa ser compatível com o código que está na `main`.


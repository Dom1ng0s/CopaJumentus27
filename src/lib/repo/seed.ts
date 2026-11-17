// DADOS DE EXEMPLO para a demonstracao a comissao.
// Os 8 nomes de time sao reais; capitaes e jogadores sao PLACEHOLDER inventados
// e devem ser substituidos pelo cadastro de verdade antes de qualquer sorteio oficial.
// Ao sair da demo, estes dados viram dados/elenco.json e dados/times.json (CLAUDE.md §4.2).

import type { Estrelas, Jogador, Posicao, Time } from '@/lib/domain/tipos';

interface LinhaSeed {
  nome: string;
  apelido?: string;
  posicao: Posicao;
  estrelas: Estrelas;
}

const CAPITAES: LinhaSeed[] = [
  { nome: 'Rodrigo Albuquerque', apelido: 'Digão', posicao: 'MEI', estrelas: 6 },
  { nome: 'Marcelo Tavares', apelido: 'Celo', posicao: 'ATA', estrelas: 5 },
  { nome: 'Fernando Quirino', apelido: 'Nando', posicao: 'ZAG', estrelas: 5 },
  { nome: 'Thiago Bastos', apelido: 'Thiagão', posicao: 'MEI', estrelas: 4 },
  { nome: 'Leandro Paiva', apelido: 'Léo', posicao: 'ATA', estrelas: 4 },
  { nome: 'Gustavo Rangel', apelido: 'Guto', posicao: 'ZAG', estrelas: 4 },
  { nome: 'Vinícius Sampaio', apelido: 'Vina', posicao: 'MEI', estrelas: 3 },
  { nome: 'Rafael Cordeiro', apelido: 'Rafa', posicao: 'ATA', estrelas: 3 },
];

const GOLEIROS: LinhaSeed[] = [
  { nome: 'Alexandre Bulhões', apelido: 'Xandão', posicao: 'GOL', estrelas: 5 },
  { nome: 'Júlio Peçanha', apelido: 'Juca', posicao: 'GOL', estrelas: 4 },
  { nome: 'Wagner Dantas', apelido: 'Waguinho', posicao: 'GOL', estrelas: 4 },
  { nome: 'Cláudio Bezerra', apelido: 'Cacá', posicao: 'GOL', estrelas: 3 },
  { nome: 'Emerson Vilela', apelido: 'Emerson', posicao: 'GOL', estrelas: 3 },
  { nome: 'Patrick Amorim', apelido: 'Pato', posicao: 'GOL', estrelas: 3 },
  { nome: 'Sidnei Barroso', apelido: 'Sid', posicao: 'GOL', estrelas: 2 },
  { nome: 'Henrique Vasques', apelido: 'Rique', posicao: 'GOL', estrelas: 2 },
];

const LINHA: LinhaSeed[] = [
  // 6 estrelas
  { nome: 'Douglas Maciel', apelido: 'Dodô', posicao: 'ATA', estrelas: 6 },
  { nome: 'Everton Nogueira', apelido: 'Tatu', posicao: 'MEI', estrelas: 6 },
  // 5 estrelas
  { nome: 'Bruno Capelli', apelido: 'Capa', posicao: 'ZAG', estrelas: 5 },
  { nome: 'Caio Ferraz', apelido: 'Caiozinho', posicao: 'ATA', estrelas: 5 },
  { nome: 'Igor Medrado', apelido: 'Igorzinho', posicao: 'MEI', estrelas: 5 },
  { nome: 'Luan Peixoto', apelido: 'Peixe', posicao: 'ZAG', estrelas: 5 },
  { nome: 'Matheus Aragão', apelido: 'Matheuzinho', posicao: 'ATA', estrelas: 5 },
  { nome: 'Otávio Brandão', apelido: 'Tavinho', posicao: 'MEI', estrelas: 5 },
  // 4 estrelas
  { nome: 'André Lustosa', apelido: 'Dedé', posicao: 'ZAG', estrelas: 4 },
  { nome: 'Carlos Henrique Sá', apelido: 'Cacau', posicao: 'ATA', estrelas: 4 },
  { nome: 'Diego Furtado', apelido: 'Didi', posicao: 'MEI', estrelas: 4 },
  { nome: 'Fábio Menezes', apelido: 'Fabinho', posicao: 'ZAG', estrelas: 4 },
  { nome: 'Guilherme Patriota', apelido: 'Gui', posicao: 'ATA', estrelas: 4 },
  { nome: 'Jonas Caldeira', apelido: 'Jonas', posicao: 'MEI', estrelas: 4 },
  { nome: 'Kleber Assunção', apelido: 'Kiko', posicao: 'ZAG', estrelas: 4 },
  { nome: 'Murilo Tanaka', apelido: 'Japa', posicao: 'ATA', estrelas: 4 },
  // 3 estrelas
  { nome: 'Nelson Siqueira', apelido: 'Nelsinho', posicao: 'MEI', estrelas: 3 },
  { nome: 'Osvaldo Brito', apelido: 'Vadinho', posicao: 'ZAG', estrelas: 3 },
  { nome: 'Pedro Ivo Carvalho', apelido: 'Pedrinho', posicao: 'ATA', estrelas: 3 },
  { nome: 'Renan Guedes', apelido: 'Renanzinho', posicao: 'MEI', estrelas: 3 },
  { nome: 'Samuel Lacerda', apelido: 'Samuca', posicao: 'ZAG', estrelas: 3 },
  { nome: 'Tales Varejão', apelido: 'Talinho', posicao: 'ATA', estrelas: 3 },
  { nome: 'Ubirajara Pontes', apelido: 'Bira', posicao: 'MEI', estrelas: 3 },
  { nome: 'Válter Nunes', apelido: 'Val', posicao: 'ZAG', estrelas: 3 },
  { nome: 'Wesley Portela', apelido: 'Wes', posicao: 'ATA', estrelas: 3 },
  { nome: 'Yuri Chagas', apelido: 'Yuri', posicao: 'MEI', estrelas: 3 },
  // 2 estrelas
  { nome: 'Adilson Ramalho', apelido: 'Dilso', posicao: 'ZAG', estrelas: 2 },
  { nome: 'Breno Falcão', apelido: 'Brenão', posicao: 'ATA', estrelas: 2 },
  { nome: 'César Mourão', apelido: 'Cesinha', posicao: 'MEI', estrelas: 2 },
  { nome: 'Davi Antunes', apelido: 'Davizinho', posicao: 'ZAG', estrelas: 2 },
  { nome: 'Elias Trindade', apelido: 'Lili', posicao: 'ATA', estrelas: 2 },
  { nome: 'Flávio Rezende', apelido: 'Flavinho', posicao: 'MEI', estrelas: 2 },
  { nome: 'Geraldo Pimentel', apelido: 'Geraldinho', posicao: 'ZAG', estrelas: 2 },
  { nome: 'Hélio Macedo', apelido: 'Helinho', posicao: 'ATA', estrelas: 2 },
  // 1 estrela
  { nome: 'Ivan Dourado', apelido: 'Ivanzinho', posicao: 'MEI', estrelas: 1 },
  { nome: 'Joel Aparecido', apelido: 'Joelzinho', posicao: 'ZAG', estrelas: 1 },
  { nome: 'Lucas Botelho', apelido: 'Luquinhas', posicao: 'ATA', estrelas: 1 },
  { nome: 'Norberto Faria', apelido: 'Beto', posicao: 'MEI', estrelas: 1 },
  { nome: 'Plínio Gusmão', apelido: 'Pliu', posicao: 'ZAG', estrelas: 1 },
  { nome: 'Quirino Salles', apelido: 'Qui', posicao: 'ATA', estrelas: 1 },
];

/** Os 8 times da edicao, definidos pela comissao. */
export const NOMES_TIMES = [
  'Inter Miami',
  'LA Galaxy',
  'Atlanta United',
  'LA FC',
  'Seattle Sounders',
  'New York City FC',
  'Orlando City',
  'Houston Dynamo',
] as const;

function montar(prefixo: string, seeds: LinhaSeed[], ehCapitao: boolean): Jogador[] {
  return seeds.map((s, i) => ({
    id: `${prefixo}${String(i + 1).padStart(2, '0')}`,
    nome: s.nome,
    apelido: s.apelido,
    posicao: s.posicao,
    estrelas: s.estrelas,
    ehCapitao,
  }));
}

export const JOGADORES_EXEMPLO: Jogador[] = [
  ...montar('c', CAPITAES, true),
  ...montar('g', GOLEIROS, false),
  ...montar('j', LINHA, false),
];

export const TIMES_EXEMPLO: Time[] = NOMES_TIMES.map((nome, i) => ({
  id: `t${i + 1}`,
  nome,
  capitaoId: `c${String(i + 1).padStart(2, '0')}`,
}));

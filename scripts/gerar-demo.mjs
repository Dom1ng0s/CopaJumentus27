// Gera dados/campeonato.json com um campeonato de EXEMPLO (nomes fictícios),
// para testar as telas sem cadastrar nada. Uso: npm run demo
// Atenção: substitui o arquivo atual. Não rode em produção.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MARCAS = [
  ['inter-miami', 'Inter Miami', 'MIA', '#EE7FA6', '#231F20', '#231F20'],
  ['la-galaxy', 'LA Galaxy', 'LAG', '#00245D', '#FFD200', '#FFFFFF'],
  ['lafc', 'LAFC', 'LAFC', '#000000', '#C39E6D', '#FFFFFF'],
  ['seattle-sounders', 'Seattle Sounders', 'SEA', '#5CD27F', '#2A57C6', '#0B1F3F'],
  ['atlanta-united', 'Atlanta United', 'ATL', '#C22B3A', '#221F1F', '#FFFFFF'],
  ['new-york-city-fc', 'New York City FC', 'NYC', '#212E4B', '#40527D', '#FFFFFF'],
  ['houston-dynamo', 'Houston Dynamo', 'HOU', '#FF6B00', '#101820', '#101820'],
  ['orlando-city', 'Orlando City', 'ORL', '#633492', '#FDE192', '#FFFFFF'],
];
const NOMES = 'Digão Celo Nando Thiagão Léo Guto Vina Rafa Bruno Caio Dudu Edu Fabinho Gabi Hugo Igor Juca Kiko Lucas Marcão Nino Otávio Paulinho Queiroz Renan Samuca Tico Uriel Vavá Wesley Xandi Yuri Zeca Alemão Biel Cadu Danilo Enzo Fred Gil Heitor Ivan Jota Kaká Lipe Mateus Neto Orlando Pipo Quico Rô Sandro Tuta Vitão Will Zinho Bebeto Cris Davi Elias Fumaça Gordo Jeferson Magrão'.split(' ');
const POSICOES = ['GOL', 'ZAG', 'ZAG', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'];
const NUMEROS = [1, 3, 4, 5, 8, 10, 9, 11];
const HORARIOS = ['08:00', '08:40', '09:20', '10:00', '10:40', '11:20', '13:00', '13:40', '14:20', '15:00', '15:40', '16:20'];

// Aleatório determinístico: o exemplo sai sempre igual.
let semente = 7;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const escolher = (lista) => lista[Math.floor(rnd() * lista.length)];

const equipes = [];
const jogadores = [];
MARCAS.forEach(([id, nome, sigla, corPrimaria, corSecundaria, corTexto], t) => {
  const equipe = { id, nome, sigla, escudo: `/imagens/escudos/${id}.webp`, corPrimaria, corSecundaria, corTexto };
  POSICOES.forEach((posicao, i) => {
    const j = { id: `p${t * 8 + i}`, nome: NOMES[t * 8 + i], equipeId: id, posicao, numero: NUMEROS[i], pago: rnd() < 0.7 };
    jogadores.push(j);
    if (i === 3) equipe.capitaoId = j.id;
  });
  equipes.push(equipe);
});

const ids = MARCAS.map((m) => m[0]).sort(() => rnd() - 0.5);
const grupos = [
  { id: 'gA', faseId: 'grupos', nome: 'Grupo A', equipeIds: ids.slice(0, 4) },
  { id: 'gB', faseId: 'grupos', nome: 'Grupo B', equipeIds: ids.slice(4) },
];
const RODADAS = [
  [[0, 3], [1, 2]],
  [[3, 2], [0, 1]],
  [[1, 3], [2, 0]],
];

const partidas = [];
let n = 0;
RODADAS.forEach((rodada, r) => {
  for (const g of grupos) {
    for (const [a, b] of rodada) {
      const status = n < 9 ? 'encerrada' : n === 9 ? 'ao-vivo' : 'agendada';
      const p = {
        id: `j${n + 1}`,
        faseId: 'grupos',
        grupoId: g.id,
        rotulo: `${g.nome} · Rodada ${r + 1}`,
        mandanteId: g.equipeIds[a],
        visitanteId: g.equipeIds[b],
        dataHora: `2027-01-16T${HORARIOS[n]}`,
        local: n % 2 === 0 ? 'Campo 1' : 'Campo 2',
        status,
        golsMandante: 0,
        golsVisitante: 0,
        eventos: [],
      };
      if (status !== 'agendada') {
        for (const [lado, equipeId] of [['m', p.mandanteId], ['v', p.visitanteId]]) {
          const linha = jogadores.filter((j) => j.equipeId === equipeId && j.posicao !== 'GOL');
          const gols = status === 'encerrada' ? escolher([0, 1, 1, 2, 2, 3]) : escolher([0, 1]);
          for (let k = 0; k < gols; k++) {
            const autor = escolher(linha);
            const assist = escolher([...linha.filter((j) => j !== autor), null]);
            p.eventos.push({ id: `g${n}${lado}${k}`, tipo: 'gol', jogadorId: autor.id, equipeId, minuto: 1 + Math.floor(rnd() * 40), ...(assist ? { assistenciaId: assist.id } : {}) });
            if (lado === 'm') p.golsMandante += 1;
            else p.golsVisitante += 1;
          }
          if (rnd() < 0.6) {
            p.eventos.push({ id: `a${n}${lado}`, tipo: 'amarelo', jogadorId: escolher(linha).id, equipeId, minuto: 1 + Math.floor(rnd() * 40) });
          }
        }
      }
      partidas.push(p);
      n += 1;
    }
  }
});
// Um vermelho para mostrar a suspensão.
const zagueiro = jogadores.find((j) => j.equipeId === partidas[6].mandanteId && j.posicao === 'ZAG');
partidas[6].eventos.push({ id: 'vermelho', tipo: 'vermelho', jogadorId: zagueiro.id, equipeId: zagueiro.equipeId, minuto: 33 });

partidas.push(
  { id: 'sf1', faseId: 'mata-mata', rotulo: 'Semifinal 1', mandanteId: grupos[0].equipeIds[0], visitanteId: grupos[1].equipeIds[1], dataHora: '2027-01-17T09:00', local: 'Campo 1', status: 'agendada', golsMandante: 0, golsVisitante: 0, eventos: [] },
  { id: 'sf2', faseId: 'mata-mata', rotulo: 'Semifinal 2', mandanteId: grupos[1].equipeIds[0], visitanteId: grupos[0].equipeIds[1], dataHora: '2027-01-17T09:40', local: 'Campo 1', status: 'agendada', golsMandante: 0, golsVisitante: 0, eventos: [] },
);

const campeonato = {
  versao: 1,
  nome: 'Copa Jumentus 2027',
  subtitulo: 'Edição MLS',
  inicio: '2027-01-16',
  fim: '2027-01-17',
  local: 'Local a definir',
  pontuacao: { vitoria: 3, empate: 1, derrota: 0 },
  criterios: ['pontos', 'vitorias', 'saldo', 'golsPro', 'golsContra', 'confronto'],
  valorInscricao: 78.5,
  equipes,
  jogadores,
  fases: [
    { id: 'grupos', nome: 'Fase de grupos', tipo: 'grupos' },
    { id: 'mata-mata', nome: 'Mata-mata', tipo: 'mata-mata' },
  ],
  grupos,
  partidas,
  sorteioOficializadoEm: '2027-01-10T20:00:00Z',
};

const destino = path.join(process.cwd(), 'dados', 'campeonato.json');
await mkdir(path.dirname(destino), { recursive: true });
await writeFile(destino, JSON.stringify(campeonato, null, 2), 'utf8');
// O banco local só importa dados/campeonato.json quando está vazio: apaga o PGlite
// para o exemplo entrar no próximo `npm run dev`. Nunca mexe num banco remoto.
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL definida: o banco remoto não foi alterado. O exemplo só entra num banco vazio.');
} else {
  await rm(path.join(process.cwd(), 'dados', 'pglite'), { recursive: true, force: true });
}
console.log(`Exemplo gravado em dados/campeonato.json: ${jogadores.length} jogadores, ${partidas.length} partidas.`);
console.log('Reinicie o npm run dev para carregar no banco local.');

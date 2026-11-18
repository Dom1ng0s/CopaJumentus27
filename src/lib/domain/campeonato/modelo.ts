// Modelo oficial "Copa Jumentus · 8 times · 34 jogos" (CLAUDE.md §8.6).
// Grupo Único em turno único (28 jogos, 7 rodadas, 2 dias, um campo) e mata-mata
// com repescagem (jogos 29 a 34). Os participantes vêm das origens (chaveamento.ts).

import { shuffle, fonteCrypto, type FonteAleatoria } from '@/lib/domain/random';
import { partidaTravada } from './chaveamento';
import type { Campeonato, Fase, Origem, Partida, Zona } from './tipos';

/**
 * Confrontos de Berger enviados pelo operador, reordenados dentro de cada rodada
 * para dar isonomia de descanso (decisão do operador, 17/11/2026): no mesmo dia,
 * todo time descansa pelo menos 2 jogos entre uma partida e outra, nenhum tem
 * mais de 2 descansos curtos (de 2 jogos) e a maior espera é de 5 jogos.
 * Entre as 8.192 ordens que garantem o descanso mínimo de 2, é a mais equilibrada.
 * [rodada, dia, mandante, visitante].
 */
export const TABELA_GRUPO_UNICO: ReadonlyArray<readonly [number, number, number, number]> = [
  [1, 1, 1, 8], [1, 1, 4, 5], [1, 1, 3, 6], [1, 1, 2, 7],
  [2, 1, 8, 5], [2, 1, 6, 4], [2, 1, 1, 2], [2, 1, 7, 3],
  [3, 1, 5, 6], [3, 1, 2, 8], [3, 1, 3, 1], [3, 1, 4, 7],
  [4, 1, 8, 6], [4, 1, 2, 3], [4, 1, 7, 5], [4, 1, 1, 4],
  [5, 2, 3, 8], [5, 2, 6, 7], [5, 2, 4, 2], [5, 2, 5, 1],
  [6, 2, 8, 7], [6, 2, 3, 4], [6, 2, 1, 6], [6, 2, 2, 5],
  [7, 2, 4, 8], [7, 2, 7, 1], [7, 2, 5, 3], [7, 2, 6, 2],
];

export const ZONAS_GRUPO_UNICO: readonly Zona[] = [
  { de: 1, ate: 2, zona: 'semifinal' },
  { de: 3, ate: 6, zona: 'repescagem' },
  { de: 7, ate: 8, zona: 'eliminado' },
];

/** Mata-mata do dia 2: [número, rótulo, origem do mandante, origem do visitante]. */
function chaveMataMata(faseGrupo: string): Array<[number, string, Origem, Origem]> {
  const pos = (posicao: number): Origem => ({ tipo: 'posicao', faseId: faseGrupo, posicao });
  return [
    [29, 'Repescagem 1', pos(3), pos(6)],
    [30, 'Repescagem 2', pos(4), pos(5)],
    // Semifinal 1 recebe o vencedor da J29 (jogado antes) e a Semifinal 2 o da J30:
    // os dois vencedores da repescagem descansam o mesmo tempo (comissão, 18/11/2026).
    [31, 'Semifinal 1', pos(2), { tipo: 'vencedor', partidaNumero: 29 }],
    [32, 'Semifinal 2', pos(1), { tipo: 'vencedor', partidaNumero: 30 }],
    [33, 'Disputa de 3º lugar', { tipo: 'perdedor', partidaNumero: 31 }, { tipo: 'perdedor', partidaNumero: 32 }],
    [34, 'Final', { tipo: 'vencedor', partidaNumero: 31 }, { tipo: 'vencedor', partidaNumero: 32 }],
  ];
}

/** Etapas do mata-mata do modelo, na ordem em que acontecem (usadas na programação e na chave). */
export const ETAPAS_MATA_MATA: ReadonlyArray<{ titulo: string; jogos: readonly number[] }> = [
  { titulo: 'Repescagem', jogos: [29, 30] },
  { titulo: 'Semifinais', jogos: [31, 32] },
  { titulo: 'Finais', jogos: [33, 34] },
];

export const TOTAL_EQUIPES_MODELO = 8;
/** O modelo acontece em 2 dias (rodadas 1–4 no dia 1; 5–7 e mata-mata no dia 2). */
export const DIAS_DO_MODELO = 2;

/**
 * Troca fases, grupos e partidas do campeonato pelos do modelo. Só sem partidas
 * (nunca apaga jogo). `novoId` gera os ids, para não colidir entre campeonatos.
 */
export function aplicarModelo(c: Campeonato, novoId: () => string): void {
  if (c.partidas.length > 0) throw new Error('O modelo só pode ser aplicado a um campeonato sem partidas.');
  if (c.equipes.length !== TOTAL_EQUIPES_MODELO) {
    throw new Error(`O modelo oficial precisa de exatamente ${TOTAL_EQUIPES_MODELO} equipes (há ${c.equipes.length}).`);
  }
  const grupoUnico: Fase = { id: novoId(), nome: 'Grupo Único', tipo: 'grupos', zonas: ZONAS_GRUPO_UNICO.map((z) => ({ ...z })) };
  const mataMata: Fase = { id: novoId(), nome: 'Mata-mata', tipo: 'mata-mata' };
  const grupoId = novoId();
  c.modelo = 'copa-jumentus-8';
  c.fases = [grupoUnico, mataMata];
  c.grupos = [{ id: grupoId, faseId: grupoUnico.id, nome: 'Grupo Único', equipeIds: c.equipes.map((e) => e.id) }];

  const base = (numero: number, dia: number): Pick<Partida, 'id' | 'numero' | 'dia' | 'status' | 'golsMandante' | 'golsVisitante' | 'eventos'> => ({
    id: novoId(),
    numero,
    dia,
    status: 'agendada',
    golsMandante: 0,
    golsVisitante: 0,
    eventos: [],
  });

  c.partidas = TABELA_GRUPO_UNICO.map(([rodada, dia, m, v], i) => ({
    ...base(i + 1, dia),
    faseId: grupoUnico.id,
    grupoId,
    rodada,
    rotulo: `Rodada ${rodada}`,
    origemMandante: { tipo: 'tabela', numero: m },
    origemVisitante: { tipo: 'tabela', numero: v },
  }));
  for (const [numero, rotulo, om, ov] of chaveMataMata(grupoUnico.id)) {
    c.partidas.push({ ...base(numero, 2), faseId: mataMata.id, rotulo, origemMandante: om, origemVisitante: ov });
  }
}

/**
 * Sorteia T1 a T8 entre as equipes (random.ts). Só antes de qualquer partida
 * começar; refazer é permitido até lá.
 */
export function sortearNumerosTabela(c: Campeonato, fonte: FonteAleatoria = fonteCrypto): void {
  if (c.modelo !== 'copa-jumentus-8') throw new Error('O sorteio de T1 a T8 é do modelo oficial.');
  if (c.partidas.some(partidaTravada)) {
    throw new Error('Alguma partida já começou: os números da tabela não podem mais ser sorteados.');
  }
  shuffle(c.equipes, fonte).forEach((e, i) => {
    const equipe = c.equipes.find((x) => x.id === e.id)!;
    equipe.numeroTabela = i + 1;
  });
}

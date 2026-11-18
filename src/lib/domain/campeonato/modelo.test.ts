import { describe, expect, it } from 'vitest';
import { aplicarChaveamento, descreverOrigem, podio, problemaDeConsistencia, resolverChaveamento, violacaoDaTrava } from './chaveamento';
import { calcularClassificacao, empatesPendentes } from './classificacao';
import { TABELA_GRUPO_UNICO, aplicarModelo, sortearNumerosTabela } from './modelo';
import { artilharia, goleiros, penalidades } from './rankings';
import { calcularSuspensoes } from './suspensoes';
import { CRITERIOS_PADRAO, type Campeonato, type Criterio, type EventoPartida, type Partida } from './tipos';

const PONTOS = { vitoria: 3, empate: 1, derrota: 0 };
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function campeonato(): Campeonato {
  let n = 0;
  const c: Campeonato = {
    versao: 1,
    id: 1,
    slug: 'teste',
    nome: 'Teste',
    status: 'andamento',
    modelo: 'livre',
    pontuacao: PONTOS,
    criterios: [...CRITERIOS_PADRAO],
    valorInscricao: 0,
    equipes: IDS.map((id) => ({ id, nome: id.toUpperCase(), sigla: id, corPrimaria: '#000', corSecundaria: '#111', corTexto: '#fff' })),
    jogadores: IDS.flatMap((e) => [
      { id: `${e}-gol`, nome: `Goleiro ${e}`, equipeId: e, posicao: 'GOL' as const, pago: false },
      { id: `${e}-ata`, nome: `Atacante ${e}`, equipeId: e, posicao: 'ATA' as const, pago: false },
    ]),
    fases: [],
    grupos: [],
    partidas: [],
  };
  aplicarModelo(c, () => `id${++n}`);
  return c;
}

/** T1 = a, T2 = b, ... (em vez do sorteio). */
function comTabela(c: Campeonato): Campeonato {
  c.equipes.forEach((e, i) => (e.numeroTabela = i + 1));
  return aplicarChaveamento(c);
}

function jogo(c: Campeonato, numero: number): Partida {
  return c.partidas.find((p) => p.numero === numero)!;
}

/** Número do jogo TmxTv da 1ª fase, para os testes não dependerem da ordem da tabela. */
function numeroDe(m: number, v: number): number {
  return TABELA_GRUPO_UNICO.findIndex(([, , a, b]) => a === m && b === v) + 1;
}

/** Encerra o jogo com o placar e recalcula o chaveamento (como o repositório faz ao gravar). */
function jogar(c: Campeonato, numero: number, gm: number, gv: number, pen?: [number, number], eventos: EventoPartida[] = []): void {
  const p = jogo(c, numero);
  Object.assign(p, { status: 'encerrada', golsMandante: gm, golsVisitante: gv, eventos });
  if (pen) [p.penaltisMandante, p.penaltisVisitante] = pen;
  aplicarChaveamento(c);
}

/** Grupo em que a equipe de índice menor sempre vence por 1 a 0: a, b, ..., h. */
function grupoEmOrdem(c: Campeonato): void {
  for (let n = 1; n <= 28; n++) {
    const p = jogo(c, n);
    const m = IDS.indexOf(p.mandanteId!);
    const v = IDS.indexOf(p.visitanteId!);
    jogar(c, n, m < v ? 1 : 0, m < v ? 0 : 1);
  }
}

function classificacaoDoGrupo(c: Campeonato) {
  const fase = c.fases[0];
  return calcularClassificacao(c.grupos[0].equipeIds, c.partidas.filter((p) => p.faseId === fase.id), c.pontuacao, c.criterios, { desempates: fase.desempates });
}

describe('modelo Copa Jumentus · 8 times · 34 jogos', () => {
  it('cria 34 jogos numerados: 28 do Grupo Único em 7 rodadas e 6 de mata-mata no dia 2', () => {
    const c = campeonato();
    expect(c.modelo).toBe('copa-jumentus-8');
    expect(c.partidas.map((p) => p.numero)).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));
    expect(c.fases.map((f) => [f.nome, f.tipo])).toEqual([['Grupo Único', 'grupos'], ['Mata-mata', 'mata-mata']]);
    expect(c.fases[0].zonas).toEqual([
      { de: 1, ate: 2, zona: 'semifinal' },
      { de: 3, ate: 6, zona: 'repescagem' },
      { de: 7, ate: 8, zona: 'eliminado' },
    ]);
    expect(c.partidas.filter((p) => p.dia === 1).map((p) => p.numero)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(new Set(c.partidas.slice(0, 28).map((p) => p.rodada))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    expect(c.partidas.slice(28).map((p) => p.rotulo)).toEqual(['Repescagem 1', 'Repescagem 2', 'Semifinal 1', 'Semifinal 2', 'Disputa de 3º lugar', 'Final']);
  });

  it('tabela: todos se enfrentam uma vez, mantendo a rodada e o mando de Berger', () => {
    const pares = new Set(TABELA_GRUPO_UNICO.map(([, , m, v]) => [m, v].sort().join('x')));
    expect(pares.size).toBe(28);
    const berger = [
      ['1x8', '2x7', '3x6', '4x5'], ['7x3', '8x5', '6x4', '1x2'], ['4x7', '2x8', '3x1', '5x6'], ['1x4', '8x6', '7x5', '2x3'],
      ['5x1', '3x8', '4x2', '6x7'], ['2x5', '8x7', '1x6', '3x4'], ['6x2', '4x8', '5x3', '7x1'],
    ];
    berger.forEach((jogos, r) => {
      const daRodada = TABELA_GRUPO_UNICO.filter(([rodada]) => rodada === r + 1).map(([, , m, v]) => `${m}x${v}`);
      expect([...daRodada].sort()).toEqual([...jogos].sort());
    });
    expect(TABELA_GRUPO_UNICO.map(([, dia]) => dia)).toEqual([...Array(16).fill(1), ...Array(12).fill(2)]);
  });

  it('tabela: isonomia de descanso na 1ª fase', () => {
    const descansos = new Map<number, number[]>();
    for (let t = 1; t <= 8; t++) {
      const jogos = TABELA_GRUPO_UNICO.flatMap(([, dia, m, v], i) => (m === t || v === t ? [{ i, dia }] : []));
      descansos.set(t, jogos.slice(1).flatMap((j, k) => (j.dia === jogos[k].dia ? [j.i - jogos[k].i - 1] : [])));
    }
    for (const d of descansos.values()) {
      expect(Math.min(...d)).toBeGreaterThanOrEqual(2); // nunca dois jogos seguidos, nem com um só de intervalo
      expect(Math.max(...d)).toBeLessThanOrEqual(5); // sem esperas longas
      expect(d.filter((x) => x === 2).length).toBeLessThanOrEqual(2); // descansos curtos repartidos
    }
  });

  it('sem sorteio de T1–T8, ninguém joga; jogos 29–34 aparecem pela origem', () => {
    const c = aplicarChaveamento(campeonato());
    expect(c.partidas.every((p) => !p.mandanteId && !p.visitanteId)).toBe(true);
    expect(descreverOrigem(jogo(c, 29).origemMandante!, c)).toBe('3º do Grupo Único');
    expect(descreverOrigem(jogo(c, 31).origemVisitante!, c)).toBe('Vencedor J29');
    expect(descreverOrigem(jogo(c, 1).origemMandante!, c)).toBe('T1');
  });

  it('sorteio de T1–T8 numera as 8 equipes e pode ser refeito até alguma partida começar', () => {
    const c = campeonato();
    let x = 0.123;
    sortearNumerosTabela(c, () => (x = (x * 9301 + 49297) % 233280 / 233280));
    expect(c.equipes.map((e) => e.numeroTabela).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    aplicarChaveamento(c);
    const t1 = c.equipes.find((e) => e.numeroTabela === 1)!.id;
    const t8 = c.equipes.find((e) => e.numeroTabela === 8)!.id;
    expect([jogo(c, 1).mandanteId, jogo(c, 1).visitanteId]).toEqual([t1, t8]);
    sortearNumerosTabela(c);
    jogo(c, 1).status = 'ao-vivo';
    expect(() => sortearNumerosTabela(c)).toThrow(/já começou/);
  });

  it('as 8 posições definem o mata-mata; pênaltis decidem; pódio na final', () => {
    const c = comTabela(campeonato());
    grupoEmOrdem(c);
    expect(classificacaoDoGrupo(c).map((l) => [l.posicao, l.equipeId])).toEqual(IDS.map((id, i) => [i + 1, id]));
    expect([jogo(c, 29).mandanteId, jogo(c, 29).visitanteId]).toEqual(['c', 'f']);
    expect([jogo(c, 30).mandanteId, jogo(c, 30).visitanteId]).toEqual(['d', 'e']);
    // Semifinal 1: 2º x vencedor J29; Semifinal 2: 1º x vencedor J30 (comissão, 18/11/2026).
    expect(jogo(c, 31).mandanteId).toBe('b');
    expect(jogo(c, 31).visitanteId).toBeUndefined();
    expect(jogo(c, 32).mandanteId).toBe('a');

    jogar(c, 29, 0, 2); // f elimina c
    jogar(c, 30, 1, 1, [3, 4]); // empate, e vence nos pênaltis
    expect([jogo(c, 31).mandanteId, jogo(c, 31).visitanteId]).toEqual(['b', 'f']);
    expect([jogo(c, 32).mandanteId, jogo(c, 32).visitanteId]).toEqual(['a', 'e']);
    jogar(c, 31, 2, 0);
    jogar(c, 32, 0, 0, [5, 4]);
    expect([jogo(c, 33).mandanteId, jogo(c, 33).visitanteId]).toEqual(['f', 'e']);
    expect([jogo(c, 34).mandanteId, jogo(c, 34).visitanteId]).toEqual(['b', 'a']);
    expect(podio(c)).toBeNull();
    jogar(c, 33, 1, 0);
    jogar(c, 34, 1, 2);
    expect(podio(c)).toEqual({ primeiro: 'a', segundo: 'b', terceiro: 'f' });
    expect(problemaDeConsistencia(c)).toBeNull();
  });

  it('posições só valem com os 28 jogos do grupo encerrados', () => {
    const c = comTabela(campeonato());
    grupoEmOrdem(c);
    jogo(c, 28).status = 'ao-vivo';
    aplicarChaveamento(c);
    expect(jogo(c, 29).mandanteId).toBeUndefined();
    expect(jogo(c, 31).mandanteId).toBeUndefined();
  });

  it('jogo eliminatório empatado não encerra sem pênaltis com vencedor', () => {
    const c = comTabela(campeonato());
    grupoEmOrdem(c);
    jogar(c, 29, 1, 1);
    expect(problemaDeConsistencia(c)).toMatch(/Jogo 29.*pênaltis/);
    jogar(c, 29, 1, 1, [2, 2]);
    expect(problemaDeConsistencia(c)).toMatch(/pênaltis/);
    jogar(c, 29, 1, 1, [2, 3]);
    expect(problemaDeConsistencia(c)).toBeNull();
    expect(jogo(c, 31).visitanteId).toBe('f');
  });

  it('partida sem os dois participantes não pode começar', () => {
    const c = comTabela(campeonato());
    jogo(c, 31).status = 'ao-vivo';
    expect(problemaDeConsistencia(c)).toMatch(/Jogo 31.*não pode começar/);
  });

  it('correção depois do encerramento recalcula o chaveamento enquanto nada dependente começou', () => {
    const c = comTabela(campeonato());
    grupoEmOrdem(c);
    const antes = structuredClone(c);
    // T3 x T8 = c x h: h vence por 5 a 0. c cai de 3º para 4º.
    const n = numeroDe(3, 8);
    expect([jogo(c, n).mandanteId, jogo(c, n).visitanteId]).toEqual(['c', 'h']);
    jogar(c, n, 0, 5);
    expect(violacaoDaTrava(antes, c)).toBeNull();
    expect([jogo(c, 29).mandanteId, jogo(c, 30).mandanteId]).toEqual(['d', 'c']);
  });

  it('trava: correção que muda participantes de jogo iniciado ou com súmula é recusada com o número do jogo', () => {
    const c = comTabela(campeonato());
    grupoEmOrdem(c);
    jogo(c, 29).status = 'ao-vivo';
    const antes = structuredClone(c);
    const depois = structuredClone(c);
    Object.assign(jogo(depois, numeroDe(3, 8)), { golsMandante: 0, golsVisitante: 5 });
    aplicarChaveamento(depois);
    expect(violacaoDaTrava(antes, depois)).toMatch(/Jogo 29 \(Repescagem 1\)/);

    // Correção que não mexe nas posições passa (a continua 1º).
    const leve = structuredClone(c);
    Object.assign(jogo(leve, 1), { golsMandante: 3, golsVisitante: 0 });
    aplicarChaveamento(leve);
    expect(violacaoDaTrava(antes, leve)).toBeNull();
  });

  it('trava também vale para súmula preenchida em jogo ainda agendado e para T1–T8', () => {
    const c = comTabela(campeonato());
    const n = numeroDe(7, 3);
    jogo(c, n).eventos.push({ id: 'e1', tipo: 'amarelo', jogadorId: 'g-ata', equipeId: 'g' });
    const antes = structuredClone(c);
    const depois = structuredClone(c);
    // Troca T1 e T7: o jogo T7 x T3 já tem cartão na súmula.
    [depois.equipes[0].numeroTabela, depois.equipes[6].numeroTabela] = [7, 1];
    aplicarChaveamento(depois);
    expect(violacaoDaTrava(antes, depois)).toMatch(new RegExp(`Jogo ${n} \\(Rodada 2\\)`));
  });

  it('suspensão segue a ordem dos jogos do modelo (número), não a de cadastro', () => {
    const c = comTabela(campeonato());
    // T7 = g joga T2xT7 e, em seguida, T7xT3. Vermelho no primeiro: cumpre no seguinte.
    const [primeiro, seguinte] = [numeroDe(2, 7), numeroDe(7, 3)];
    expect(primeiro).toBeLessThan(seguinte);
    jogar(c, primeiro, 0, 0, undefined, [{ id: 'v', tipo: 'vermelho', jogadorId: 'g-ata', equipeId: 'g' }]);
    c.partidas.reverse();
    const s1 = calcularSuspensoes(c.partidas, new Map(c.jogadores.map((j) => [j.id, j.equipeId])));
    expect(s1.get('g-ata')?.suspenso).toBe(true);
    jogar(c, seguinte, 0, 0);
    const s2 = calcularSuspensoes(c.partidas, new Map(c.jogadores.map((j) => [j.id, j.equipeId])));
    expect(s2.get('g-ata')).toMatchObject({ suspenso: false, cumpridas: [jogo(c, seguinte).id] });
  });
});

// ---------- desempate ----------

let seq = 0;
function partida(m: string, v: string, gm: number, gv: number, eventos: EventoPartida[] = []): Partida {
  seq += 1;
  return { id: `p${seq}`, faseId: 'f', mandanteId: m, visitanteId: v, golsMandante: gm, golsVisitante: gv, status: 'encerrada', eventos };
}
const ordem = (equipes: string[], jogos: Partida[], criterios: readonly Criterio[] = CRITERIOS_PADRAO, desempates?: string[][]) =>
  calcularClassificacao(equipes, jogos, PONTOS, criterios, { desempates });
const ids = (t: ReturnType<typeof ordem>) => t.map((l) => l.equipeId);
const cartao = (tipo: 'amarelo' | 'vermelho', equipeId: string): EventoPartida => ({ id: `c${++seq}`, tipo, jogadorId: `${equipeId}-1`, equipeId });

describe('desempate da 1ª fase', () => {
  it('pontos, depois vitórias', () => {
    // A: 1V 0E (3 pts). B: 0V 3E (3 pts). Vitórias desempatam: A na frente.
    const jogos = [partida('A', 'X', 1, 0), partida('A', 'Y', 0, 1), partida('B', 'X', 0, 0), partida('B', 'Y', 0, 0), partida('B', 'Z', 0, 0)];
    const t = ordem(['B', 'A', 'X', 'Y', 'Z'], jogos);
    expect(t.find((l) => l.equipeId === 'A')?.pontos).toBe(t.find((l) => l.equipeId === 'B')?.pontos);
    expect(ids(t).filter((id) => id === 'A' || id === 'B')).toEqual(['A', 'B']);
  });

  it('saldo, depois gols marcados, depois gols sofridos (menos é melhor)', () => {
    expect(ids(ordem(['A', 'B', 'X'], [partida('A', 'X', 1, 0), partida('B', 'X', 3, 0)])).slice(0, 2)).toEqual(['B', 'A']);
    expect(ids(ordem(['A', 'B', 'X', 'Y'], [partida('A', 'X', 1, 0), partida('B', 'Y', 3, 2)])).slice(0, 2)).toEqual(['B', 'A']);
    // Sem gols marcados no critério: saldo igual, A sofreu menos.
    const so = ['pontos', 'saldo', 'golsContra'] as Criterio[];
    expect(ids(ordem(['B', 'A', 'X', 'Y'], [partida('A', 'X', 1, 0), partida('B', 'Y', 3, 2)], so)).slice(0, 2)).toEqual(['A', 'B']);
  });

  it('confronto direto com 2 equipes: quem venceu o jogo entre elas', () => {
    // A e B: 3 pontos, 1 vitória, 1 gol marcado e 1 sofrido cada; B venceu o confronto.
    const jogos = [partida('A', 'B', 0, 1), partida('A', 'X', 1, 0), partida('X', 'B', 1, 0), partida('X', 'Y', 0, 3)];
    expect(ids(ordem(['A', 'B', 'X', 'Y'], jogos)).filter((id) => id === 'A' || id === 'B')).toEqual(['B', 'A']);
  });

  it('confronto direto com 3 empatados: minitabela só com os jogos entre eles', () => {
    // A, B e C empatam em tudo no geral. Entre eles: A 4 pts, B 3, C 1.
    // A comparação par a par antiga podia dar ciclo; a minitabela não.
    // Entre eles: A vence B, B vence C, C empata com A. Contra X, cada um compensa.
    const jogos = [
      partida('A', 'B', 1, 0), partida('B', 'C', 1, 0), partida('C', 'A', 0, 0),
      partida('A', 'X', 0, 1), partida('B', 'X', 0, 0), partida('C', 'X', 1, 0),
      partida('X', 'Y', 0, 3), // tira X do empate (saldo)
    ];
    const t = ordem(['C', 'B', 'A', 'X', 'Y'], jogos);
    const abc = t.filter((l) => ['A', 'B', 'C'].includes(l.equipeId));
    expect(new Set(abc.map((l) => l.pontos)).size).toBe(1);
    expect(new Set(abc.map((l) => l.saldo)).size).toBe(1);
    expect(new Set(abc.map((l) => l.golsPro)).size).toBe(1);
    expect(ids(t).filter((id) => 'ABC'.includes(id))).toEqual(['A', 'B', 'C']);
  });

  it('minitabela usa pontos e depois saldo entre os empatados; o que segue empatado vai ao critério seguinte', () => {
    // A, B e C com 6 pontos no geral. Na minitabela, A tem 6; B e C têm 1 ponto,
    // mas B perdeu de A por 1 e C por 3: B à frente pelo saldo entre eles,
    // mesmo B tendo cartão (cartões só entram se a minitabela empatar).
    const so: Criterio[] = ['pontos', 'confronto', 'cartoes'];
    const jogos = [
      partida('A', 'B', 1, 0), partida('A', 'C', 3, 0), partida('B', 'C', 0, 0),
      partida('X', 'A', 1, 0), partida('Y', 'A', 1, 0), partida('Z', 'A', 1, 0),
      partida('B', 'X', 1, 0), partida('B', 'Y', 0, 0, [cartao('amarelo', 'B')]), partida('B', 'Z', 0, 0),
      partida('C', 'X', 1, 0), partida('C', 'Y', 0, 0), partida('C', 'Z', 0, 0),
    ];
    const t = ordem(['C', 'B', 'A', 'X', 'Y', 'Z'], jogos, so);
    expect(t.filter((l) => 'ABC'.includes(l.equipeId)).map((l) => l.pontos)).toEqual([6, 6, 6]);
    expect(ids(t).filter((id) => 'ABC'.includes(id))).toEqual(['A', 'B', 'C']);

    // Se B e C também empatam no saldo da minitabela, decide o critério seguinte (cartões).
    const iguais = jogos.map((j) => (j.mandanteId === 'A' && j.visitanteId === 'C' ? { ...j, golsMandante: 1 } : j));
    expect(ids(ordem(['B', 'C', 'A', 'X', 'Y', 'Z'], iguais, so)).filter((id) => 'ABC'.includes(id))).toEqual(['A', 'C', 'B']);
  });

  it('cartões: menos vermelhos; persistindo, menos amarelos', () => {
    const base = (ea: EventoPartida[], eb: EventoPartida[]) => [partida('A', 'X', 1, 0, ea), partida('B', 'Y', 1, 0, eb)];
    expect(ids(ordem(['A', 'B', 'X', 'Y'], base([cartao('vermelho', 'A')], [cartao('amarelo', 'B'), cartao('amarelo', 'B')]))).slice(0, 2)).toEqual(['B', 'A']);
    expect(ids(ordem(['A', 'B', 'X', 'Y'], base([cartao('amarelo', 'A')], [cartao('amarelo', 'B'), cartao('amarelo', 'B')]))).slice(0, 2)).toEqual(['A', 'B']);
  });

  it('cartões contam só os jogos encerrados da fase passados', () => {
    const vivo = { ...partida('X', 'A', 0, 0, [cartao('vermelho', 'A')]), status: 'ao-vivo' as const };
    expect(ids(ordem(['B', 'A', 'X', 'Y'], [partida('A', 'X', 1, 0), partida('B', 'Y', 1, 0), vivo])).slice(0, 2)).toEqual(['B', 'A']);
  });

  it('empate em todos os critérios fica empatado (sem sorteio) até o admin decidir', () => {
    const jogos = [partida('A', 'X', 1, 0), partida('B', 'Y', 1, 0)];
    const t = ordem(['A', 'B', 'X', 'Y'], jogos);
    expect(t.slice(0, 2).map((l) => [l.posicao, l.empatada])).toEqual([[1, true], [1, true]]);
    expect(empatesPendentes(t)).toEqual([['A', 'B'], ['X', 'Y']]);
    const decidido = ordem(['A', 'B', 'X', 'Y'], jogos, CRITERIOS_PADRAO, [['B', 'A']]);
    expect(decidido.slice(0, 2).map((l) => [l.equipeId, l.posicao, l.empatada])).toEqual([['B', 1, false], ['A', 2, false]]);
    expect(empatesPendentes(decidido)).toEqual([['X', 'Y']]);
  });

  it('empate pendente no grupo não resolve a vaga correspondente do mata-mata', () => {
    const c = comTabela(campeonato());
    for (let n = 1; n <= 28; n++) jogar(c, n, 0, 0);
    // Todos empatam todos os jogos: posições 1–8 empatadas.
    expect(jogo(c, 29).mandanteId).toBeUndefined();
    c.fases[0].desempates = [['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']];
    aplicarChaveamento(c);
    expect([jogo(c, 29).mandanteId, jogo(c, 29).visitanteId]).toEqual(['f', 'c']);
  });
});

describe('rankings novos', () => {
  const c = comTabela(campeonato());
  jogar(c, 1, 2, 1, undefined, [
    { id: '1', tipo: 'gol_penalti', jogadorId: 'a-ata', equipeId: 'a' },
    { id: '2', tipo: 'gol', jogadorId: 'a-ata', equipeId: 'a' },
    { id: '3', tipo: 'penalti_perdido', jogadorId: 'h-ata', equipeId: 'h' },
    { id: '4', tipo: 'gol', jogadorId: 'h-ata', equipeId: 'h' },
    { id: '5', tipo: 'defesa', jogadorId: 'a-gol', equipeId: 'a' },
    { id: '6', tipo: 'defesa', jogadorId: 'a-gol', equipeId: 'a' },
  ]);
  jogar(c, numeroDe(4, 5), 0, 0);

  it('artilharia soma gol e gol de pênalti', () => {
    expect(artilharia(c.partidas)[0]).toEqual({ jogadorId: 'a-ata', valor: 2 });
  });

  it('penalidades: convertidos e perdidos', () => {
    expect(penalidades(c.partidas)).toEqual([
      { jogadorId: 'a-ata', convertidos: 1, perdidos: 0 },
      { jogadorId: 'h-ata', convertidos: 0, perdidos: 1 },
    ]);
  });

  it('goleiros: gols sofridos, média, jogos sem sofrer gol e defesas', () => {
    const g = goleiros(c.partidas, c.jogadores);
    expect(g.find((x) => x.jogadorId === 'a-gol')).toEqual({ jogadorId: 'a-gol', jogos: 1, golsSofridos: 1, media: 1, semSofrerGol: 0, defesas: 2 });
    expect(g.find((x) => x.jogadorId === 'd-gol')).toMatchObject({ jogos: 1, golsSofridos: 0, semSofrerGol: 1 });
    expect(g[0].golsSofridos).toBe(0);
  });

  it('goleiro registrado na súmula vale mais que o goleiro do elenco', () => {
    const p = jogo(c, numeroDe(4, 5));
    p.goleiroMandanteId = 'd-ata';
    expect(goleiros([p], c.jogadores).map((x) => x.jogadorId).sort()).toEqual(['d-ata', 'e-gol']);
  });
});

it('chaveamento não altera o campeonato recebido', () => {
  const c = comTabela(campeonato());
  const copia = structuredClone(c);
  resolverChaveamento(c);
  expect(c).toEqual(copia);
});

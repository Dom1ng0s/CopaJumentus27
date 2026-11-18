import { describe, expect, it } from 'vitest';
import { andamento, projecaoMataMata } from './andamento';
import { aplicarChaveamento } from './chaveamento';
import { aplicarModelo } from './modelo';
import { CRITERIOS_PADRAO, type Campeonato, type Partida } from './tipos';

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function campeonato(): Campeonato {
  let n = 0;
  const c: Campeonato = {
    versao: 1,
    id: 1,
    slug: 't',
    nome: 'T',
    status: 'andamento',
    modelo: 'livre',
    pontuacao: { vitoria: 3, empate: 1, derrota: 0 },
    criterios: [...CRITERIOS_PADRAO],
    valorInscricao: 0,
    equipes: IDS.map((id) => ({ id, nome: id.toUpperCase(), sigla: id, corPrimaria: '#000', corSecundaria: '#111', corTexto: '#fff' })),
    jogadores: [],
    fases: [],
    grupos: [],
    partidas: [],
  };
  aplicarModelo(c, () => `id${++n}`);
  c.equipes.forEach((e, i) => (e.numeroTabela = i + 1));
  return aplicarChaveamento(c);
}

const jogo = (c: Campeonato, n: number): Partida => c.partidas.find((p) => p.numero === n)!;

function jogar(c: Campeonato, n: number, gm: number, gv: number): void {
  Object.assign(jogo(c, n), { status: 'encerrada', golsMandante: gm, golsVisitante: gv });
  aplicarChaveamento(c);
}

describe('andamento do campeonato', () => {
  it('antes do primeiro jogo: 0 de 34, próximo é o J1 do dia 1', () => {
    const a = andamento(campeonato().partidas);
    expect(a).toMatchObject({ total: 34, encerrados: 0, aoVivo: [], dia: 1, terminou: false });
    expect(a.proxima?.numero).toBe(1);
  });

  it('com jogo ao vivo: o dia vem do jogo ao vivo e o próximo é o agendado seguinte', () => {
    const c = campeonato();
    for (let n = 1; n <= 16; n++) jogar(c, n, 1, 0);
    jogo(c, 17).status = 'ao-vivo';
    const a = andamento(c.partidas);
    expect(a.encerrados).toBe(16);
    expect(a.aoVivo.map((p) => p.numero)).toEqual([17]);
    expect(a.proxima?.numero).toBe(18);
    expect(a.dia).toBe(2);
  });

  it('terminou quando os 34 estão encerrados', () => {
    const c = campeonato();
    for (const p of c.partidas) Object.assign(p, { status: 'encerrada' });
    expect(andamento(c.partidas)).toMatchObject({ terminou: true, proxima: undefined, dia: undefined });
  });
});

describe('projeção do mata-mata ("se acabasse agora")', () => {
  it('sem jogo encerrado não há projeção', () => {
    expect(projecaoMataMata(campeonato()).size).toBe(0);
  });

  it('com o grupo em andamento, as vagas por posição mostram quem ocupa a posição hoje', () => {
    const c = campeonato();
    // J1 é T1 x T8 (a x h): a vence e lidera; h é o último.
    jogar(c, 1, 3, 0);
    const proj = projecaoMataMata(c);
    expect(proj.get(jogo(c, 31).id)).toEqual({ mandanteId: 'a', visitanteId: undefined }); // 1º x Vencedor J30
    expect(proj.has(jogo(c, 33).id)).toBe(false); // perdedores: sem projeção
    const j29 = proj.get(jogo(c, 29).id)!;
    expect(j29.mandanteId).toBeDefined();
    expect(j29.visitanteId).toBeDefined();
  });

  it('com o grupo encerrado, as vagas ficam definidas e a projeção some', () => {
    const c = campeonato();
    for (let n = 1; n <= 28; n++) {
      const p = jogo(c, n);
      const m = IDS.indexOf(p.mandanteId!);
      const v = IDS.indexOf(p.visitanteId!);
      jogar(c, n, m < v ? 1 : 0, m < v ? 0 : 1);
    }
    expect(jogo(c, 29).mandanteId).toBe('c');
    expect(projecaoMataMata(c).size).toBe(0);
  });
});

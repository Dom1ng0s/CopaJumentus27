import { describe, expect, it } from 'vitest';
import { aplicarModelo } from './modelo';
import { montarRegulamento } from './regulamento';
import { CRITERIOS_PADRAO, type Campeonato } from './tipos';

let n = 0;
const id = () => `r${++n}`;

function campeonatoPadrao(): Campeonato {
  return {
    versao: 1,
    id: 1,
    slug: 't',
    nome: 'T',
    status: 'inscricoes',
    modelo: 'livre',
    pontuacao: { vitoria: 3, empate: 1, derrota: 0 },
    criterios: [...CRITERIOS_PADRAO],
    valorInscricao: 0,
    equipes: 'abcdefgh'.split('').map((e) => ({ id: e, nome: e, sigla: e, corPrimaria: '#000', corSecundaria: '#111', corTexto: '#fff' })),
    jogadores: [],
    fases: [],
    grupos: [],
    partidas: [],
  };
}

describe('regulamento', () => {
  it('segue a configuração do campeonato: pontuação, desempate e tempos', () => {
    const c = campeonatoPadrao();
    c.modelo = 'copa-jumentus-8';
    aplicarModelo(c, id);
    c.pontuacao = { vitoria: 3, empate: 1, derrota: 0 };
    c.criterios = ['pontos', 'saldo', 'vitorias', 'golsPro', 'golsContra', 'confronto', 'cartoes'];
    const r = montarRegulamento(c);
    const texto = (t: string) => r.find((s) => s.titulo === t)?.itens.join(' ') ?? '';
    expect(texto('Pontuação')).toContain('Vitória: 3 pontos. Empate: 1 ponto. Derrota: 0 pontos.');
    expect(texto('Desempate na classificação')).toContain('1) Pontos; 2) Saldo de gols; 3) Vitórias');
    expect(texto('Tempo de jogo')).toContain('2 tempos de 8 minutos');
    expect(texto('Tempo de jogo')).toContain('2 tempos de 10 minutos');
    expect(texto('Formato')).toContain('2º x vencedor da J29');
  });
});

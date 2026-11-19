// "Não deve mostrar em hipótese alguma as estrelas de cada jogador na tela de
// sorteio" (operador, 19/11/2026). Renderiza o pote de /sorteio e a página de
// resultado e confere que nenhum nível aparece, nem nos dados do link.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PoteInterativo } from '@/components/PoteInterativo';
import { ResultadoCliente } from '@/app/resultado/[payload]/ResultadoCliente';
import { montarElencos, sortear } from '@/lib/domain/sorteio';
import { poteDeGoleiros, poteDeLinha } from '@/lib/domain/validacao';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from '@/lib/repo/seed';
import { codificarResultado, decodificarResultado } from '@/lib/share/codec';

const SINAIS_DE_NIVEL = /★|estrela|wanted|nível|nivel/i;

describe('estrelas fora da tela de sorteio', () => {
  it('o pote de /sorteio não mostra estrela nem nível', () => {
    const semNivel = ({ id, nome, apelido, posicao }: (typeof JOGADORES_EXEMPLO)[number]) => ({ id, nome, apelido, posicao });
    const html = renderToStaticMarkup(
      createElement(PoteInterativo, {
        pote: poteDeLinha(JOGADORES_EXEMPLO).map(semNivel),
        goleiros: poteDeGoleiros(JOGADORES_EXEMPLO).map(semNivel),
      }),
    );
    expect(html).toContain('Digão');
    expect(html).not.toMatch(SINAIS_DE_NIVEL);
  });

  it('o link de resultado não carrega estrelas e a página não mostra nível', () => {
    const r = sortear({ jogadores: JOGADORES_EXEMPLO, times: TIMES_EXEMPLO });
    if (!r.ok) throw new Error('cotas do exemplo deveriam fechar');
    const payload = codificarResultado(montarElencos(JOGADORES_EXEMPLO, TIMES_EXEMPLO, r.sorteio));
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    // Nenhum número de 1 a 6 solto no payload (só nomes, posições e a data).
    expect(json).not.toMatch(/[,[]\s*[1-6]\s*[,\]]/);

    const dados = decodificarResultado(payload);
    if (!dados) throw new Error('payload inválido');
    const html = renderToStaticMarkup(createElement(ResultadoCliente, { dados }));
    expect(html).toContain('Digão');
    expect(html).not.toMatch(SINAIS_DE_NIVEL);
  });

  it('link antigo (v1, com estrelas) ainda abre, sem as estrelas', () => {
    const v1 = { v: 1, d: '2026-11-18', a: 1, t: [['Inter Miami', 0, ['Xandão', 5], [['Digão', 6, 'LIN']]]] };
    const payload = Buffer.from(JSON.stringify(v1)).toString('base64url');
    expect(decodificarResultado(payload)).toEqual({ d: '2026-11-18', t: [['Inter Miami', 0, 'Xandão', [['Digão', 'LIN']]]] });
  });
});

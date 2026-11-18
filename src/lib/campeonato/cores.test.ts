import { describe, expect, it } from 'vitest';
import { contraste, fundoVisivel, TEXTO_CLARO, TEXTO_ESCURO, textoSobre } from './cores';
import { MARCAS } from './marcas';

describe('contraste sobre as cores dos times', () => {
  it('calcula a razão WCAG', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contraste('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('amarelo, dourado e verde-lima pedem texto escuro; marinho, preto e roxo pedem claro', () => {
    expect(textoSobre('#FFD200')).toBe(TEXTO_ESCURO); // LA Galaxy (secundária)
    expect(textoSobre('#FDE192')).toBe(TEXTO_ESCURO); // Orlando City (secundária)
    expect(textoSobre('#5CD27F')).toBe(TEXTO_ESCURO); // Seattle
    expect(textoSobre('#00245D')).toBe(TEXTO_CLARO);
    expect(textoSobre('#000000')).toBe(TEXTO_CLARO);
    expect(textoSobre('#633492')).toBe(TEXTO_CLARO);
  });

  it('todo texto escolhido passa de 4,5:1 sobre as cores primária e secundária dos 8 times', () => {
    for (const m of MARCAS) {
      for (const fundo of [m.corPrimaria, m.corSecundaria]) {
        expect(contraste(textoSobre(fundo), fundo), `${m.nome} ${fundo}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('cor do time que some no marinho da página é trocada pela outra cor do time', () => {
    expect(fundoVisivel(['#000000', '#C39E6D'])).toBe('#C39E6D'); // LAFC
    expect(fundoVisivel(['#212E4B', '#40527D'])).toBe('#40527D'); // NYC
    expect(fundoVisivel(['#EE7FA6', '#231F20'])).toBe('#EE7FA6'); // Inter Miami
    expect(fundoVisivel(['#0B1F3F', '#06122A'])).toBeUndefined();
  });
});

// Contraste de texto sobre as cores dos times (WCAG 2.1). Usado sempre que um
// número, nome ou sigla fica em cima de uma cor de equipe: o manual dá a cor de
// fundo; a cor do texto sai daqui, para nunca ficar branco sobre amarelo.

/** Off-white e marinho profundo do manual. */
export const TEXTO_CLARO = '#F4F2EC';
export const TEXTO_ESCURO = '#06122A';

function canal(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa de uma cor "#RRGGBB" (ou "#RGB"). */
export function luminancia(hex: string): number {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => canal(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Texto do manual (off-white ou marinho profundo) que mais contrasta com o fundo. */
export function textoSobre(fundo: string): string {
  return contraste(TEXTO_CLARO, fundo) >= contraste(TEXTO_ESCURO, fundo) ? TEXTO_CLARO : TEXTO_ESCURO;
}

/**
 * A cor do time só funciona como fundo de destaque se ela se separa do marinho da
 * página. Preto, marinho e cores muito escuras somem; nesses casos usa a outra
 * cor do time, ou a superfície padrão.
 */
export function fundoVisivel(cores: readonly string[], pagina = '#0B1F3F', minimo = 1.5): string | undefined {
  return cores.find((c) => contraste(c, pagina) >= minimo);
}

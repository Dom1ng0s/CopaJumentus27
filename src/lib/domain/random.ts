// Unica fonte de aleatoriedade do projeto (CLAUDE.md §3.5).
// Encapsulada e injetavel para que o dominio seja testavel.

export type FonteAleatoria = () => number;

/** Fonte padrao: crypto.getRandomValues, nao Math.random. */
export const fonteCrypto: FonteAleatoria = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
};

/** Inteiro em [0, limite). */
export function randomInt(limite: number, fonte: FonteAleatoria = fonteCrypto): number {
  if (limite <= 0) throw new Error('randomInt: limite deve ser maior que zero');
  return Math.floor(fonte() * limite) % limite;
}

/** Fisher-Yates. Retorna um novo array; nunca muta a entrada. */
export function shuffle<T>(itens: readonly T[], fonte: FonteAleatoria = fonteCrypto): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, fonte);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

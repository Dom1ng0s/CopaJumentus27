import { describe, expect, it } from 'vitest';
import { ehAcaoDesatualizada, INTERVALO_MINIMO_MS, podeRecarregar } from './atualizacao';

class UnrecognizedActionError extends Error {
  constructor(m: string) {
    super(m);
    this.name = 'UnrecognizedActionError';
  }
}

describe('aba antiga depois de um deploy', () => {
  it('reconhece o erro de server action desconhecida do Next', () => {
    expect(
      ehAcaoDesatualizada(
        new UnrecognizedActionError('Server Action "7f3a" was not found on the server. \nRead more: https://nextjs.org/docs/messages/failed-to-find-server-action'),
      ),
    ).toBe(true);
    expect(ehAcaoDesatualizada(new Error('Failed to find Server Action. This request might be from an older or newer deployment.'))).toBe(true);
  });

  it('não confunde com outros erros', () => {
    expect(ehAcaoDesatualizada(new Error('Placar inválido'))).toBe(false);
    expect(ehAcaoDesatualizada('texto')).toBe(false);
    expect(ehAcaoDesatualizada(null)).toBe(false);
  });

  it('recarrega uma vez, mas não entra em laço', () => {
    expect(podeRecarregar(1_000_000, null)).toBe(true);
    expect(podeRecarregar(1_000_000, 1_000_000 - 5_000)).toBe(false);
    expect(podeRecarregar(1_000_000, 1_000_000 - INTERVALO_MINIMO_MS)).toBe(true);
  });
});

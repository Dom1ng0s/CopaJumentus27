import { describe, expect, it } from 'vitest';
// @ts-expect-error script .mjs sem tipos
import { hashScrypt, senhaTemporaria } from '../../../scripts/criar-admin.mjs';
import { lerHash, verificarSenha } from './senha';

describe('scripts/criar-admin.mjs', () => {
  it('gera hash no mesmo formato que o servidor verifica', async () => {
    const senha: string = senhaTemporaria();
    const hash: string = hashScrypt(senha);
    expect(lerHash(hash)).toMatchObject({ N: 16384, r: 8, p: 1 });
    expect(await verificarSenha(senha, hash)).toBe(true);
  });
});

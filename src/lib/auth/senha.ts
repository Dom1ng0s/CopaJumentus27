// Senhas dos admins (CLAUDE.md §4.1). Só no servidor Node: usa node:crypto.
// Formato do hash: scrypt$N$r$p$<sal base64url>$<chave base64url>, o mesmo do
// arquivo de contas iniciais. Sem dependência nova.

import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

export const SCRYPT = { N: 16384, r: 8, p: 1, bytesSal: 16, bytesChave: 64 } as const;
export const SENHA_MINIMA = 10;

function derivar(senha: string, sal: Buffer, bytes: number, opcoes: ScryptOptions): Promise<Buffer> {
  return new Promise((ok, falha) => {
    scrypt(senha.normalize('NFC'), sal, bytes, opcoes, (erro, chave) => (erro ? falha(erro) : ok(chave)));
  });
}

export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(SCRYPT.bytesSal);
  const chave = await derivar(senha, sal, SCRYPT.bytesChave, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, sal.toString('base64url'), chave.toString('base64url')].join('$');
}

interface HashLido {
  N: number;
  r: number;
  p: number;
  sal: Buffer;
  chave: Buffer;
}

/** Lê um hash no formato acima. Formato desconhecido ou parâmetros absurdos → null. */
export function lerHash(hash: string): HashLido | null {
  const partes = hash.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return null;
  const [N, r, p] = partes.slice(1, 4).map(Number);
  // Limites contra hash adulterado que travaria o servidor.
  if (![N, r, p].every(Number.isInteger) || N < 2 || N > 2 ** 20 || (N & (N - 1)) !== 0 || r < 1 || r > 32 || p < 1 || p > 16) return null;
  const sal = Buffer.from(partes[4], 'base64url');
  const chave = Buffer.from(partes[5], 'base64url');
  if (sal.length < 8 || chave.length < 16) return null;
  return { N, r, p, sal, chave };
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  const lido = lerHash(hash);
  if (!lido) return false;
  const chave = await derivar(senha, lido.sal, lido.chave.length, {
    N: lido.N,
    r: lido.r,
    p: lido.p,
    maxmem: 256 * lido.N * lido.r,
  });
  return timingSafeEqual(chave, lido.chave);
}

// Hash de uma senha que ninguém conhece: usuário inexistente gasta o mesmo tempo
// que senha errada, para o tempo de resposta não revelar quem tem conta.
let hashFicticio: Promise<string> | null = null;
export function gastarTempoDeVerificacao(senha: string): Promise<boolean> {
  hashFicticio ??= gerarHash(randomBytes(24).toString('base64url'));
  return hashFicticio.then((h) => verificarSenha(senha, h));
}

/** Regras da nova senha. Retorna a mensagem de erro ou null. */
export async function problemaNaNovaSenha(nova: string, confirmacao: string, hashAtual: string): Promise<string | null> {
  if (nova.length < SENHA_MINIMA) return `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (nova !== confirmacao) return 'A confirmação não é igual à nova senha.';
  if (await verificarSenha(nova, hashAtual)) return 'A nova senha precisa ser diferente da atual.';
  return null;
}

// Sem 0/O, 1/l/I: a senha temporária é lida na tela e digitada à mão.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Senha temporária de 14 caracteres (~80 bits), mostrada uma vez ao admin. */
export function gerarSenhaTemporaria(tamanho = 14): string {
  let s = '';
  for (let i = 0; i < tamanho; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

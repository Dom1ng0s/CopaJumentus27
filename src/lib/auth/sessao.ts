// Cookie de sessão dos admins (CLAUDE.md §4.1).
// Só Web Crypto: roda no middleware (edge) e no servidor.
// Conteúdo: {adminId, versao, expira} em JSON base64url + "." + HMAC-SHA256 base64url.
// O middleware só confere assinatura e validade; conta ativa e versão são
// conferidas no banco por exigirAdmin().

export const COOKIE_ADMIN = 'cj_admin';
export const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;

export interface Sessao {
  adminId: number;
  versao: number;
  /** Instante de expiração em ms desde a época. */
  expira: number;
}

const codificador = new TextEncoder();

function paraBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64url(texto: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(texto)) return null;
  try {
    const bin = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function chave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', codificador.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function segredoDaSessao(): string | null {
  const s = process.env.SESSAO_SEGREDO;
  return s && s.length >= 32 ? s : null;
}

export async function assinarSessao(sessao: Sessao, segredo: string): Promise<string> {
  const corpo = paraBase64url(codificador.encode(JSON.stringify(sessao)));
  const assinatura = await crypto.subtle.sign('HMAC', await chave(segredo), codificador.encode(corpo));
  return `${corpo}.${paraBase64url(new Uint8Array(assinatura))}`;
}

/** Sessão válida (assinatura confere e não expirou) ou null. */
export async function lerSessao(token: string | undefined, segredo: string | null, agora = Date.now()): Promise<Sessao | null> {
  if (!token || !segredo) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [corpo, assinaturaTexto] = partes;
  const assinatura = deBase64url(assinaturaTexto);
  if (!assinatura) return null;
  // verify compara em tempo constante.
  const ok = await crypto.subtle.verify('HMAC', await chave(segredo), assinatura, codificador.encode(corpo));
  if (!ok) return null;
  const bytes = deBase64url(corpo);
  if (!bytes) return null;
  let dados: unknown;
  try {
    dados = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (typeof dados !== 'object' || dados === null) return null;
  const { adminId, versao, expira } = dados as Record<string, unknown>;
  if (!Number.isInteger(adminId) || !Number.isInteger(versao) || typeof expira !== 'number') return null;
  if (expira <= agora) return null;
  return { adminId: adminId as number, versao: versao as number, expira };
}

/** Destino seguro depois do login: só caminho interno (nada de //host ou /\host). */
export function destinoSeguro(volta: string | undefined | null, padrao = '/admin'): string {
  if (!volta || !volta.startsWith('/') || volta.startsWith('//') || volta.startsWith('/\\')) return padrao;
  return volta;
}

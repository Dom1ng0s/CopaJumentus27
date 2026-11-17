// Acesso de admin: senha única em ADMIN_SENHA (.env.local) e cookie assinado.
// Funciona no middleware (edge) e no servidor: usa só Web Crypto.

export const COOKIE_ADMIN = 'cj_admin';

/** Token derivado da senha: trocar ADMIN_SENHA derruba todas as sessões. */
export async function tokenDaSenha(senha: string): Promise<string> {
  const dados = new TextEncoder().encode(`copa-jumentus:${senha}`);
  const hash = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  const senha = process.env.ADMIN_SENHA;
  if (!senha || !token) return false;
  return token === (await tokenDaSenha(senha));
}

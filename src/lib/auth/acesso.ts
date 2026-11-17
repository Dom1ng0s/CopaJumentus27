// Decisão de acesso do admin, pura (testável sem Next). Ver exigirAdmin() em servidor.ts.

import type { Banco } from '@/lib/db/cliente';
import { adminDaSessao, type Admin } from '@/lib/repo/admins-repo';
import { lerSessao } from './sessao';

export type Acesso = { tipo: 'ok'; admin: Admin } | { tipo: 'sem-sessao' } | { tipo: 'troca-pendente'; admin: Admin };

/**
 * Cookie → conta. O middleware já conferiu assinatura e validade; aqui confere
 * no banco que a conta está ativa e com a mesma versão de sessão.
 * Com troca de senha pendente, nenhuma ação é aceita (só a própria troca).
 */
export async function decidirAcesso(
  token: string | undefined,
  segredo: string | null,
  opcoes: { permitirTrocaPendente?: boolean } = {},
  agora = Date.now(),
  db?: Banco,
): Promise<Acesso> {
  const sessao = await lerSessao(token, segredo, agora);
  if (!sessao) return { tipo: 'sem-sessao' };
  const admin = await adminDaSessao(sessao, db);
  if (!admin) return { tipo: 'sem-sessao' };
  if (admin.deveTrocarSenha && !opcoes.permitirTrocaPendente) return { tipo: 'troca-pendente', admin };
  return { tipo: 'ok', admin };
}

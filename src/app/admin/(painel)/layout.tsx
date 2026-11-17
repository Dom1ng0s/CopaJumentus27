import Link from 'next/link';
import { GuardaAdmin } from '@/components/admin/GuardaAdmin';
import { exigirAdmin } from '@/lib/auth/servidor';
import { sair } from '../acoes-conta';

const ITENS = [
  { href: '/admin', rotulo: 'Painel' },
  { href: '/admin/inscricoes', rotulo: 'Inscrições' },
  { href: '/admin/campeonato', rotulo: 'Campeonato' },
  { href: '/admin/fases', rotulo: 'Fases e grupos' },
  { href: '/admin/partidas', rotulo: 'Partidas' },
  { href: '/admin/equipes', rotulo: 'Equipes' },
  { href: '/admin/pagamentos', rotulo: 'Pagamentos' },
  { href: '/sorteio', rotulo: 'Sorteio' },
  { href: '/admin/admins', rotulo: 'Admins' },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const conta = await exigirAdmin({ permitirTrocaPendente: true });
  return (
    <GuardaAdmin>
      <div className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-hud pb-4">
          <span className="hud-label mr-2" style={{ color: 'var(--accent)' }}>
            Admin
          </span>
          {ITENS.map((i) => (
            <Link key={i.href} href={i.href} className="btn-mini">
              {i.rotulo}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/conta" className="btn-mini" title="Minha conta">
              {conta.nome}
            </Link>
            <form action={sair}>
              <button type="submit" className="btn-mini">
                Sair
              </button>
            </form>
          </div>
        </div>
        {children}
      </div>
    </GuardaAdmin>
  );
}

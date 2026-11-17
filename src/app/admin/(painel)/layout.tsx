import Link from 'next/link';
import { sair } from '../acoes';

const ITENS = [
  { href: '/admin', rotulo: 'Painel' },
  { href: '/admin/campeonato', rotulo: 'Campeonato' },
  { href: '/admin/fases', rotulo: 'Fases e grupos' },
  { href: '/admin/partidas', rotulo: 'Partidas' },
  { href: '/admin/equipes', rotulo: 'Equipes' },
  { href: '/admin/pagamentos', rotulo: 'Pagamentos' },
  { href: '/sorteio', rotulo: 'Sorteio' },
];

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
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
        <form action={sair} className="ml-auto">
          <button type="submit" className="btn-mini">
            Sair
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}

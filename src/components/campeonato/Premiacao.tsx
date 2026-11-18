// Premiação individual da edição (craque, artilheiro, garçom, goleiro...).
// O primeiro prêmio da lista leva o dourado metálico; os demais, filete na cor do time.

import { fundoVisivel } from '@/lib/campeonato/cores';
import type { Equipe, Premio } from '@/lib/domain/campeonato/tipos';
import { Escudo } from './ui';

export function Premiacao({ premios, equipe, titulo = 'Premiação' }: { premios: Premio[]; equipe: Map<string, Equipe>; titulo?: string }) {
  if (premios.length === 0) return null;
  return (
    <section aria-label={titulo}>
      <h3 className="titulo-hero t-sm mb-4 text-2xl">{titulo}</h3>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {premios.map((p, i) => {
          const e = p.equipeId ? equipe.get(p.equipeId) : undefined;
          const cor = e ? fundoVisivel([e.corPrimaria, e.corSecundaria]) : undefined;
          return (
            <li key={p.id} className="hud-card hud-clip modulo relative overflow-hidden p-4 pl-5">
              <span
                className="absolute inset-y-0 left-0 w-[6px]"
                style={i === 0 ? { backgroundImage: 'var(--gradient-leonida)' } : { background: cor ?? 'var(--border-visible)' }}
                aria-hidden="true"
              />
              <p className="hud-label !text-[13px]" style={{ color: i === 0 ? 'var(--dourado-claro)' : 'var(--accent)' }}>
                {p.titulo}
              </p>
              <div className="mt-2 flex items-center gap-3">
                {e && <Escudo equipe={e} tamanho={40} />}
                <div className="min-w-0 flex-1">
                  <p className="titulo-hero t-sm line-clamp-2 text-2xl leading-none">{p.jogador}</p>
                  {e && <p className="mt-1 truncate font-mono text-[13px] font-bold uppercase tracking-wider text-text-2">{e.nome}</p>}
                </div>
              </div>
              {p.detalhe && <p className="numero mt-3 text-3xl" style={{ color: 'var(--accent)' }}>{p.detalhe}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

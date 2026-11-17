import Link from 'next/link';
import { Cabecalho, Cartao, Escudo, Secao } from '@/components/campeonato/ui';
import { indices } from '@/lib/campeonato/consultas';
import { artilharia, assistencias, cartoes, goleiros, penalidades } from '@/lib/domain/campeonato/rankings';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

export function PaginaRankings({ c, base, fase }: { c: Campeonato; base: string; fase?: string }) {
  const { equipe, jogador } = indices(c);
  const partidas = fase ? c.partidas.filter((p) => p.faseId === fase) : c.partidas;

  const linhaJogador = (id: string) => {
    const j = jogador.get(id);
    const e = j ? equipe.get(j.equipeId) : undefined;
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Escudo equipe={e} tamanho={22} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{j?.nome ?? '—'}</span>
          <span className="block truncate text-xs text-text-3">{e?.nome}</span>
        </span>
      </span>
    );
  };

  const lista = (itens: Array<{ jogadorId: string; valor: React.ReactNode; detalhe?: string }>, vazio: string) =>
    itens.length === 0 ? (
      <p className="text-sm text-text-3">{vazio}</p>
    ) : (
      <ol className="divide-y divide-[var(--panel-stroke)]">
        {itens.slice(0, 10).map((it, i) => (
          <li key={it.jogadorId} className="flex items-center gap-3 py-2">
            <span className="w-6 font-mono text-sm text-text-3">{i + 1}</span>
            <span className="min-w-0 flex-1">
              {linhaJogador(it.jogadorId)}
              {it.detalhe && <span className="mt-0.5 block font-mono text-xs text-text-3">{it.detalhe}</span>}
            </span>
            <span className="numero text-3xl" style={{ color: 'var(--accent)' }}>
              {it.valor}
            </span>
          </li>
        ))}
      </ol>
    );

  const filtro = (id?: string) => `${base}/rankings${id ? `?fase=${id}` : ''}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20">
      <Cabecalho titulo="Rankings" />
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por fase">
        <Link href={filtro()} className="btn-hud !py-1.5 !text-sm" aria-current={!fase ? 'page' : undefined}>
          Todas as fases
        </Link>
        {c.fases.map((f) => (
          <Link key={f.id} href={filtro(f.id)} className="btn-hud !py-1.5 !text-sm" aria-current={fase === f.id ? 'page' : undefined}>
            {f.nome}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 lg:grid-cols-3">
        <Secao titulo="Artilharia">{lista(artilharia(partidas), 'Nenhum gol registrado.')}</Secao>
        <Secao titulo="Assistências">{lista(assistencias(partidas), 'Nenhuma assistência registrada.')}</Secao>
        <Secao titulo="Penalidades">
          {lista(
            penalidades(partidas).map((x) => ({
              jogadorId: x.jogadorId,
              valor: x.convertidos,
              detalhe: `${x.convertidos} ${x.convertidos === 1 ? 'convertido' : 'convertidos'} · ${x.perdidos} ${x.perdidos === 1 ? 'perdido' : 'perdidos'}`,
            })),
            'Nenhum pênalti cobrado em jogo.',
          )}
        </Secao>
        <Secao titulo="Goleiros">
          {lista(
            goleiros(partidas, c.jogadores).map((g) => ({
              jogadorId: g.jogadorId,
              valor: g.media.toLocaleString('pt-BR'),
              detalhe: `${g.golsSofridos} sofridos em ${g.jogos} ${g.jogos === 1 ? 'jogo' : 'jogos'} · ${g.semSofrerGol} sem sofrer gol · ${g.defesas} ${g.defesas === 1 ? 'defesa' : 'defesas'}`,
            })),
            'Nenhum jogo encerrado com goleiro definido.',
          )}
          <p className="mt-2 text-xs text-text-3">Número grande: média de gols sofridos por jogo (menos é melhor).</p>
        </Secao>
        <Secao titulo="Cartões">
          {lista(
            cartoes(partidas).map((x) => ({
              jogadorId: x.jogadorId,
              valor: (
                <span className="flex gap-3">
                  {x.amarelos > 0 && <Cartao cor="amarelo" quantidade={x.amarelos} />}
                  {x.vermelhos > 0 && <Cartao cor="vermelho" quantidade={x.vermelhos} />}
                </span>
              ),
            })),
            'Nenhum cartão registrado.',
          )}
        </Secao>
      </div>
    </div>
  );
}

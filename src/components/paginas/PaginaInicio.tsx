import Image from 'next/image';
import Link from 'next/link';
import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { CardPartida, Escudo, Numero } from '@/components/campeonato/ui';
import { formatarData, indices, lados } from '@/lib/campeonato/consultas';
import type { CampeonatoPublico } from '@/lib/campeonato/selecao';
import { podio } from '@/lib/domain/campeonato/chaveamento';
import { resumirJogos } from '@/lib/domain/campeonato/classificacao';
import { ordenarPartidas } from '@/lib/domain/campeonato/suspensoes';
import { ROTULO_STATUS_CAMPEONATO, type Equipe } from '@/lib/domain/campeonato/tipos';

/** Início de uma edição: banner, escudo, status, período, pódio, franquias e jogos. */
export function PaginaInicio({ c, base, edicoes }: CampeonatoPublico) {
  const { equipe } = indices(c);
  const ordenadas = ordenarPartidas(c.partidas);
  const aoVivo = ordenadas.filter((p) => p.status === 'ao-vivo');
  const proximas = ordenadas.filter((p) => p.status === 'agendada').slice(0, 4);
  const ultimas = ordenadas.filter((p) => p.status === 'encerrada').slice(-4).reverse();
  const resumo = resumirJogos(c.partidas);
  const resultado = podio(c);
  const status = aoVivo.length ? 'Ao vivo' : ROTULO_STATUS_CAMPEONATO[c.status];
  const outras = edicoes.filter((e) => e.id !== c.id);
  const titulo = [c.nome, c.edicao && !c.nome.includes(c.edicao) ? c.edicao : ''].filter(Boolean).join(' ');
  const bannerSrc = c.banner || '/banner-copa-jumentus.webp';

  return (
    <>
      <AutoAtualizar ativo={aoVivo.length > 0} />
      <section className="relative">
        <div className="relative w-full overflow-hidden py-8 sm:py-0">
          {/* Moldura no celular: a própria arte ampliada e desfocada para casar a emenda (CLAUDE.md §5) */}
          <div
            className="pointer-events-none absolute inset-0 scale-110 sm:hidden"
            style={{
              backgroundImage: `url(${bannerSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(26px) saturate(1.15)',
            }}
            aria-hidden="true"
          />
          <h1 className="sr-only">{titulo}</h1>
          {c.banner ? (
            // Arte da edição cadastrada no admin (caminho ou URL).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.banner} alt={titulo} className="relative block h-auto w-full" />
          ) : (
            <Image src="/banner-copa-jumentus.webp" alt={titulo} width={2000} height={504} priority sizes="100vw" className="relative block h-auto w-full" />
          )}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] sm:h-[14%]"
            style={{ backgroundImage: 'linear-gradient(180deg, transparent 0%, var(--background) 92%)' }}
            aria-hidden="true"
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-20 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            {c.escudo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.escudo} alt="" width={72} height={72} className="h-[72px] w-auto shrink-0 object-contain" />
            )}
            <div>
              <p className="hud-label mb-2">{c.subtitulo ?? (c.edicao ? `Edição ${c.edicao}` : 'Copa Jumentus')}</p>
              <h2 className="titulo-hero t-xl text-4xl sm:text-5xl">{c.nome}</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Info rotulo="Período" valor={c.inicio ? `${formatarData(c.inicio)}${c.fim ? ` – ${formatarData(c.fim)}` : ''}` : 'A definir'} />
            <Info rotulo="Local" valor={c.local ?? 'A definir'} />
            <Info rotulo="Status" valor={status} destaque={aoVivo.length > 0} />
          </div>
        </div>

        {resultado && <Podio primeiro={equipe.get(resultado.primeiro)} segundo={equipe.get(resultado.segundo)} terceiro={resultado.terceiro ? equipe.get(resultado.terceiro) : undefined} />}

        <div className="hud-card hud-clip modulo relative grid grid-cols-4 gap-2 px-4 py-4">
          <Numero valor={c.equipes.length} rotulo="Equipes" />
          <Numero valor={resumo.jogos} rotulo="Jogos" />
          <Numero valor={resumo.gols} rotulo="Gols" />
          <Numero valor={resumo.mediaGols.toLocaleString('pt-BR')} rotulo="Média" />
        </div>

        {/* Faixa de escudos das franquias participantes */}
        {c.equipes.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {c.equipes.map((eq) => (
              <Link
                key={eq.id}
                href={`${base}/equipes`}
                className="hud-card flex flex-col items-center gap-1.5 px-2 py-3 text-center transition-transform hover:-translate-y-0.5"
                style={{ borderBottom: `3px solid ${eq.corPrimaria}` }}
                title={eq.nome}
              >
                <Escudo equipe={eq} tamanho={36} />
                <span className="w-full truncate font-mono text-xs font-bold uppercase tracking-wider text-text-2">
                  {eq.sigla || eq.nome}
                </span>
              </Link>
            ))}
          </div>
        )}

        {aoVivo.length > 0 && (
          <Lista titulo="Ao vivo">
            {aoVivo.map((p) => (
              <CardPartida key={p.id} partida={p} {...lados(c, p, equipe)} href={`${base}/jogos/${p.id}`} />
            ))}
          </Lista>
        )}

        {c.status !== 'encerrado' && (
          <Lista titulo="Próximos jogos" vazio="A tabela de jogos ainda não saiu.">
            {proximas.map((p) => (
              <CardPartida key={p.id} partida={p} {...lados(c, p, equipe)} href={`${base}/jogos/${p.id}`} />
            ))}
          </Lista>
        )}

        {ultimas.length > 0 && (
          <Lista titulo="Últimos resultados">
            {ultimas.map((p) => (
              <CardPartida key={p.id} partida={p} {...lados(c, p, equipe)} href={`${base}/jogos/${p.id}`} />
            ))}
          </Lista>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href={`${base}/classificacao`} className="btn-cta">
            <span>Ver classificação</span>
          </Link>
          <Link href={`${base}/equipes`} className="btn-hud">
            Elencos
          </Link>
          <Link href={`${base}/jogos`} className="btn-hud">
            Tabela de jogos
          </Link>
        </div>

        {outras.length > 0 && (
          <section>
            <h3 className="titulo-hero t-sm mb-4 text-2xl">Outras edições</h3>
            <ul className="flex flex-wrap gap-2">
              {outras.map((e) => (
                <li key={e.id}>
                  <Link href={`/edicoes/${e.slug}`} className="btn-hud !py-1.5 !text-sm">
                    {e.nome}
                    {e.edicao && !e.nome.includes(e.edicao) ? ` ${e.edicao}` : ''} · {ROTULO_STATUS_CAMPEONATO[e.status]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function Podio({ primeiro, segundo, terceiro }: { primeiro?: Equipe; segundo?: Equipe; terceiro?: Equipe }) {
  const degraus: Array<[string, Equipe | undefined, number]> = [
    ['Campeão', primeiro, 72],
    ['Vice', segundo, 52],
    ['3º lugar', terceiro, 44],
  ];
  return (
    <section className="hud-card hud-clip modulo relative px-4 pb-6 pt-4" aria-label="Pódio">
      <h3 className="titulo-hero t-sm mb-4 text-2xl">Pódio</h3>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {degraus.map(([rotulo, e, tamanho], i) => (
          <li key={rotulo} className="flex items-center gap-3">
            <span className="numero text-5xl" style={{ color: i === 0 ? 'var(--accent)' : 'var(--text2)' }}>
              {i + 1}
            </span>
            <Escudo equipe={e} tamanho={tamanho} />
            <span>
              <span className="hud-label block !text-[11px]">{rotulo}</span>
              <span className="titulo-hero t-sm block text-2xl">{e?.nome ?? 'A definir'}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Info({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="hud-card relative px-3 py-2">
      <p className="hud-label text-[10px]">{rotulo}</p>
      <p className="text-sm font-semibold" style={destaque ? { color: 'var(--vermelho)' } : undefined}>
        {valor}
      </p>
    </div>
  );
}

function Lista({ titulo, children, vazio }: { titulo: string; children: React.ReactNode; vazio?: string }) {
  const itens = Array.isArray(children) ? children : [children];
  return (
    <section>
      <h3 className="titulo-hero t-sm mb-4 text-2xl">{titulo}</h3>
      {itens.length === 0 && vazio ? (
        <p className="text-sm text-text-3">{vazio}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      )}
    </section>
  );
}

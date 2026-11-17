import Image from 'next/image';
import Link from 'next/link';
import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { CardPartida, Numero } from '@/components/campeonato/ui';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO } from '@/lib/config';
import { formatarData, indices } from '@/lib/campeonato/consultas';
import { resumirJogos } from '@/lib/domain/campeonato/classificacao';
import { ordenarPartidas } from '@/lib/domain/campeonato/suspensoes';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const c = await carregarCampeonato();
  const { equipe } = indices(c);
  const ordenadas = ordenarPartidas(c.partidas);
  const aoVivo = ordenadas.filter((p) => p.status === 'ao-vivo');
  const proximas = ordenadas.filter((p) => p.status === 'agendada').slice(0, 4);
  const ultimas = ordenadas.filter((p) => p.status === 'encerrada').slice(-4).reverse();
  const resumo = resumirJogos(c.partidas);
  const status = aoVivo.length
    ? 'Ao vivo'
    : resumo.jogos > 0
      ? proximas.length
        ? 'Em andamento'
        : 'Encerrado'
      : 'Em breve';

  return (
    <>
      <AutoAtualizar ativo={aoVivo.length > 0} />
      <section className="relative">
        <h1 className="sr-only">
          {NOME_COMPETICAO} {SUBTITULO_COMPETICAO}
        </h1>
        <Image
          src="/banner-copa-jumentus.webp"
          alt={`${NOME_COMPETICAO} ${SUBTITULO_COMPETICAO}`}
          width={2000}
          height={504}
          priority
          sizes="100vw"
          className="relative block h-auto w-full"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] sm:h-[14%]"
          style={{ backgroundImage: 'linear-gradient(180deg, transparent 0%, #0C0D1B 92%)' }}
          aria-hidden="true"
        />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-20 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hud-label mb-2">{c.subtitulo ?? 'Edição 2027'}</p>
            <h2 className="titulo-hero t-xl text-4xl sm:text-5xl">{c.nome}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Info rotulo="Período" valor={c.inicio ? `${formatarData(c.inicio)} – ${formatarData(c.fim)}` : 'A definir'} />
            <Info rotulo="Local" valor={c.local ?? 'A definir'} />
            <Info rotulo="Status" valor={status} />
          </div>
        </div>

        <div className="hud-card relative grid grid-cols-4 gap-2 px-4 py-4">
          <Numero valor={c.equipes.length} rotulo="Equipes" />
          <Numero valor={resumo.jogos} rotulo="Jogos" />
          <Numero valor={resumo.gols} rotulo="Gols" />
          <Numero valor={resumo.mediaGols.toLocaleString('pt-BR')} rotulo="Média" />
        </div>

        {aoVivo.length > 0 && (
          <Lista titulo="Ao vivo">
            {aoVivo.map((p) => (
              <CardPartida key={p.id} partida={p} mandante={equipe.get(p.mandanteId)} visitante={equipe.get(p.visitanteId)} href={`/jogos/${p.id}`} />
            ))}
          </Lista>
        )}

        <Lista titulo="Próximos jogos" vazio="A tabela de jogos ainda não saiu.">
          {proximas.map((p) => (
            <CardPartida key={p.id} partida={p} mandante={equipe.get(p.mandanteId)} visitante={equipe.get(p.visitanteId)} href={`/jogos/${p.id}`} />
          ))}
        </Lista>

        {ultimas.length > 0 && (
          <Lista titulo="Últimos resultados">
            {ultimas.map((p) => (
              <CardPartida key={p.id} partida={p} mandante={equipe.get(p.mandanteId)} visitante={equipe.get(p.visitanteId)} href={`/jogos/${p.id}`} />
            ))}
          </Lista>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/classificacao" className="btn-cta">
            <span>Ver classificação</span>
          </Link>
          <Link href="/equipes" className="btn-hud">
            Elencos
          </Link>
        </div>
      </div>
    </>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="hud-card relative px-3 py-2">
      <p className="hud-label text-[10px]">{rotulo}</p>
      <p className="text-sm font-semibold">{valor}</p>
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

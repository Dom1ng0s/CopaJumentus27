// Histórico: as mesmas telas do site, para qualquer edição publicada.
// /edicoes/<slug>, /classificacao, /jogos, /jogos/<id>, /rankings, /equipes.

import { notFound } from 'next/navigation';
import { PaginaClassificacao } from '@/components/paginas/PaginaClassificacao';
import { PaginaEquipes } from '@/components/paginas/PaginaEquipes';
import { PaginaInicio } from '@/components/paginas/PaginaInicio';
import { PaginaJogo } from '@/components/paginas/PaginaJogo';
import { PaginaJogos } from '@/components/paginas/PaginaJogos';
import { PaginaRankings } from '@/components/paginas/PaginaRankings';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';

export default async function Edicao({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; secao?: string[] }>;
  searchParams: Promise<{ fase?: string }>;
}) {
  const { slug, secao = [] } = await params;
  const dados = await campeonatoPublico(slug);
  if (!dados) notFound();
  const [pagina, id, ...resto] = secao;
  if (resto.length) notFound();
  switch (pagina) {
    case undefined:
      return <PaginaInicio {...dados} />;
    case 'classificacao':
      return id ? notFound() : <PaginaClassificacao {...dados} />;
    case 'jogos':
      return id ? <PaginaJogo {...dados} id={id} /> : <PaginaJogos {...dados} />;
    case 'rankings':
      return id ? notFound() : <PaginaRankings {...dados} fase={(await searchParams).fase} />;
    case 'equipes':
      return id ? notFound() : <PaginaEquipes {...dados} />;
    default:
      notFound();
  }
}

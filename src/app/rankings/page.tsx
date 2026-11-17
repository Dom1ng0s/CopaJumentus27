import { PaginaRankings } from '@/components/paginas/PaginaRankings';
import { SemEdicao } from '@/components/paginas/SemEdicao';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rankings — Copa Jumentus' };

export default async function Rankings({ searchParams }: { searchParams: Promise<{ fase?: string }> }) {
  const { fase } = await searchParams;
  const atual = await campeonatoPublico();
  return atual ? <PaginaRankings {...atual} fase={fase} /> : <SemEdicao />;
}

import { notFound } from 'next/navigation';
import { PaginaJogo } from '@/components/paginas/PaginaJogo';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';

export default async function Partida({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const atual = await campeonatoPublico();
  if (!atual) notFound();
  return <PaginaJogo {...atual} id={id} />;
}

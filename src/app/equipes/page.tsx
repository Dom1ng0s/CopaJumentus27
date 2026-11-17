import { PaginaEquipes } from '@/components/paginas/PaginaEquipes';
import { SemEdicao } from '@/components/paginas/SemEdicao';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Equipes — Copa Jumentus' };

export default async function Equipes() {
  const atual = await campeonatoPublico();
  return atual ? <PaginaEquipes {...atual} /> : <SemEdicao />;
}

import { PaginaRegulamento } from '@/components/paginas/PaginaRegulamento';
import { SemEdicao } from '@/components/paginas/SemEdicao';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Regulamento — Copa Jumentus' };

export default async function Regulamento() {
  const atual = await campeonatoPublico();
  return atual ? <PaginaRegulamento {...atual} /> : <SemEdicao />;
}

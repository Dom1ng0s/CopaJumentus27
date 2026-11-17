import { PaginaClassificacao } from '@/components/paginas/PaginaClassificacao';
import { SemEdicao } from '@/components/paginas/SemEdicao';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Classificação — Copa Jumentus' };

export default async function Classificacao() {
  const atual = await campeonatoPublico();
  return atual ? <PaginaClassificacao {...atual} /> : <SemEdicao />;
}

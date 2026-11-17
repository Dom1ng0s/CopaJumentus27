import { PaginaInicio } from '@/components/paginas/PaginaInicio';
import { SemEdicao } from '@/components/paginas/SemEdicao';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const atual = await campeonatoPublico();
  return atual ? <PaginaInicio {...atual} /> : <SemEdicao />;
}

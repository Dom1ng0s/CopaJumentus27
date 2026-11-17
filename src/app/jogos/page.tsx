import { PaginaJogos } from '@/components/paginas/PaginaJogos';
import { SemEdicao } from '@/components/paginas/SemEdicao';
import { campeonatoPublico } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jogos — Copa Jumentus' };

export default async function Jogos() {
  const atual = await campeonatoPublico();
  return atual ? <PaginaJogos {...atual} /> : <SemEdicao />;
}

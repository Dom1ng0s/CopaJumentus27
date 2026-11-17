import { CerimoniaCliente } from './CerimoniaCliente';
import { carregarCadastro } from '@/lib/repo/cadastro';

export const metadata = { title: 'Cerimônia do sorteio — Copa Jumentus' };

// Le dados/inscritos.csv a cada requisicao: reimportar a planilha nao exige rebuild.
export const dynamic = 'force-dynamic';

export default async function CerimoniaPage() {
  const { jogadores, times, problemas } = await carregarCadastro();
  return <CerimoniaCliente jogadores={jogadores} times={times} problemas={problemas} />;
}

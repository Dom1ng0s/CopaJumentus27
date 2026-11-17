import { CerimoniaCliente } from './CerimoniaCliente';
import { carregarCadastro } from '@/lib/repo/cadastro';
import { idDoCampeonatoDoAdmin } from '@/lib/campeonato/selecao';

export const metadata = { title: 'Cerimônia do sorteio — Copa Jumentus' };

// Lê as inscrições do banco a cada requisição.
export const dynamic = 'force-dynamic';

export default async function CerimoniaPage() {
  const { jogadores, times, problemas } = await carregarCadastro(await idDoCampeonatoDoAdmin());
  return <CerimoniaCliente jogadores={jogadores} times={times} problemas={problemas} />;
}

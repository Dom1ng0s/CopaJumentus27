import { FormTrocaSenha } from '@/components/admin/FormTrocaSenha';
import { Aviso, Secao } from '@/components/campeonato/ui';
import { exigirAdmin } from '@/lib/auth/servidor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta — Admin Copa Jumentus' };

export default async function MinhaConta({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const conta = await exigirAdmin();
  return (
    <div className="max-w-md space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Minha conta</h1>
      <Aviso texto={ok} tipo="ok" />
      <p className="text-sm text-text-2">
        {conta.nome} · usuário <span className="font-mono font-semibold">{conta.usuario}</span>
      </p>
      <Secao titulo="Trocar senha">
        <p className="mb-4 text-sm text-text-3">Trocar a senha encerra suas sessões abertas em outros aparelhos.</p>
        <FormTrocaSenha exigirAtual volta="/admin/conta" />
      </Secao>
    </div>
  );
}

import { Aviso } from '@/components/campeonato/ui';
import { destinoSeguro } from '@/lib/auth/sessao';
import { entrar } from '../acoes-conta';

export const metadata = { title: 'Entrar — Admin Copa Jumentus' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string; volta?: string }> }) {
  const { erro, volta } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 pb-20 pt-10">
      <h1 className="titulo-hero t-xl mb-6 text-4xl">Área dos admins</h1>
      <Aviso texto={erro} />
      <form action={entrar} className="hud-card relative space-y-4 p-5">
        <input type="hidden" name="volta" value={destinoSeguro(volta)} />
        <label className="block">
          <span className="rotulo-campo">Usuário</span>
          <input
            name="usuario"
            type="text"
            required
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="campo"
          />
        </label>
        <label className="block">
          <span className="rotulo-campo">Senha</span>
          <input name="senha" type="password" required autoComplete="current-password" className="campo" />
        </label>
        <button type="submit" className="btn-cta w-full">
          <span>Entrar</span>
        </button>
      </form>
    </div>
  );
}

import { Aviso } from '@/components/campeonato/ui';
import { entrar } from '../acoes';

export const metadata = { title: 'Entrar — Admin Copa Jumentus' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string; volta?: string }> }) {
  const { erro, volta } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 pb-20 pt-10">
      <h1 className="titulo-hero t-xl mb-6 text-4xl">Área dos admins</h1>
      <Aviso texto={erro} />
      <form action={entrar} className="hud-card relative space-y-4 p-5">
        <input type="hidden" name="volta" value={volta ?? '/admin'} />
        <label className="block">
          <span className="rotulo-campo">Senha</span>
          <input name="senha" type="password" required autoFocus autoComplete="current-password" className="campo" />
        </label>
        <button type="submit" className="btn-cta w-full">
          <span>Entrar</span>
        </button>
      </form>
    </div>
  );
}

import Link from 'next/link';
import { Cabecalho } from '@/components/campeonato/ui';

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <Cabecalho titulo="Fora de campo" legenda="Esta página não existe ou o jogo foi removido." />
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn-cta">
          <span>Ir para o início</span>
        </Link>
        <Link href="/jogos" className="btn-hud">
          Ver os jogos
        </Link>
      </div>
    </div>
  );
}

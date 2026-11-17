import { Cabecalho } from '@/components/campeonato/ui';

export function SemEdicao() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6">
      <Cabecalho titulo="Em breve" legenda="Nenhuma edição publicada ainda." />
    </div>
  );
}

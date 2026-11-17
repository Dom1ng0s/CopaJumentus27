import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { BotaoImprimir } from '@/components/campeonato/BotaoImprimir';
import { Sumula } from '@/components/campeonato/Sumula';
import { CardPartida, Secao } from '@/components/campeonato/ui';
import { indices, lados } from '@/lib/campeonato/consultas';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

/** Partida com a súmula: gols, assistências, cartões, defesas, goleiros e pênaltis. */
export function PaginaJogo({ c, base, id }: { c: Campeonato; base: string; id: string }) {
  const partida = c.partidas.find((p) => p.id === id);
  if (!partida) notFound();
  const { equipe } = indices(c);
  const fase = c.fases.find((f) => f.id === partida.faseId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-20">
      <AutoAtualizar ativo={partida.status === 'ao-vivo'} segundos={15} />
      <div className="nao-imprimir flex items-center justify-between">
        <Link href={`${base}/jogos`} className="hud-label">
          ← Jogos
        </Link>
        <BotaoImprimir rotulo="Imprimir súmula" />
      </div>
      <div className="imprimivel space-y-6">
        <p className="hud-label">
          {c.nome}
          {c.edicao && !c.nome.includes(c.edicao) ? ` ${c.edicao}` : ''} · {fase?.nome}
        </p>
        <CardPartida partida={partida} {...lados(c, partida, equipe)} />
        <Secao titulo="Súmula">
          <Sumula partida={partida} campeonato={c} />
        </Secao>
      </div>
    </div>
  );
}

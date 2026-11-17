import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { Sumula } from '@/components/campeonato/Sumula';
import { CardPartida, Secao } from '@/components/campeonato/ui';
import { indices } from '@/lib/campeonato/consultas';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';

export const dynamic = 'force-dynamic';

export default async function PaginaPartida({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await carregarCampeonato();
  const partida = c.partidas.find((p) => p.id === id);
  if (!partida) notFound();
  const { equipe } = indices(c);
  const fase = c.fases.find((f) => f.id === partida.faseId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-20">
      <AutoAtualizar ativo={partida.status === 'ao-vivo'} segundos={15} />
      <Link href="/jogos" className="hud-label">
        ← Jogos
      </Link>
      <p className="hud-label">{fase?.nome}</p>
      <CardPartida partida={partida} mandante={equipe.get(partida.mandanteId)} visitante={equipe.get(partida.visitanteId)} />
      <Secao titulo="Súmula">
        <Sumula partida={partida} campeonato={c} />
      </Secao>
    </div>
  );
}

import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { Cabecalho, CardPartida, Numero } from '@/components/campeonato/ui';
import { indices, partidasDaFase } from '@/lib/campeonato/consultas';
import { resumirJogos } from '@/lib/domain/campeonato/classificacao';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jogos — Copa Jumentus' };

export default async function Jogos() {
  const c = await carregarCampeonato();
  const { equipe } = indices(c);
  const resumo = resumirJogos(c.partidas);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pb-20">
      <AutoAtualizar ativo={c.partidas.some((p) => p.status === 'ao-vivo')} />
      <Cabecalho titulo="Jogos" />

      <div className="hud-card relative grid grid-cols-4 gap-2 px-4 py-4">
        <Numero valor={resumo.jogos} rotulo="Jogos" />
        <Numero valor={resumo.empates} rotulo="Empates" />
        <Numero valor={resumo.gols} rotulo="Gols" />
        <Numero valor={resumo.mediaGols.toLocaleString('pt-BR')} rotulo="Média de gols" />
      </div>

      {c.partidas.length === 0 && <p className="text-sm text-text-3">A tabela de jogos ainda não saiu.</p>}

      {c.fases.map((fase) => {
        const partidas = partidasDaFase(c, fase.id);
        if (partidas.length === 0) return null;
        return (
          <section key={fase.id}>
            <h2 className="titulo-hero t-sm mb-4 text-2xl">{fase.nome}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {partidas.map((p) => (
                <CardPartida key={p.id} partida={p} mandante={equipe.get(p.mandanteId)} visitante={equipe.get(p.visitanteId)} href={`/jogos/${p.id}`} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

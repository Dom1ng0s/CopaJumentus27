import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { Cabecalho, CardPartida, Numero } from '@/components/campeonato/ui';
import { indices, lados, partidasDaFase } from '@/lib/campeonato/consultas';
import { resumirJogos, type ResumoJogos } from '@/lib/domain/campeonato/classificacao';
import type { Campeonato, Partida } from '@/lib/domain/campeonato/tipos';

function Resumo({ r, compacto }: { r: ResumoJogos; compacto?: boolean }) {
  if (compacto) {
    return (
      <p className="hud-label !text-[12px] text-text-3">
        {r.jogos} {r.jogos === 1 ? 'jogo' : 'jogos'} · {r.empates} {r.empates === 1 ? 'empate' : 'empates'} · {r.gols} gols · média {r.mediaGols.toLocaleString('pt-BR')} por jogo
      </p>
    );
  }
  return (
    <div className="hud-card relative grid grid-cols-4 gap-2 px-4 py-4">
      <Numero valor={r.jogos} rotulo="Jogos" />
      <Numero valor={r.empates} rotulo="Empates" />
      <Numero valor={r.gols} rotulo="Gols" />
      <Numero valor={r.mediaGols.toLocaleString('pt-BR')} rotulo="Média de gols" />
    </div>
  );
}

/** Jogos por fase; fases com rodadas mostram as estatísticas de cada rodada. */
export function PaginaJogos({ c, base }: { c: Campeonato; base: string }) {
  const { equipe } = indices(c);
  const cartoes = (lista: Partida[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {lista.map((p) => (
        <CardPartida key={p.id} partida={p} {...lados(c, p, equipe)} href={`${base}/jogos/${p.id}`} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pb-20">
      <AutoAtualizar ativo={c.partidas.some((p) => p.status === 'ao-vivo')} />
      <Cabecalho titulo="Jogos" />
      <Resumo r={resumirJogos(c.partidas)} />

      {c.partidas.length === 0 && <p className="text-sm text-text-3">A tabela de jogos ainda não saiu.</p>}

      {c.fases.map((fase) => {
        const partidas = partidasDaFase(c, fase.id);
        if (partidas.length === 0) return null;
        const rodadas = [...new Set(partidas.map((p) => p.rodada).filter((r): r is number => r !== undefined))].sort((a, b) => a - b);
        const semRodada = partidas.filter((p) => p.rodada === undefined);
        return (
          <section key={fase.id} className="space-y-6">
            <h2 className="titulo-hero t-sm text-2xl">{fase.nome}</h2>
            {rodadas.map((r) => {
              const daRodada = partidas.filter((p) => p.rodada === r);
              const dias = [...new Set(daRodada.map((p) => p.dia).filter(Boolean))];
              return (
                <div key={r} className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hud pb-2">
                    <h3 className="titulo-hero t-sm text-xl">
                      Rodada {r}
                      {dias.length === 1 && <span className="hud-label ml-3 !text-[12px]">Dia {dias[0]}</span>}
                    </h3>
                    <Resumo r={resumirJogos(daRodada)} compacto />
                  </div>
                  {cartoes(daRodada)}
                </div>
              );
            })}
            {semRodada.length > 0 && cartoes(semRodada)}
          </section>
        );
      })}
    </div>
  );
}

import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { ChaveMataMata, LinhaPartida } from '@/components/campeonato/Partidas';
import { AvisoEdicaoSemJogos, Cabecalho, Numero, Vazio, edicaoSemJogos } from '@/components/campeonato/ui';
import { indices, partidasDaFase } from '@/lib/campeonato/consultas';
import { andamento, projecaoMataMata } from '@/lib/domain/campeonato/andamento';
import { resumirJogos, type ResumoJogos } from '@/lib/domain/campeonato/classificacao';
import type { Campeonato, Partida } from '@/lib/domain/campeonato/tipos';

function Resumo({ r, compacto }: { r: ResumoJogos; compacto?: boolean }) {
  if (compacto) {
    return (
      <p className="hud-label !text-[12px] text-text-3">
        {r.jogos} {r.jogos === 1 ? 'jogo' : 'jogos'} · {r.empates} {r.empates === 1 ? 'empate' : 'empates'} · {r.gols} gols · média {r.mediaGols.toLocaleString('pt-BR')}
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

/**
 * Jogos por fase e rodada, em linhas compactas (horário à esquerda, um time por linha).
 * Atalhos fixos no topo levam ao jogo de agora, a cada rodada e ao mata-mata.
 */
export function PaginaJogos({ c, base }: { c: Campeonato; base: string }) {
  const { equipe } = indices(c);
  const a = andamento(c.partidas);
  const agora = a.aoVivo[0] ?? a.proxima;
  const projecao = projecaoMataMata(c);
  const modelo = c.modelo === 'copa-jumentus-8';

  const linhas = (lista: Partida[]) => (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {lista.map((p) => (
        <LinhaPartida
          key={p.id}
          c={c}
          partida={p}
          equipe={equipe}
          href={`${base}/jogos/${p.id}`}
          projecao={projecao.get(p.id)}
          destaque={p.id === a.proxima?.id && a.aoVivo.length === 0}
        />
      ))}
    </div>
  );

  // Atalhos: agora, cada rodada (com o dia) e as fases sem rodada.
  const atalhos: Array<{ href: string; rotulo: string; agora?: boolean }> = [];
  if (agora?.numero !== undefined) atalhos.push({ href: `#j${agora.numero}`, rotulo: a.aoVivo.length ? 'Ao vivo' : 'Próximo', agora: true });
  for (const fase of c.fases) {
    const partidas = partidasDaFase(c, fase.id);
    const rodadas = [...new Set(partidas.map((p) => p.rodada).filter((r): r is number => r !== undefined))].sort((x, y) => x - y);
    if (rodadas.length) rodadas.forEach((r) => atalhos.push({ href: `#rodada-${r}`, rotulo: `R${r}` }));
    else if (partidas.length) atalhos.push({ href: `#fase-${fase.id}`, rotulo: fase.nome });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-20">
      <AutoAtualizar ativo={a.aoVivo.length > 0} />
      <Cabecalho
        titulo="Jogos"
        legenda={
          a.total === 0
            ? undefined
            : a.terminou
              ? `Campeonato encerrado · ${a.total} jogos.`
              : `${a.encerrados} de ${a.total} jogos encerrados${a.dia ? ` · Dia ${a.dia}` : ''}.`
        }
      />

      {edicaoSemJogos(c) ? (
        <AvisoEdicaoSemJogos base={base} />
      ) : c.partidas.length === 0 ? (
        <Vazio texto="A tabela de jogos ainda não saiu." detalhe="Os jogos aparecem aqui assim que a organização definir os confrontos." />
      ) : (
        <>
          <Resumo r={resumirJogos(c.partidas)} />

          {atalhos.length > 1 && (
            <nav
              aria-label="Ir para"
              className="sticky top-[58px] z-30 -mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ background: 'rgba(6, 18, 42, 0.94)', backdropFilter: 'blur(12px)' }}
            >
              <ul className="flex w-max gap-1.5">
                {atalhos.map((at) => (
                  <li key={at.href}>
                    <a
                      href={at.href}
                      className="btn-mini !min-h-[2.5rem] whitespace-nowrap"
                      style={at.agora ? { borderColor: a.aoVivo.length ? 'var(--vermelho)' : 'var(--accent)', color: a.aoVivo.length ? 'var(--error-text)' : 'var(--dourado-claro)' } : undefined}
                    >
                      {at.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {c.fases.map((fase) => {
            const partidas = partidasDaFase(c, fase.id);
            if (partidas.length === 0) return null;
            const rodadas = [...new Set(partidas.map((p) => p.rodada).filter((r): r is number => r !== undefined))].sort((x, y) => x - y);
            const semRodada = partidas.filter((p) => p.rodada === undefined);
            const chave = modelo && fase.tipo === 'mata-mata' && semRodada.some((p) => p.numero === 34);
            return (
              <section key={fase.id} id={`fase-${fase.id}`} className="scroll-mt-32 space-y-6">
                <h2 className="titulo-hero t-sm text-3xl">{fase.nome}</h2>
                {rodadas.map((r) => {
                  const daRodada = partidas.filter((p) => p.rodada === r);
                  const dias = [...new Set(daRodada.map((p) => p.dia).filter(Boolean))];
                  return (
                    <div key={r} id={`rodada-${r}`} className="scroll-mt-32 space-y-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hud pb-2">
                        <h3 className="titulo-hero t-sm text-xl">
                          Rodada {r}
                          {dias.length === 1 && <span className="hud-label ml-3 !text-[12px]">Dia {dias[0]}</span>}
                        </h3>
                        {resumirJogos(daRodada).jogos > 0 && <Resumo r={resumirJogos(daRodada)} compacto />}
                      </div>
                      {linhas(daRodada)}
                    </div>
                  );
                })}
                {semRodada.length > 0 && (chave ? <ChaveMataMata c={c} equipe={equipe} base={base} projecao={projecao} /> : linhas(semRodada))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { BotaoImprimir } from '@/components/campeonato/BotaoImprimir';
import { ChaveMataMata, LinhaPartida } from '@/components/campeonato/Partidas';
import { TabelaClassificacao } from '@/components/campeonato/TabelaClassificacao';
import { Cabecalho, Vazio } from '@/components/campeonato/ui';
import { grupoEncerrado, indices, partidasDaFase } from '@/lib/campeonato/consultas';
import { projecaoMataMata } from '@/lib/domain/campeonato/andamento';
import { calcularClassificacao } from '@/lib/domain/campeonato/classificacao';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

export function PaginaClassificacao({ c, base }: { c: Campeonato; base: string }) {
  const { equipe } = indices(c);
  const aoVivo = c.partidas.some((p) => p.status === 'ao-vivo');
  const projecao = projecaoMataMata(c);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pb-20">
      <AutoAtualizar ativo={aoVivo} />
      <Cabecalho
        titulo="Classificação"
        legenda={`${c.nome}${c.edicao && !c.nome.includes(c.edicao) ? ` ${c.edicao}` : ''} · só jogos encerrados contam na tabela.`}
        acao={<BotaoImprimir />}
      />

      {c.fases.map((fase) => {
        const partidas = partidasDaFase(c, fase.id);
        const grupos = c.grupos.filter((g) => g.faseId === fase.id);
        return (
          <section key={fase.id}>
            <h2 className="titulo-hero t-sm mb-4 text-2xl">{fase.nome}</h2>
            {fase.tipo === 'grupos' ? (
              grupos.length === 0 ? (
                <Vazio texto="Grupos ainda não definidos." />
              ) : (
                <div className="grid gap-4">
                  {grupos.map((g) => (
                    <TabelaClassificacao
                      key={g.id}
                      titulo={grupos.length === 1 && g.nome === fase.nome ? '' : g.nome}
                      equipes={equipe}
                      zonas={fase.zonas}
                      encerrado={grupoEncerrado(c, g.id)}
                      linhas={calcularClassificacao(
                        g.equipeIds,
                        partidas.filter((p) => p.grupoId === g.id),
                        c.pontuacao,
                        c.criterios,
                        { desempates: fase.desempates },
                      )}
                    />
                  ))}
                </div>
              )
            ) : partidas.length === 0 ? (
              <Vazio texto="Confrontos ainda não definidos." />
            ) : c.modelo === 'copa-jumentus-8' && partidas.some((p) => p.numero === 34) ? (
              <ChaveMataMata c={c} equipe={equipe} base={base} projecao={projecao} />
            ) : (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {partidas.map((p) => (
                  <LinhaPartida key={p.id} c={c} partida={p} equipe={equipe} href={`${base}/jogos/${p.id}`} projecao={projecao.get(p.id)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

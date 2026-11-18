import { AutoAtualizar } from '@/components/campeonato/AutoAtualizar';
import { BotaoImprimir } from '@/components/campeonato/BotaoImprimir';
import { TabelaClassificacao } from '@/components/campeonato/TabelaClassificacao';
import { Cabecalho, CardPartida } from '@/components/campeonato/ui';
import { grupoEncerrado, indices, lados, partidasDaFase } from '@/lib/campeonato/consultas';
import { calcularClassificacao } from '@/lib/domain/campeonato/classificacao';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

export function PaginaClassificacao({ c, base }: { c: Campeonato; base: string }) {
  const { equipe } = indices(c);
  const aoVivo = c.partidas.some((p) => p.status === 'ao-vivo');

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
                <p className="text-sm text-text-3">Grupos ainda não definidos.</p>
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
              <p className="text-sm text-text-3">Confrontos ainda não definidos.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {partidas.map((p) => (
                  <CardPartida key={p.id} partida={p} {...lados(c, p, equipe)} href={`${base}/jogos/${p.id}`} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

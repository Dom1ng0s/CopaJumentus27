import { BotaoImprimir } from '@/components/campeonato/BotaoImprimir';
import { rotuloPosicao } from '@/lib/domain/tipos';
import { Cabecalho, Escudo, IconeLuva, SeloCapitao } from '@/components/campeonato/ui';
import { fundoVisivel, textoSobre } from '@/lib/campeonato/cores';
import { suspensoes } from '@/lib/campeonato/consultas';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

const ORDEM_POSICAO = { GOL: 0, LIN: 1, ZAG: 1, MEI: 1, ATA: 1 } as const;

/** Elencos das equipes no padrão do manual de marca (malha de camisa, caixa a 45°, luva e C dourado). */
export function PaginaEquipes({ c }: { c: Campeonato }) {
  const situacao = suspensoes(c);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20">
      <Cabecalho
        titulo="Equipes"
        legenda={c.sorteioOficializadoEm ? 'Elencos definidos no sorteio.' : 'Os elencos saem no sorteio.'}
        acao={<BotaoImprimir rotulo="Imprimir elencos" />}
      />
      <div className="imprimivel grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.equipes.map((e) => {
          const elenco = c.jogadores
            .filter((j) => j.equipeId === e.id)
            .sort((a, b) => ORDEM_POSICAO[a.posicao] - ORDEM_POSICAO[b.posicao] || (a.numero ?? 99) - (b.numero ?? 99));
          // Caixa do número: a secundária do time (manual), ou a primária quando a secundária some no marinho.
          const fundoNumero = fundoVisivel([e.corSecundaria, e.corPrimaria]);
          const textoNumero = fundoNumero ? textoSobre(fundoNumero) : 'var(--text1)';
          return (
            <section key={e.id} className="hud-card hud-clip modulo relative overflow-hidden">
              {/* Faixa larga na secundária e fina dourada, a 45° + textura de malha (manual §7.3) */}
              <div
                className="malha-camisa flex items-center gap-3 px-4 py-4"
                style={{
                  color: e.corTexto,
                  backgroundImage: `linear-gradient(135deg, ${e.corPrimaria} 0 82%, ${e.corSecundaria} 82% 91%, ${e.corPrimaria} 91% 93%, #D4A12A 93% 95%, ${e.corPrimaria} 95%)`,
                }}
              >
                <Escudo equipe={e} tamanho={52} />
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] font-bold uppercase tracking-wider opacity-85" style={{ color: e.corTexto }}>
                    {e.sigla}
                  </span>
                  <h2 className="titulo-hero t-sm line-clamp-2 text-2xl leading-[0.95]" style={{ color: e.corTexto }}>
                    {e.nome}
                  </h2>
                </div>
                {e.numeroTabela !== undefined && (
                  <span className="numero ml-auto text-2xl" style={{ color: e.corTexto }} title="Número na tabela do Grupo Único">
                    T{e.numeroTabela}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-[var(--panel-stroke)] px-3 py-2">
                {elenco.length === 0 && <li className="py-3 text-sm text-text-3">Elenco a definir.</li>}
                {elenco.map((j) => {
                  const ehCapitao = e.capitaoId === j.id;
                  const ehGoleiro = j.posicao === 'GOL';
                  return (
                    <li
                      key={j.id}
                      className="relative flex items-center gap-2 py-2 text-sm"
                      style={
                        ehCapitao
                          ? { borderBottom: '2px solid var(--accent)' }
                          : undefined
                      }
                    >
                      {/* Caixa do numero com ponta direita cortada a 45° */}
                      <span
                        className="numero corte-direita inline-flex h-7 w-9 shrink-0 items-center justify-center pr-1 text-lg"
                        style={{
                          background: j.numero !== undefined ? (fundoNumero ?? 'var(--surface3)') : 'var(--surface2)',
                          color: j.numero !== undefined ? textoNumero : 'var(--text3)',
                        }}
                      >
                        {j.numero ?? '—'}
                      </span>

                      <span className="min-w-0 flex-1 truncate font-mono text-base font-bold uppercase tracking-wide text-text-1">
                        {j.nome}
                      </span>

                      {situacao.get(j.id)?.suspenso && (
                        <span
                          className="corte-direita hud-label px-2 py-0.5 !text-[11px]"
                          style={{ background: 'var(--vermelho)', color: '#ffffff' }}
                        >
                          Suspenso
                        </span>
                      )}

                      {ehGoleiro && <IconeLuva tamanho={16} cor="var(--accent-armor)" />}
                      {ehCapitao && <SeloCapitao tamanho={22} />}

                      <span className="hud-label w-9 text-right !text-[12px] text-text-2">
                        {rotuloPosicao(j.posicao)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

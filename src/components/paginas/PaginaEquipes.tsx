import { BotaoImprimir } from '@/components/campeonato/BotaoImprimir';
import { Cabecalho, Escudo, IconeLuva, SeloCapitao } from '@/components/campeonato/ui';
import { suspensoes } from '@/lib/campeonato/consultas';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

const ORDEM_POSICAO = { GOL: 0, ZAG: 1, MEI: 2, ATA: 3 } as const;

/** Elencos das equipes no padrão do manual de marca (malha de camisa, caixa a 45°, luva e C dourado). */
export function PaginaEquipes({ c }: { c: Campeonato }) {
  const situacao = suspensoes(c);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20">
      <div className="flex items-start justify-between gap-4">
        <Cabecalho
          titulo="Equipes"
          legenda={c.sorteioOficializadoEm ? 'Elencos definidos no sorteio.' : 'Os elencos saem no sorteio.'}
        />
        <BotaoImprimir rotulo="Imprimir elencos" />
      </div>
      <div className="imprimivel grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.equipes.map((e) => {
          const elenco = c.jogadores
            .filter((j) => j.equipeId === e.id)
            .sort((a, b) => ORDEM_POSICAO[a.posicao] - ORDEM_POSICAO[b.posicao] || (a.numero ?? 99) - (b.numero ?? 99));
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
                  <h2 className="titulo-hero t-sm truncate text-2xl" style={{ color: e.corTexto }}>
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
                          background: j.numero !== undefined ? e.corSecundaria : 'var(--surface2)',
                          color: j.numero !== undefined ? '#ffffff' : 'var(--text3)',
                        }}
                      >
                        {j.numero ?? '—'}
                      </span>

                      <span className="min-w-0 flex-1 truncate font-mono text-base font-bold uppercase tracking-wide text-text-1">
                        {j.nome}
                      </span>

                      {situacao.get(j.id)?.suspenso && (
                        <span
                          className="corte-direita hud-label px-2 py-0.5 !text-[9px]"
                          style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}
                        >
                          Suspenso
                        </span>
                      )}

                      {ehGoleiro && <IconeLuva tamanho={16} cor="var(--accent-armor)" />}
                      {ehCapitao && <SeloCapitao tamanho={22} />}

                      <span className="hud-label w-8 text-right !text-[10px] text-text-3">
                        {j.posicao}
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

import { BotaoImprimir } from '@/components/campeonato/BotaoImprimir';
import { Cabecalho, Escudo } from '@/components/campeonato/ui';
import { suspensoes } from '@/lib/campeonato/consultas';
import type { Campeonato } from '@/lib/domain/campeonato/tipos';

const ORDEM_POSICAO = { GOL: 0, ZAG: 1, MEI: 2, ATA: 3 } as const;

/** Elencos das equipes (com impressão). */
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
              {/* Faixa larga na secundária e fina dourada, a 45° (manual, Diagonais) */}
              <div
                className="flex items-center gap-3 px-4 py-4"
                style={{
                  color: e.corTexto,
                  backgroundImage: `linear-gradient(135deg, ${e.corPrimaria} 0 82%, ${e.corSecundaria} 82% 91%, ${e.corPrimaria} 91% 93%, #D4A12A 93% 95%, ${e.corPrimaria} 95%)`,
                }}
              >
                <Escudo equipe={e} tamanho={52} />
                <h2 className="titulo-hero t-sm mr-12 text-2xl" style={{ color: e.corTexto }}>
                  {e.nome}
                </h2>
                {e.numeroTabela !== undefined && (
                  <span className="numero ml-auto text-2xl" style={{ color: e.corTexto }} title="Número na tabela do Grupo Único">
                    T{e.numeroTabela}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-[var(--panel-stroke)] px-4 py-2">
                {elenco.length === 0 && <li className="py-2 text-sm text-text-3">Elenco a definir.</li>}
                {elenco.map((j) => (
                  <li key={j.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="numero w-8 text-xl" style={{ color: 'var(--accent)' }}>{j.numero ?? ''}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-base font-bold uppercase tracking-wide">{j.nome}</span>
                    {situacao.get(j.id)?.suspenso && (
                      <span className="hud-label rounded-pill px-1.5 text-[9px]" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
                        Suspenso
                      </span>
                    )}
                    {e.capitaoId === j.id && (
                      <span className="numero flex h-6 w-6 items-center justify-center rounded-full text-sm" style={{ background: 'var(--gradient-leonida)', color: '#06122a' }} title="Capitão">
                        C
                      </span>
                    )}
                    <span className="hud-label w-8 text-right text-[9px]">{j.posicao}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

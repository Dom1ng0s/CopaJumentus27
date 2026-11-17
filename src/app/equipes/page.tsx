import { Cabecalho, Escudo } from '@/components/campeonato/ui';
import { suspensoes } from '@/lib/campeonato/consultas';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Equipes — Copa Jumentus' };

const ORDEM_POSICAO = { GOL: 0, ZAG: 1, MEI: 2, ATA: 3 } as const;

export default async function Equipes() {
  const c = await carregarCampeonato();
  const situacao = suspensoes(c);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20">
      <Cabecalho
        titulo="Equipes"
        legenda={c.sorteioOficializadoEm ? 'Elencos definidos no sorteio.' : 'Os elencos saem no sorteio.'}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.equipes.map((e) => {
          const elenco = c.jogadores
            .filter((j) => j.equipeId === e.id)
            .sort((a, b) => ORDEM_POSICAO[a.posicao] - ORDEM_POSICAO[b.posicao] || (a.numero ?? 99) - (b.numero ?? 99));
          return (
            <section key={e.id} className="hud-card relative overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: e.corPrimaria, color: e.corTexto }}>
                <Escudo equipe={e} tamanho={44} />
                <h2 className="titulo-hero t-sm text-lg" style={{ color: e.corTexto }}>
                  {e.nome}
                </h2>
              </div>
              <ul className="divide-y divide-[var(--panel-stroke)] px-4 py-2">
                {elenco.length === 0 && <li className="py-2 text-sm text-text-3">Elenco a definir.</li>}
                {elenco.map((j) => (
                  <li key={j.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="w-7 font-mono text-xs text-text-3">{j.numero ?? ''}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{j.nome}</span>
                    {situacao.get(j.id)?.suspenso && (
                      <span className="hud-label rounded-pill px-1.5 text-[9px]" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
                        Suspenso
                      </span>
                    )}
                    {e.capitaoId === j.id && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning font-mono text-[10px] font-bold text-black" title="Capitão">
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

import type { LinhaClassificada } from '@/lib/domain/campeonato/classificacao';
import type { Equipe, TipoZona, Zona } from '@/lib/domain/campeonato/tipos';
import { Escudo } from './ui';

interface Props {
  titulo: string;
  linhas: LinhaClassificada[];
  equipes: Map<string, Equipe>;
  zonas?: Zona[];
  /** Com o grupo encerrado, empate em tudo aparece como posição dividida ("="). */
  encerrado?: boolean;
}

const COLUNAS: Array<[keyof LinhaClassificada, string, string]> = [
  ['pontos', 'PTS', 'Pontos'],
  ['jogos', 'J', 'Jogos'],
  ['saldo', 'SG', 'Saldo de gols'],
  ['vitorias', 'V', 'Vitórias'],
  ['empates', 'E', 'Empates'],
  ['derrotas', 'D', 'Derrotas'],
  ['golsPro', 'GP', 'Gols pró'],
  ['golsContra', 'GC', 'Gols contra'],
  ['aproveitamento', '%', 'Aproveitamento'],
];

/** Zonas do manual: dourado (semifinal), cinza concreto (repescagem), vermelho (eliminado). Sem verde. */
export const ZONA: Record<TipoZona, { cor: string; rotulo: string }> = {
  semifinal: { cor: '#D4A12A', rotulo: 'Semifinal' },
  repescagem: { cor: '#C9CCD1', rotulo: 'Repescagem' },
  eliminado: { cor: '#E4002B', rotulo: 'Eliminado' },
};

function zonaDa(posicao: number, zonas?: Zona[]): TipoZona | undefined {
  return zonas?.find((z) => posicao >= z.de && posicao <= z.ate)?.zona;
}

export function TabelaClassificacao({ titulo, linhas, equipes, zonas, encerrado = false }: Props) {
  const temEmpate = encerrado && linhas.some((l) => l.empatada);
  return (
    <div className="hud-card hud-clip modulo imprimivel relative overflow-x-auto px-4 pb-5 pt-0">
      <h3 className="titulo-hero t-sm -mx-4 mb-2 px-4 py-3 text-2xl" style={{ background: 'var(--surface2)' }}>
        {titulo}
      </h3>
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="hud-label !text-[12px] text-text-3">
            <th className="w-12 py-2 text-left">Pos</th>
            <th className="py-2 text-left">Equipes</th>
            {COLUNAS.map(([, rotulo, titulo]) => (
              <th key={rotulo} className="w-11 py-2 text-center" title={titulo}>
                <abbr title={titulo} className="no-underline">
                  {rotulo}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const e = equipes.get(l.equipeId);
            // Com o grupo em andamento, a ordem é a da tabela; dividir posição só no fim.
            const empatada = encerrado && l.empatada;
            const posicao = encerrado ? l.posicao : i + 1;
            const zona = zonaDa(posicao, zonas);
            return (
              <tr key={l.equipeId} className="border-t border-hud">
                <td className="relative py-2 pl-2">
                  {zona && (
                    <span
                      className="absolute inset-y-1 left-0 w-[3px]"
                      style={{ background: ZONA[zona].cor }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="numero inline-flex h-8 w-8 items-center justify-center text-lg"
                    style={{ background: e?.corPrimaria ?? 'var(--surface2)', color: e?.corTexto ?? '#fff' }}
                    title={empatada ? 'Empate em todos os critérios: aguardando decisão da organização' : zona ? ZONA[zona].rotulo : undefined}
                  >
                    {posicao}
                    {empatada ? '=' : ''}
                  </span>
                  {zona && <span className="sr-only">, {ZONA[zona].rotulo}</span>}
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <Escudo equipe={e} tamanho={24} />
                    <span className="font-mono text-base font-bold uppercase tracking-wide">{e?.nome ?? l.equipeId}</span>
                  </span>
                </td>
                {COLUNAS.map(([campo, rotulo]) => (
                  <td
                    key={rotulo}
                    className={`py-2 text-center tabular-nums ${campo === 'pontos' ? 'numero text-2xl' : 'font-mono text-base font-semibold text-text-2'}`}
                    style={campo === 'pontos' ? { color: 'var(--accent)' } : undefined}
                  >
                    {String(l[campo])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {(zonas?.length || temEmpate) && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-2" aria-label="Legenda">
          {zonas?.map((z) => (
            <li key={`${z.de}-${z.ate}`} className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-[3px]" style={{ background: ZONA[z.zona].cor }} aria-hidden="true" />
              <span className="hud-label !text-[11px]">
                {ZONA[z.zona].rotulo} · {z.de === z.ate ? `${z.de}º` : `${z.de}º a ${z.ate}º`}
              </span>
            </li>
          ))}
          {temEmpate && (
            <li className="hud-label !text-[11px]">= empate em todos os critérios, aguardando decisão da organização</li>
          )}
        </ul>
      )}
    </div>
  );
}

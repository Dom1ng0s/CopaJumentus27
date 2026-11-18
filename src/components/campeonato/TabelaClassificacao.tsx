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

/** [campo, sigla, nome, aparece no celular]. No celular ficam PTS, J e SG, com o nome inteiro e sem rolagem lateral. */
const COLUNAS: Array<[keyof LinhaClassificada, string, string, boolean]> = [
  ['pontos', 'PTS', 'Pontos', true],
  ['jogos', 'J', 'Jogos', true],
  ['saldo', 'SG', 'Saldo de gols', true],
  ['vitorias', 'V', 'Vitórias', false],
  ['empates', 'E', 'Empates', false],
  ['derrotas', 'D', 'Derrotas', false],
  ['golsPro', 'GP', 'Gols pró', false],
  ['golsContra', 'GC', 'Gols contra', false],
  ['aproveitamento', '%', 'Aproveitamento', false],
];

const so = (celular: boolean) => (celular ? '' : 'hidden sm:table-cell');

/** Zonas do manual: dourado (semifinal), cinza concreto (repescagem), vermelho (eliminado). Sem verde. */
export const ZONA: Record<TipoZona, { cor: string; fundo: string; rotulo: string }> = {
  semifinal: { cor: '#D4A12A', fundo: 'rgba(212, 161, 42, 0.10)', rotulo: 'Semifinal' },
  repescagem: { cor: '#C9CCD1', fundo: 'rgba(201, 204, 209, 0.05)', rotulo: 'Repescagem' },
  eliminado: { cor: '#E4002B', fundo: 'rgba(228, 0, 43, 0.08)', rotulo: 'Eliminado' },
};

function zonaDa(posicao: number, zonas?: Zona[]): TipoZona | undefined {
  return zonas?.find((z) => posicao >= z.de && posicao <= z.ate)?.zona;
}

export function TabelaClassificacao({ titulo, linhas, equipes, zonas, encerrado = false }: Props) {
  const temEmpate = encerrado && linhas.some((l) => l.empatada);
  return (
    <div className="hud-card hud-clip modulo imprimivel relative px-3 pb-5 pt-0 sm:px-4">
      {titulo && (
        <h3 className="titulo-hero t-sm -mx-3 mb-2 px-3 py-3 text-2xl sm:-mx-4 sm:px-4" style={{ background: 'var(--surface2)' }}>
          {titulo}
        </h3>
      )}
      <table className="w-full table-fixed border-collapse text-sm sm:table-auto">
        <thead>
          <tr className="hud-label !text-[12px] text-text-2">
            <th className="w-11 py-2 pl-2 text-left sm:w-14">Pos</th>
            <th className="py-2 text-left">Equipe</th>
            {COLUNAS.map(([, rotulo, titulo, celular]) => (
              <th key={rotulo} className={`w-9 py-2 text-center sm:w-11 ${so(celular)}`} title={titulo}>
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
            // Linha de corte (como na MLS) onde a zona muda.
            const corte = i > 0 && zona !== zonaDa(encerrado ? linhas[i - 1].posicao : i, zonas);
            return (
              <tr
                key={l.equipeId}
                className={corte ? 'border-t-2 border-dashed' : 'border-t border-hud'}
                style={{ background: zona ? ZONA[zona].fundo : undefined, borderTopColor: corte ? 'var(--border-visible)' : undefined }}
              >
                <td className="relative py-2.5 pl-2">
                  {zona && (
                    <span className="absolute inset-y-0 left-0 w-[6px]" style={{ background: ZONA[zona].cor }} aria-hidden="true" />
                  )}
                  {/* Posição em quadrado neutro: a cor da linha é a zona, a cor do time fica no escudo. */}
                  <span
                    className="numero inline-flex h-8 w-8 items-center justify-center bg-[var(--surface3)] text-lg text-text-1"
                    title={empatada ? 'Empate em todos os critérios: aguardando decisão da organização' : zona ? ZONA[zona].rotulo : undefined}
                  >
                    {posicao}
                    {empatada ? '=' : ''}
                  </span>
                  {zona && <span className="sr-only">, {ZONA[zona].rotulo}</span>}
                </td>
                <td className="py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Escudo equipe={e} tamanho={26} />
                    <span className="truncate font-mono text-base font-bold uppercase tracking-wide">{e?.nome ?? l.equipeId}</span>
                  </span>
                </td>
                {COLUNAS.map(([campo, rotulo, , celular]) => (
                  <td
                    key={rotulo}
                    className={`py-2.5 text-center tabular-nums ${so(celular)} ${campo === 'pontos' ? 'numero text-2xl' : 'font-mono text-base font-semibold text-text-2'}`}
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
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-2" aria-label="Legenda">
          {zonas?.map((z) => (
            <li key={`${z.de}-${z.ate}`} className="flex items-center gap-2">
              <span className="inline-block h-4 w-[6px]" style={{ background: ZONA[z.zona].cor }} aria-hidden="true" />
              <span className="hud-label !text-[13px] text-text-1">
                {ZONA[z.zona].rotulo} · {z.de === z.ate ? `${z.de}º` : `${z.de}º a ${z.ate}º`}
              </span>
            </li>
          ))}
          {temEmpate && (
            <li className="hud-label !text-[13px]">= empate em todos os critérios, aguardando decisão da organização</li>
          )}
        </ul>
      )}
    </div>
  );
}

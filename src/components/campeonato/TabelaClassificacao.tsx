import type { LinhaClassificacao } from '@/lib/domain/campeonato/classificacao';
import type { Equipe } from '@/lib/domain/campeonato/tipos';
import { Escudo } from './ui';

interface Props {
  titulo: string;
  linhas: LinhaClassificacao[];
  equipes: Map<string, Equipe>;
}

const COLUNAS: Array<[keyof LinhaClassificacao, string]> = [
  ['pontos', 'PTS'],
  ['jogos', 'J'],
  ['saldo', 'SG'],
  ['vitorias', 'V'],
  ['empates', 'E'],
  ['derrotas', 'D'],
  ['golsPro', 'GP'],
  ['golsContra', 'GC'],
  ['aproveitamento', '%'],
];

export function TabelaClassificacao({ titulo, linhas, equipes }: Props) {
  return (
    <div className="hud-card hud-clip modulo relative overflow-x-auto px-4 pb-5 pt-0">
      <h3 className="titulo-hero t-sm -mx-4 mb-2 px-4 py-3 text-2xl" style={{ background: 'var(--surface2)' }}>
        {titulo}
      </h3>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="hud-label !text-[12px] text-text-3">
            <th className="w-10 py-2 text-left">Pos</th>
            <th className="py-2 text-left">Equipe</th>
            {COLUNAS.map(([, rotulo]) => (
              <th key={rotulo} className="w-11 py-2 text-center">
                {rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const e = equipes.get(l.equipeId);
            return (
              <tr key={l.equipeId} className="border-t border-hud">
                <td className="py-2">
                  <span
                    className="numero inline-flex h-8 w-8 items-center justify-center text-lg"
                    style={{ background: e?.corPrimaria ?? 'var(--surface2)', color: e?.corTexto ?? '#fff' }}
                  >
                    {i + 1}
                  </span>
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
                    {l[campo]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

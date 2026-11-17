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
    <div className="hud-card relative overflow-x-auto p-4">
      <h3 className="titulo-hero t-sm mb-3 text-lg">{titulo}</h3>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="hud-label text-[10px]">
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
                    className="inline-flex h-7 w-7 items-center justify-center font-mono text-xs font-bold"
                    style={{ background: e?.corPrimaria ?? 'var(--surface2)', color: e?.corTexto ?? '#fff' }}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <Escudo equipe={e} tamanho={24} />
                    <span className="font-semibold">{e?.nome ?? l.equipeId}</span>
                  </span>
                </td>
                {COLUNAS.map(([campo, rotulo]) => (
                  <td
                    key={rotulo}
                    className={`py-2 text-center font-mono tabular-nums ${campo === 'pontos' ? 'font-bold text-text-1' : 'text-text-2'}`}
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

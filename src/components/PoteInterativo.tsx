'use client';

import { useMemo, useState } from 'react';
import { IconeLuva } from '@/components/campeonato/ui';
import { HudCard } from '@/components/HudCard';
import { rotuloPosicao, type Jogador, type Posicao } from '@/lib/domain/tipos';

/**
 * Inscrito como aparece no pote: sem estrelas. A tela de sorteio nunca mostra o
 * nível de ninguém (pedido do operador em 19/11/2026), nem nos dados da página.
 */
export type InscritoDoPote = Pick<Jogador, 'id' | 'nome' | 'apelido' | 'posicao'>;

interface Props {
  pote: InscritoDoPote[];
  goleiros: InscritoDoPote[];
}

const porNome = (a: InscritoDoPote, b: InscritoDoPote) =>
  (a.apelido ?? a.nome).localeCompare(b.apelido ?? b.nome, 'pt-BR');
const POSICOES: Array<{ valor: 'TODOS' | Posicao; rotulo: string }> = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'LIN', rotulo: 'Linha' },
  { valor: 'GOL', rotulo: 'Goleiros' },
];

export function PoteInterativo({ pote, goleiros }: Props) {
  const [busca, setBusca] = useState('');
  const [posicaoFiltro, setPosicaoFiltro] = useState<'TODOS' | Posicao>('TODOS');

  const termo = busca.trim().toLowerCase();

  const poteFiltrado = useMemo(() => {
    if (posicaoFiltro === 'GOL') return [];
    return pote
      .filter((j) => {
        // "Linha" mostra todo o pote (inclui dados antigos com ZAG/MEI/ATA).
        if (!termo) return true;
        return (
          j.nome.toLowerCase().includes(termo) ||
          (j.apelido && j.apelido.toLowerCase().includes(termo))
        );
      })
      .sort(porNome);
  }, [pote, posicaoFiltro, termo]);

  const goleirosFiltrados = useMemo(() => {
    if (posicaoFiltro !== 'TODOS' && posicaoFiltro !== 'GOL') return [];
    return goleiros
      .filter((g) => {
        if (!termo) return true;
        return (
          g.nome.toLowerCase().includes(termo) ||
          (g.apelido && g.apelido.toLowerCase().includes(termo))
        );
      })
      .sort(porNome);
  }, [goleiros, posicaoFiltro, termo]);

  const totalExibido = poteFiltrado.length + goleirosFiltrados.length;

  return (
    <div>
      {/* Barra de busca e filtros por posicao */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label htmlFor="busca-pote" className="sr-only">
              Buscar jogador no pote
            </label>
            <input
              id="busca-pote"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar jogador por apelido ou nome..."
              className="campo"
            />
          </div>
          {(busca || posicaoFiltro !== 'TODOS') && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setPosicaoFiltro('TODOS');
              }}
              className="btn-mini shrink-0"
            >
              Limpar ({totalExibido})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {POSICOES.map((p) => {
            const contagem =
              p.valor === 'TODOS'
                ? pote.length + goleiros.length
                : p.valor === 'GOL'
                  ? goleiros.length
                  : pote.length;

            return (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPosicaoFiltro(p.valor)}
                aria-pressed={posicaoFiltro === p.valor}
                className="btn-mini"
              >
                <span>{p.rotulo}</span>
                <span className="ml-1.5 font-mono text-xs opacity-75">({contagem})</span>
              </button>
            );
          })}
        </div>
      </div>

      {totalExibido === 0 && (
        <HudCard className="p-8 text-center">
          <p className="titulo-hero text-2xl text-text-1">Nenhum jogador encontrado</p>
          <p className="mt-1 text-sm text-text-3">
            Nenhum inscrito corresponde aos filtros selecionados.
          </p>
        </HudCard>
      )}

      {/* Jogadores de linha em ordem alfabética, sem nível */}
      {poteFiltrado.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {poteFiltrado.map((j) => (
            <FichaPote key={j.id} jogador={j} />
          ))}
        </div>
      )}

      {/* Goleiros */}
      {goleirosFiltrados.length > 0 && (
        <div className={poteFiltrado.length > 0 ? 'mt-12' : ''}>
          <div className="mb-5">
            <h3 className="titulo-hero text-3xl sm:text-4xl">Goleiros</h3>
            <p className="mt-1 text-sm text-text-2">
              Sorteio separado, 1 por time
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {goleirosFiltrados.map((g) => (
              <FichaPote key={g.id} jogador={g} armor />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FichaPote({ jogador, armor = false }: { jogador: InscritoDoPote; armor?: boolean }) {
  const temApelidoDistinto = Boolean(jogador.apelido && jogador.apelido !== jogador.nome);

  return (
    <HudCard className="flex items-center justify-between gap-2 px-3 py-2.5 pb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {armor && <IconeLuva tamanho={14} cor="var(--accent-armor)" />}
          <p className="truncate text-sm font-semibold">{jogador.apelido ?? jogador.nome}</p>
        </div>
        <p
          className="truncate font-mono text-[11px] uppercase tracking-wider"
          style={{ color: armor ? 'var(--accent-armor)' : 'var(--text3)' }}
        >
          {[rotuloPosicao(jogador.posicao), temApelidoDistinto ? jogador.nome : ''].filter(Boolean).join(' · ')}
        </p>
      </div>
    </HudCard>
  );
}

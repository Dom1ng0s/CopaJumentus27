'use client';

import { useMemo, useState } from 'react';
import { IconeLuva } from '@/components/campeonato/ui';
import { Estrelas } from '@/components/Estrelas';
import { HudCard } from '@/components/HudCard';
import type { Estrelas as NivelEstrelas, Jogador, Posicao } from '@/lib/domain/tipos';

interface Props {
  pote: Jogador[];
  goleiros: Jogador[];
}

const NIVEIS = [6, 5, 4, 3, 2, 1] as const;
const POSICOES: Array<{ valor: 'TODOS' | Posicao; rotulo: string }> = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ATA', rotulo: 'ATA · Atacantes' },
  { valor: 'MEI', rotulo: 'MEI · Meias' },
  { valor: 'ZAG', rotulo: 'ZAG · Zagueiros' },
  { valor: 'GOL', rotulo: 'GOL · Goleiros' },
];

export function PoteInterativo({ pote, goleiros }: Props) {
  const [busca, setBusca] = useState('');
  const [posicaoFiltro, setPosicaoFiltro] = useState<'TODOS' | Posicao>('TODOS');

  const termo = busca.trim().toLowerCase();

  const poteFiltrado = useMemo(() => {
    if (posicaoFiltro === 'GOL') return [];
    return pote.filter((j) => {
      if (posicaoFiltro !== 'TODOS' && j.posicao !== posicaoFiltro) return false;
      if (!termo) return true;
      return (
        j.nome.toLowerCase().includes(termo) ||
        (j.apelido && j.apelido.toLowerCase().includes(termo))
      );
    });
  }, [pote, posicaoFiltro, termo]);

  const goleirosFiltrados = useMemo(() => {
    if (posicaoFiltro !== 'TODOS' && posicaoFiltro !== 'GOL') return [];
    return goleiros.filter((g) => {
      if (!termo) return true;
      return (
        g.nome.toLowerCase().includes(termo) ||
        (g.apelido && g.apelido.toLowerCase().includes(termo))
      );
    });
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
                  : pote.filter((j) => j.posicao === p.valor).length;

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

      {/* Jogadores de linha agrupados por nivel de estrela */}
      {poteFiltrado.length > 0 && (
        <div className="space-y-6">
          {NIVEIS.map((nivel) => {
            const doNivel = poteFiltrado.filter((j) => j.estrelas === nivel);
            if (doNivel.length === 0) return null;
            return (
              <div key={nivel}>
                <div className="mb-3 flex items-center gap-3">
                  <Estrelas nivel={nivel} tamanho={14} pulsar={false} />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-text-2">
                    {doNivel.length} jogador{doNivel.length > 1 ? 'es' : ''}
                  </span>
                  <div className="halftone h-[8px] flex-1 opacity-60" />
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {doNivel.map((j) => (
                    <FichaPote key={j.id} jogador={j} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goleiros */}
      {goleirosFiltrados.length > 0 && (
        <div className={poteFiltrado.length > 0 ? 'mt-12' : ''}>
          <div className="mb-5">
            <h3 className="titulo-hero text-3xl sm:text-4xl">Goleiros</h3>
            <p className="mt-1 text-sm text-text-2">
              Sorteio separado, 1 por time — estrelas não contam no balanceamento
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

function FichaPote({ jogador, armor = false }: { jogador: Jogador; armor?: boolean }) {
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
          {jogador.posicao}
          {temApelidoDistinto ? ` · ${jogador.nome}` : ''}
        </p>
      </div>
      <Estrelas nivel={jogador.estrelas as NivelEstrelas} tamanho={11} pulsar={false} />
    </HudCard>
  );
}

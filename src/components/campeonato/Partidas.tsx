// Linha de jogo compacta (lista de jogos, estilo placar de TV) e chave do mata-mata.
// Peças de jogo do manual: marinho, dourado no vencedor, vermelho só em "ao vivo" e pênaltis.

import Link from 'next/link';
import { lados } from '@/lib/campeonato/consultas';
import type { Projecao } from '@/lib/domain/campeonato/andamento';
import { vencedor } from '@/lib/domain/campeonato/classificacao';
import type { Campeonato, Equipe, Partida } from '@/lib/domain/campeonato/tipos';
import { Escudo } from './ui';

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** "08:35" e "SÁB 16/01" a partir de "2027-01-16T08:35". */
export function partesDaData(dataHora?: string): { hora?: string; dia?: string } {
  if (!dataHora) return {};
  const [data, hora] = dataHora.split('T');
  const [a, m, d] = data.split('-').map(Number);
  return { hora, dia: `${DIAS[new Date(a, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}` };
}

function penaltisDe(p: Partida) {
  return p.golsMandante === p.golsVisitante && (p.penaltisMandante !== undefined || p.penaltisVisitante !== undefined);
}

/** Coluna da esquerda: horário (agendada), AO VIVO ou FIM. */
function Situacao({ partida }: { partida: Partida }) {
  if (partida.status === 'ao-vivo') {
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--vermelho)]" aria-hidden="true" />
        <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-[var(--error-text)]">Ao vivo</span>
      </span>
    );
  }
  if (partida.status === 'encerrada') {
    return <span className="font-mono text-[13px] font-bold uppercase tracking-wider text-text-3">Fim</span>;
  }
  const { hora, dia } = partesDaData(partida.dataHora);
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="numero text-xl text-text-1">{hora ?? '--:--'}</span>
      {dia && <span className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-3">{dia}</span>}
    </span>
  );
}

interface Lado {
  equipe?: Equipe;
  rotulo?: string;
  /** "Se acabasse agora": equipe que ocupa a posição hoje. */
  provisoria?: Equipe;
  gols?: number;
  penaltis?: number;
  venceu: boolean;
  perdeu: boolean;
}

function LinhaLado({ lado, mostraPlacar, mostraPenaltis }: { lado: Lado; mostraPlacar: boolean; mostraPenaltis: boolean }) {
  const { equipe, rotulo, provisoria, venceu, perdeu } = lado;
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${perdeu ? 'opacity-60' : ''}`}>
      <Escudo equipe={equipe ?? provisoria} tamanho={24} />
      <span className="min-w-0 flex-1">
        {equipe ? (
          <span className={`block truncate font-mono text-[15px] font-bold uppercase tracking-wide text-text-1`}>
            {equipe.nome}
          </span>
        ) : (
          <span className="block truncate font-mono text-[15px] font-semibold uppercase tracking-wide text-text-2">
            {rotulo ?? 'A definir'}
            {provisoria && <span className="ml-1.5 normal-case tracking-normal text-text-3">· hoje {provisoria.sigla}</span>}
          </span>
        )}
      </span>
      {mostraPenaltis && (
        <span className="font-mono text-sm font-bold tabular-nums text-[var(--error-text)]" aria-label={`${lado.penaltis ?? 0} nos pênaltis`}>
          ({lado.penaltis ?? 0})
        </span>
      )}
      {mostraPlacar && (
        <span className="numero w-7 text-right text-2xl" style={{ color: venceu ? 'var(--accent)' : 'var(--text1)' }}>
          {lado.gols}
        </span>
      )}
    </div>
  );
}

function ladosDaPartida(c: Campeonato, p: Partida, equipe: Map<string, Equipe>, projecao?: Projecao): [Lado, Lado] {
  const l = lados(c, p, equipe);
  const v = vencedor(p);
  const decidida = p.status === 'encerrada' && !!v;
  return [
    {
      equipe: l.mandante,
      rotulo: l.rotuloMandante,
      provisoria: projecao?.mandanteId ? equipe.get(projecao.mandanteId) : undefined,
      gols: p.golsMandante,
      penaltis: p.penaltisMandante,
      venceu: decidida && v === p.mandanteId,
      perdeu: decidida && v !== p.mandanteId,
    },
    {
      equipe: l.visitante,
      rotulo: l.rotuloVisitante,
      provisoria: projecao?.visitanteId ? equipe.get(projecao.visitanteId) : undefined,
      gols: p.golsVisitante,
      penaltis: p.penaltisVisitante,
      venceu: decidida && v === p.visitanteId,
      perdeu: decidida && v !== p.visitanteId,
    },
  ];
}

/** Jogo em duas linhas (mandante em cima, visitante embaixo) com horário ou situação à esquerda. */
export function LinhaPartida({
  c,
  partida,
  equipe,
  href,
  projecao,
  destaque,
}: {
  c: Campeonato;
  partida: Partida;
  equipe: Map<string, Equipe>;
  href: string;
  projecao?: Projecao;
  /** Próximo jogo: filete dourado à esquerda. */
  destaque?: boolean;
}) {
  const [m, v] = ladosDaPartida(c, partida, equipe, projecao);
  const mostraPlacar = partida.status !== 'agendada';
  const mostraPenaltis = mostraPlacar && penaltisDe(partida);
  const aoVivo = partida.status === 'ao-vivo';
  return (
    <Link
      href={href}
      id={partida.numero !== undefined ? `j${partida.numero}` : undefined}
      className="hud-card relative grid scroll-mt-32 grid-cols-[4.25rem_1fr] items-center gap-3 py-2.5 pl-3 pr-3 transition-colors duration-150 hover:bg-[var(--row-hover)] active:bg-[var(--row-hover)]"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {(aoVivo || destaque) && (
        <span
          className="absolute inset-y-0 left-0 w-[4px]"
          style={{ background: aoVivo ? 'var(--vermelho)' : 'var(--accent)' }}
          aria-hidden="true"
        />
      )}
      <div className="flex flex-col items-center gap-1 border-r border-hud pr-2 text-center">
        {partida.numero !== undefined && <span className="font-mono text-[11px] font-bold tracking-wider text-[var(--accent)]">J{partida.numero}</span>}
        <Situacao partida={partida} />
      </div>
      <div className="min-w-0 space-y-1.5">
        <LinhaLado lado={m} mostraPlacar={mostraPlacar} mostraPenaltis={mostraPenaltis} />
        <LinhaLado lado={v} mostraPlacar={mostraPlacar} mostraPenaltis={mostraPenaltis} />
        {/* "Rodada N" já é o título da seção; o rótulo só aparece quando diz algo a mais (ex.: Semifinal 1). */}
        {partida.rotulo && !/^rodada\b/i.test(partida.rotulo) && (
          <p className="font-mono text-[12px] font-semibold uppercase tracking-wider text-text-3">{partida.rotulo}</p>
        )}
      </div>
    </Link>
  );
}

/** Etapas da chave do modelo oficial, pelos números dos jogos (CLAUDE.md §8.6). */
const ETAPAS: Array<{ titulo: string; jogos: number[]; destino?: Record<number, string> }> = [
  { titulo: 'Repescagem', jogos: [29, 30], destino: { 29: 'Vencedor → Semifinal 2', 30: 'Vencedor → Semifinal 1' } },
  { titulo: 'Semifinais', jogos: [31, 32], destino: { 31: 'Vencedor → Final · perdedor → 3º lugar', 32: 'Vencedor → Final · perdedor → 3º lugar' } },
  { titulo: 'Finais', jogos: [34, 33] },
];

/**
 * Chave do mata-mata: Repescagem → Semifinais → Final e 3º lugar, em colunas no
 * desktop e em etapas empilhadas no celular. Cada jogo diz para onde o vencedor vai.
 * Vagas ainda abertas mostram a origem ("3º do Grupo Único") e quem ocupa a posição hoje.
 */
export function ChaveMataMata({
  c,
  equipe,
  base,
  projecao,
}: {
  c: Campeonato;
  equipe: Map<string, Equipe>;
  base: string;
  projecao: Map<string, Projecao>;
}) {
  const porNumero = new Map(c.partidas.filter((p) => p.numero !== undefined).map((p) => [p.numero!, p]));
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-4">
      {ETAPAS.map((etapa, i) => (
        <section key={etapa.titulo} aria-label={etapa.titulo} className="relative">
          <h3 className="hud-label mb-3 flex items-center gap-2 !text-[13px]">
            <span className="numero text-lg text-[var(--accent)]">{i + 1}</span>
            {etapa.titulo}
          </h3>
          <ol className="space-y-3 lg:flex lg:h-[calc(100%-2rem)] lg:flex-col lg:justify-around lg:space-y-0 lg:gap-3">
            {etapa.jogos.map((n) => {
              const p = porNumero.get(n);
              if (!p) return null;
              const final = n === 34;
              return (
                <li key={n} className={final ? 'relative' : undefined}>
                  {final && <div className="filete mb-1 w-full" aria-hidden="true" />}
                  <LinhaPartida c={c} partida={p} equipe={equipe} href={`${base}/jogos/${p.id}`} projecao={projecao.get(p.id)} />
                  {etapa.destino?.[n] && (
                    <p className="mt-1 pl-1 font-mono text-[12px] font-semibold uppercase tracking-wider text-text-3">{etapa.destino[n]}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

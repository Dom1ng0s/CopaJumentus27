// Peças visuais do campeonato, sobre os tokens do design system (globals.css).

import Link from 'next/link';
import type { Equipe, Partida } from '@/lib/domain/campeonato/tipos';
import { formatarDataHora } from '@/lib/campeonato/consultas';

export function Escudo({ equipe, tamanho = 28 }: { equipe?: Equipe; tamanho?: number }) {
  if (!equipe) return <span style={{ width: tamanho, height: tamanho }} className="inline-block" />;
  if (!equipe.escudo) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full font-mono text-[10px] font-bold"
        style={{ width: tamanho, height: tamanho, background: equipe.corPrimaria, color: equipe.corTexto }}
      >
        {equipe.sigla}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={equipe.escudo} alt="" width={tamanho} height={tamanho} className="shrink-0 object-contain" style={{ width: tamanho, height: tamanho }} />;
}

export function Cabecalho({ titulo, legenda }: { titulo: string; legenda?: string }) {
  return (
    <div className="mb-6">
      <h1 className="titulo-hero t-xl text-4xl sm:text-5xl">{titulo}</h1>
      {legenda && <p className="mt-2 text-sm text-text-2">{legenda}</p>}
    </div>
  );
}

export function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="hud-card relative p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="titulo-hero t-sm text-xl">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Aviso({ texto, tipo = 'erro' }: { texto?: string; tipo?: 'erro' | 'ok' | 'info' }) {
  if (!texto) return null;
  const cores = {
    erro: { bg: 'var(--error-bg)', fg: 'var(--error-text)' },
    ok: { bg: 'var(--success-bg)', fg: 'var(--success-text)' },
    info: { bg: 'var(--warning-bg)', fg: 'var(--warning-text)' },
  }[tipo];
  return (
    <p role={tipo === 'erro' ? 'alert' : 'status'} className="mb-4 rounded-component px-4 py-3 text-sm font-semibold" style={{ background: cores.bg, color: cores.fg }}>
      {texto}
    </p>
  );
}

const ROTULO_STATUS: Record<Partida['status'], string> = {
  agendada: 'Agendada',
  'ao-vivo': 'Ao vivo',
  encerrada: 'Encerrado',
};

export function SeloStatus({ status }: { status: Partida['status'] }) {
  const estilo =
    status === 'ao-vivo'
      ? { background: 'var(--error-bg)', color: 'var(--error-text)' }
      : status === 'encerrada'
        ? { background: 'var(--surface2)', color: 'var(--text2)' }
        : { background: 'transparent', color: 'var(--text3)', boxShadow: 'inset 0 0 0 1px var(--border-visible)' };
  return (
    <span className="hud-label inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[10px]" style={estilo}>
      {status === 'ao-vivo' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" />}
      {ROTULO_STATUS[status]}
    </span>
  );
}

/** Card de partida para listas (público e admin). */
export function CardPartida({
  partida,
  mandante,
  visitante,
  href,
}: {
  partida: Partida;
  mandante?: Equipe;
  visitante?: Equipe;
  href?: string;
}) {
  const mostraPlacar = partida.status !== 'agendada';
  const penaltis = partida.penaltisMandante !== undefined || partida.penaltisVisitante !== undefined;
  const conteudo = (
    <div className="hud-card relative px-3 py-3 transition-colors duration-200 hover:bg-[var(--row-hover)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="hud-label truncate text-[10px]">{partida.rotulo ?? ''}</span>
        <SeloStatus status={partida.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <Escudo equipe={mandante} tamanho={40} />
          <span className="w-full truncate text-xs font-semibold">{mandante?.nome ?? '?'}</span>
        </div>
        <div className="text-center">
          <p className="font-mono text-3xl font-bold tabular-nums">
            {mostraPlacar ? `${partida.golsMandante} : ${partida.golsVisitante}` : 'x'}
          </p>
          {mostraPlacar && penaltis && (
            <p className="font-mono text-[11px] text-text-3">
              pên. {partida.penaltisMandante ?? 0}–{partida.penaltisVisitante ?? 0}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <Escudo equipe={visitante} tamanho={40} />
          <span className="w-full truncate text-xs font-semibold">{visitante?.nome ?? '?'}</span>
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[11px] text-text-3">
        {formatarDataHora(partida.dataHora)}
        {partida.local ? ` · ${partida.local}` : ''}
      </p>
    </div>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}

/** Número grande com rótulo, usado no resumo dos jogos. */
export function Numero({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-2xl font-bold tabular-nums">{valor}</p>
      <p className="hud-label text-[10px]">{rotulo}</p>
    </div>
  );
}

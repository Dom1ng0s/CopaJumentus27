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

/** Título de tela em Anton com o filete dourado e o grupo de faixas a 45° à direita. */
export function Cabecalho({ titulo, legenda }: { titulo: string; legenda?: string }) {
  return (
    <div className="relative mb-8 overflow-hidden pb-4 pt-2">
      <div className="faixas hidden sm:block" aria-hidden="true" />
      <h1 className="titulo-hero t-xl relative text-5xl sm:text-6xl">{titulo}</h1>
      <div className="filete relative mt-3 w-24" aria-hidden="true" />
      {legenda && <p className="relative mt-3 text-base text-text-2">{legenda}</p>}
    </div>
  );
}

export function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="hud-card hud-clip modulo relative p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-hud pb-3">
        <h2 className="titulo-hero t-sm text-2xl">{titulo}</h2>
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
      ? { background: 'var(--vermelho)', color: '#ffffff' }
      : status === 'encerrada'
        ? { background: 'var(--surface2)', color: 'var(--text2)' }
        : { background: 'transparent', color: 'var(--text3)', boxShadow: 'inset 0 0 0 1px var(--border-visible)' };
  return (
    <span className="selo-status hud-label inline-flex items-center gap-1.5 px-2 py-0.5 !text-[11px]" style={estilo}>
      {status === 'ao-vivo' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {ROTULO_STATUS[status]}
    </span>
  );
}

/** Card de partida para listas (público e admin). */
export function CardPartida({
  partida,
  mandante,
  visitante,
  rotuloMandante,
  rotuloVisitante,
  href,
}: {
  partida: Partida;
  mandante?: Equipe;
  visitante?: Equipe;
  /** Texto quando a equipe ainda não está definida (ex.: "3º do Grupo Único"). */
  rotuloMandante?: string;
  rotuloVisitante?: string;
  href?: string;
}) {
  const mostraPlacar = partida.status !== 'agendada';
  // Pênaltis só valem (e só aparecem) com empate no tempo normal.
  const penaltis = partida.golsMandante === partida.golsVisitante && (partida.penaltisMandante !== undefined || partida.penaltisVisitante !== undefined);
  const conteudo = (
    <div className="hud-card hud-clip modulo relative px-3 pb-4 pt-3 transition-colors duration-200 hover:bg-[var(--row-hover)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="hud-label truncate !text-[11px]">
          {partida.numero !== undefined && <span style={{ color: 'var(--accent)' }}>J{partida.numero} · </span>}
          {partida.rotulo ?? ''}
        </span>
        <SeloStatus status={partida.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <Escudo equipe={mandante} tamanho={40} />
          <span className={`w-full truncate font-mono text-sm font-bold uppercase tracking-wide ${mandante ? '' : 'text-text-3'}`}>{mandante?.nome ?? rotuloMandante ?? 'A definir'}</span>
        </div>
        <div className="text-center">
          <p className="numero text-4xl">
            {mostraPlacar ? `${partida.golsMandante} : ${partida.golsVisitante}` : 'x'}
          </p>
          {mostraPlacar && penaltis && (
            <p className="font-mono text-xs font-semibold" style={{ color: 'var(--error-text)' }}>
              pên. {partida.penaltisMandante ?? 0}–{partida.penaltisVisitante ?? 0}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <Escudo equipe={visitante} tamanho={40} />
          <span className={`w-full truncate font-mono text-sm font-bold uppercase tracking-wide ${visitante ? '' : 'text-text-3'}`}>{visitante?.nome ?? rotuloVisitante ?? 'A definir'}</span>
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[13px] font-semibold uppercase tracking-wide text-text-3">
        {partida.dataHora ? formatarDataHora(partida.dataHora) : partida.dia !== undefined ? `Dia ${partida.dia}` : formatarDataHora()}
        {partida.campo ? ` · ${partida.campo}` : ''}
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
      <p className="numero text-4xl text-text-1">{valor}</p>
      <p className="hud-label mt-1 !text-[11px]">{rotulo}</p>
    </div>
  );
}

/** Cartão de arbitragem desenhado (sem emoji): amarelo ou vermelho. */
export function Cartao({ cor, quantidade }: { cor: 'amarelo' | 'vermelho'; quantidade?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${quantidade ?? 1} ${cor === 'amarelo' ? 'amarelo' : 'vermelho'}`}>
      <span
        className="inline-block h-[18px] w-[13px] rounded-[2px]"
        style={{ background: cor === 'amarelo' ? '#F2CB57' : '#E4002B', transform: 'rotate(8deg)' }}
        aria-hidden="true"
      />
      {quantidade !== undefined && <span className="numero text-2xl">{quantidade}</span>}
    </span>
  );
}

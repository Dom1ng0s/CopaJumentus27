// Peças visuais do campeonato, sobre os tokens do design system (globals.css).

import Link from 'next/link';
import type { Equipe, Partida } from '@/lib/domain/campeonato/tipos';
import { formatarDataHora } from '@/lib/campeonato/consultas';
import { escudoDe, marcaPorNome } from '@/lib/campeonato/marcas';
import { Toast } from './Toast';

export function Escudo({ equipe, tamanho = 28 }: { equipe?: Equipe; tamanho?: number }) {
  if (!equipe) return <span style={{ width: tamanho, height: tamanho }} className="inline-block" />;
  if (!equipe.escudo) {
    return (
      <span
        className="inline-flex items-center justify-center font-mono text-[10px] font-bold"
        style={{ width: tamanho, height: tamanho, background: equipe.corPrimaria, color: equipe.corTexto }}
      >
        {equipe.sigla}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={equipe.escudo} alt="" width={tamanho} height={tamanho} className="shrink-0 object-contain" style={{ width: tamanho, height: tamanho }} />;
}

/** Escudo a partir do nome do time (para sorteio, cerimônia e resultado estático). */
export function EscudoPorNome({ nome, tamanho = 36 }: { nome: string; tamanho?: number }) {
  const m = marcaPorNome(nome);
  if (!m) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center bg-[var(--surface2)] font-mono text-[10px] font-bold text-text-1"
        style={{ width: tamanho, height: tamanho }}
      >
        {nome.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={escudoDe(m.slug)}
      alt=""
      width={tamanho}
      height={tamanho}
      className="shrink-0 object-contain"
      style={{ width: tamanho, height: tamanho }}
    />
  );
}

/** Ícone de luva estilizada para goleiro (sem emoji, manual §Proibido). */
export function IconeLuva({ tamanho = 16, cor = 'var(--text2)' }: { tamanho?: number; cor?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-label="Goleiro"
      style={{ color: cor }}
      className="shrink-0"
    >
      <path
        d="M6 13V7a1.5 1.5 0 013 0v4V5a1.5 1.5 0 013 0v6V6a1.5 1.5 0 013 0v6V8a1.5 1.5 0 013 0v7a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L3.6 14a1.5 1.5 0 012.4-1.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Selo circular dourado "C" de capitão (manual §7.3 — Elenco). */
export function SeloCapitao({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <span
      className="numero inline-flex shrink-0 items-center justify-center rounded-full text-xs"
      style={{
        width: tamanho,
        height: tamanho,
        background: 'var(--gradient-leonida)',
        color: '#06122a',
      }}
      title="Capitão"
      aria-label="Capitão"
    >
      C
    </span>
  );
}

/**
 * Título de tela em Anton com o filete dourado e o grupo de faixas a 45° no canto
 * direito. O texto reserva a largura das faixas: elas nunca passam atrás de título,
 * legenda ou botão (manual §7.2). A ação (ex.: Imprimir) fica sob a legenda.
 */
export function Cabecalho({ titulo, legenda, acao }: { titulo: string; legenda?: string; acao?: React.ReactNode }) {
  return (
    <div className="relative mb-8 overflow-hidden pb-4 pt-8 sm:pt-10">
      <div className="faixas hidden sm:block" aria-hidden="true" />
      <div className="relative sm:pr-[280px]">
        <h1 className="titulo-hero t-xl text-5xl sm:text-6xl">{titulo}</h1>
        <div className="filete mt-3 w-24" aria-hidden="true" />
        {legenda && <p className="mt-3 text-base text-text-2">{legenda}</p>}
        {acao && <div className="mt-4 flex flex-wrap gap-2">{acao}</div>}
      </div>
    </div>
  );
}

/** Estado vazio: módulo tracejado com uma frase curta, sem ilustração genérica. */
export function Vazio({ texto, detalhe }: { texto: string; detalhe?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 border border-dashed border-[var(--border-visible)] px-4 py-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/imagens/logo/copa-jumentus-logo.png" alt="" width={28} height={38} className="mb-2 h-9 w-auto opacity-40 grayscale" />
      <p className="font-mono text-sm font-bold uppercase tracking-[0.06em] text-text-2">{texto}</p>
      {detalhe && <p className="text-sm text-text-3">{detalhe}</p>}
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
  // Confirmação vira toast; erro e informação ficam fixos na página.
  if (tipo === 'ok') return <Toast key={texto} texto={texto} />;
  const cores = {
    erro: { bg: 'var(--error-bg)', fg: 'var(--error-text)', borda: 'var(--error)' },
    ok: { bg: 'var(--success-bg)', fg: 'var(--success-text)', borda: 'var(--success)' },
    info: { bg: 'var(--surface2)', fg: 'var(--text1)', borda: 'var(--accent)' },
  }[tipo];
  return (
    <p
      role={tipo === 'erro' ? 'alert' : 'status'}
      className="mb-4 rounded-component border-l-[3px] px-4 py-3 text-sm font-semibold"
      style={{ background: cores.bg, color: cores.fg, borderLeftColor: cores.borda }}
    >
      {texto}
    </p>
  );
}

const ROTULO_STATUS: Record<Partida['status'], string> = {
  agendada: 'Agendada',
  'ao-vivo': 'Ao vivo',
  encerrada: 'Encerrada',
};

export function SeloStatus({ status }: { status: Partida['status'] }) {
  const estilo =
    status === 'ao-vivo'
      ? { background: 'var(--vermelho)', color: '#ffffff' }
      : status === 'encerrada'
        ? { background: 'var(--surface2)', color: 'var(--text2)' }
        : { background: 'transparent', color: 'var(--text3)', boxShadow: 'inset 0 0 0 1px var(--border-visible)' };
  return (
    <span className="selo-status corte-direita hud-label inline-flex items-center gap-1.5 px-2.5 py-0.5 !text-[11px]" style={estilo}>
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
  const encerrada = partida.status === 'encerrada';
  const mandanteVenceu =
    encerrada &&
    (partida.golsMandante > partida.golsVisitante ||
      (penaltis && (partida.penaltisMandante ?? 0) > (partida.penaltisVisitante ?? 0)));
  const visitanteVenceu =
    encerrada &&
    (partida.golsVisitante > partida.golsMandante ||
      (penaltis && (partida.penaltisVisitante ?? 0) > (partida.penaltisMandante ?? 0)));

  const conteudo = (
    <div className="hud-card hud-clip modulo relative overflow-hidden px-3 pb-4 pt-3 transition-colors duration-200 hover:bg-[var(--row-hover)]">
      {/* Filetes superiores nas cores das duas equipes */}
      {(mandante || visitante) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[3px]" aria-hidden="true">
          <span className="w-1/2" style={{ background: mandante?.corPrimaria ?? 'var(--surface3)' }} />
          <span className="w-1/2" style={{ background: visitante?.corPrimaria ?? 'var(--surface3)' }} />
        </div>
      )}
      <div className="mb-2 flex items-center justify-between gap-2 pt-0.5">
        <span className="hud-label truncate !text-[12px]">
          {partida.numero !== undefined && <span style={{ color: 'var(--accent)' }}>J{partida.numero} · </span>}
          {partida.rotulo ?? ''}
        </span>
        <SeloStatus status={partida.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className={`flex min-w-0 flex-col items-center gap-1 text-center ${visitanteVenceu ? 'opacity-65' : ''}`}>
          <Escudo equipe={mandante} tamanho={40} />
          <span className={`line-clamp-2 w-full font-mono text-sm font-bold uppercase leading-tight tracking-wide ${mandante ? '' : 'text-text-3'}`}>{mandante?.nome ?? rotuloMandante ?? 'A definir'}</span>
        </div>
        <div className="text-center">
          <p className="numero text-4xl">
            {mostraPlacar ? `${partida.golsMandante} : ${partida.golsVisitante}` : (partida.dataHora?.split('T')[1] ?? 'x')}
          </p>
          {mostraPlacar && penaltis && (
            <p className="font-mono text-xs font-semibold" style={{ color: 'var(--error-text)' }}>
              pên. {partida.penaltisMandante ?? 0}–{partida.penaltisVisitante ?? 0}
            </p>
          )}
        </div>
        <div className={`flex min-w-0 flex-col items-center gap-1 text-center ${mandanteVenceu ? 'opacity-65' : ''}`}>
          <Escudo equipe={visitante} tamanho={40} />
          <span className={`line-clamp-2 w-full font-mono text-sm font-bold uppercase leading-tight tracking-wide ${visitante ? '' : 'text-text-3'}`}>{visitante?.nome ?? rotuloVisitante ?? 'A definir'}</span>
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[13px] font-semibold uppercase tracking-wide text-text-2">
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

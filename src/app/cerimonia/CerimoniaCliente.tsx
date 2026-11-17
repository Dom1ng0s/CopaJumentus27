'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Estrelas } from '@/components/Estrelas';
import { HudCard } from '@/components/HudCard';
import { PalmBackdrop } from '@/components/PalmBackdrop';
import { TOLERANCIA_ESTRELAS } from '@/lib/config';
import { montarElencos, sortear, type ResultadoSorteio } from '@/lib/domain/sorteio';
import type { Jogador, Time } from '@/lib/domain/tipos';
import { codificarResultado, LIMITE_URL } from '@/lib/share/codec';
import { oficializarSorteio } from '@/app/admin/acoes';

type Fase = 'pronto' | 'linha' | 'goleiros' | 'fim';

interface Props {
  jogadores: Jogador[];
  times: Time[];
  /** Pendencias do cadastro. Com qualquer item aqui, o sorteio fica bloqueado. */
  problemas?: string[];
}

export function CerimoniaCliente({ jogadores, times, problemas = [] }: Props) {
  const bloqueado = problemas.length > 0;
  const [resultado, setResultado] = useState<ResultadoSorteio | null>(null);
  const [reveladasLinha, setReveladasLinha] = useState(0);
  const [reveladasGol, setReveladasGol] = useState(0);
  const [fase, setFase] = useState<Fase>('pronto');
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [oficial, setOficial] = useState<{ estado: 'ocioso' | 'enviando' | 'ok' | 'erro'; msg?: string }>({ estado: 'ocioso' });

  const porId = useMemo(() => new Map(jogadores.map((j) => [j.id, j])), [jogadores]);
  const timePorId = useMemo(() => new Map(times.map((t) => [t.id, t])), [times]);

  const elencos = useMemo(() => {
    if (!resultado) return [];
    return montarElencos(jogadores, times, resultado.sorteio, reveladasLinha, reveladasGol);
  }, [resultado, jogadores, times, reveladasLinha, reveladasGol]);

  const iniciar = useCallback(() => {
    if (bloqueado) return;
    const r = sortear({ jogadores, times });
    setResultado(r);
    setReveladasLinha(0);
    setReveladasGol(0);
    setLink(null);
    setFase('linha');
  }, [jogadores, times, bloqueado]);

  const revelarProximo = useCallback(() => {
    if (!resultado) return;
    const { linha, goleiros } = resultado.sorteio;

    if (reveladasLinha < linha.length) {
      setReveladasLinha((n) => n + 1);
      if (reveladasLinha + 1 === linha.length) setFase('goleiros');
      return;
    }
    if (reveladasGol < goleiros.length) {
      setReveladasGol((n) => n + 1);
      if (reveladasGol + 1 === goleiros.length) setFase('fim');
      return;
    }
    setFase('fim');
  }, [resultado, reveladasLinha, reveladasGol]);

  // Espaço / Enter revelam — a cerimônia é conduzida com a tela projetada.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && ['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(alvo.tagName)) return;
      e.preventDefault();
      if (fase === 'pronto') iniciar();
      else if (fase !== 'fim') revelarProximo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fase, iniciar, revelarProximo]);

  // ---- Alocação atual em destaque ----
  const atual = useMemo(() => {
    if (!resultado) return null;
    const { linha, goleiros } = resultado.sorteio;
    const aloc =
      reveladasGol > 0 ? goleiros[reveladasGol - 1] : reveladasLinha > 0 ? linha[reveladasLinha - 1] : null;
    if (!aloc) return null;
    const jogador = porId.get(aloc.jogadorId);
    const time = timePorId.get(aloc.timeId);
    if (!jogador || !time) return null;
    return { jogador, time, etapa: aloc.etapa };
  }, [resultado, reveladasLinha, reveladasGol, porId, timePorId]);

  const totalRevelacoes = resultado
    ? resultado.sorteio.linha.length + resultado.sorteio.goleiros.length
    : 0;
  const feitas = reveladasLinha + reveladasGol;
  const progresso = totalRevelacoes > 0 ? (feitas / totalRevelacoes) * 100 : 0;

  const gerarLink = useCallback(() => {
    if (!resultado) return;
    const payload = codificarResultado(elencos, resultado.sorteio.amplitudeEstrelas);
    const url = `${window.location.origin}/resultado/${payload}`;
    setLink(url);
    setCopiado(false);
  }, [resultado, elencos]);

  /** Leva os elencos revelados para o campeonato (equipes, jogadores, capitães). */
  const oficializar = useCallback(async () => {
    if (!resultado || fase !== 'fim') return;
    if (!window.confirm('Oficializar este sorteio? Os elencos do campeonato serão substituídos por estes.')) return;
    setOficial({ estado: 'enviando' });
    const nome = (j: Jogador) => j.apelido ?? j.nome;
    const r = await oficializarSorteio(
      elencos.map((e) => ({
        time: e.time.nome,
        capitao: { nome: nome(e.capitao), posicao: e.capitao.posicao },
        goleiro: e.goleiro ? { nome: nome(e.goleiro) } : null,
        linha: e.linha.map((j) => ({ nome: nome(j), posicao: j.posicao })),
      })),
    );
    setOficial(r.ok ? { estado: 'ok' } : { estado: 'erro', msg: r.erro });
  }, [resultado, fase, elencos]);

  const copiar = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }, [link]);

  return (
    <div className="relative min-h-screen px-4 pb-20">
      <PalmBackdrop className="opacity-80" intensidade="ambiente" />

      <div className="relative mx-auto max-w-6xl">
        {/* ---------------- PALCO ---------------- */}
        <section className="pb-8 pt-4">
          {fase === 'pronto' ? (
            <div className="py-16 text-center">
              <p className="hud-label mb-4">Cerimônia do sorteio</p>
              <h1 className="titulo-hero t-xl sticker text-[clamp(2.5rem,9vw,6rem)]">
                {bloqueado ? 'Cadastro pendente' : 'Tudo pronto'}
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-sm text-text-2 sm:text-base">
                {totalRevelacoes || resultado === null
                  ? 'Ao iniciar, o sistema calcula a distribuição equilibrada e revela um jogador por vez. Você controla o ritmo.'
                  : ''}
              </p>
              {bloqueado ? (
                <HudCard className="mx-auto mt-8 max-w-xl px-4 py-3 text-left">
                  <p className="hud-label mb-2 text-[10px]">
                    Corrija na planilha e rode npm run importar ({problemas.length})
                  </p>
                  <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-text-2">
                    {problemas.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </HudCard>
              ) : (
                <>
                  <button onClick={iniciar} className="btn-cta mt-8">
                    <span>Sortear agora</span>
                  </button>
                  <p className="hud-label mt-4 text-[10px]">
                    ou pressione <span className="text-white">espaço</span>
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Barra de progresso */}
              <div className="mb-6 flex items-center gap-4">
                <span className="hud-label whitespace-nowrap text-[10px]">
                  {fase === 'goleiros' || fase === 'fim' ? 'Etapa 2 · goleiros' : 'Etapa 1 · linha'}
                </span>
                <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full transition-all duration-200 ease-hud"
                    style={{ width: `${progresso}%`, backgroundImage: 'var(--gradient-leonida)' }}
                  />
                </div>
                <span className="font-mono text-xs text-text-2">
                  {feitas}/{totalRevelacoes}
                </span>
              </div>

              {/* Card da revelação atual */}
              {atual && (
                <HudCard
                  key={`${atual.jogador.id}-${feitas}`}
                  destaque
                  clip
                  className="animar-revelar flash-selecao px-6 py-8 text-center sm:px-10 sm:py-12"
                >
                  <p className="hud-label mb-3">
                    {atual.etapa === 'goleiro' ? 'Goleiro sorteado' : 'Jogador sorteado'}
                  </p>

                  <p className="titulo-hero t-xl text-[clamp(2.2rem,8vw,5rem)] text-white">
                    {atual.jogador.apelido ?? atual.jogador.nome}
                  </p>
                  <p className="mt-1 font-mono text-xs text-text-3 sm:text-sm">
                    {atual.jogador.nome} · {atual.jogador.posicao}
                  </p>

                  <div className="mt-5 flex justify-center">
                    <Estrelas nivel={atual.jogador.estrelas} tamanho={26} />
                  </div>

                  <div className="mx-auto mt-7 max-w-md border-t border-hud pt-5">
                    <p className="hud-label mb-2 text-[10px]">Vai para</p>
                    <p className="titulo-hero t-xl texto-gradiente text-[clamp(1.8rem,6vw,3.2rem)]">
                      {atual.time.nome}
                    </p>
                  </div>
                </HudCard>
              )}

              {/* Controles */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {fase !== 'fim' ? (
                  <>
                    <button onClick={revelarProximo} className="btn-cta">
                      <span>
                        {fase === 'goleiros' && reveladasLinha >= (resultado?.sorteio.linha.length ?? 0)
                          ? 'Revelar goleiro'
                          : 'Revelar próximo'}
                      </span>
                    </button>
                    <span className="hud-label text-[10px]">
                      espaço <span className="text-white">=</span> próximo
                    </span>
                  </>
                ) : (
                  <>
                    <button onClick={gerarLink} className="btn-cta">
                      <span>Gerar link do resultado</span>
                    </button>
                    <button onClick={oficializar} className="btn-hud" disabled={oficial.estado === 'enviando' || oficial.estado === 'ok'}>
                      {oficial.estado === 'ok' ? 'Oficializado' : oficial.estado === 'enviando' ? 'Enviando…' : 'Oficializar no campeonato'}
                    </button>
                    <button onClick={iniciar} className="btn-hud">
                      Sortear de novo
                    </button>
                  </>
                )}
              </div>

              {/* Avisos de regra */}
              {resultado && fase === 'fim' && (
                <div className="mx-auto mt-6 max-w-2xl space-y-2">
                  <HudCard barra={false} className="px-4 py-3">
                    <p className="hud-label mb-1 text-[10px]">Balanceamento</p>
                    <p className="text-sm">
                      Amplitude final de{' '}
                      <span
                        className="font-mono font-bold"
                        style={{
                          color: resultado.sorteio.toleranciaEstourada
                            ? 'var(--error)'
                            : 'var(--success)',
                        }}
                      >
                        {resultado.sorteio.amplitudeEstrelas}
                      </span>{' '}
                      estrela(s) entre o time mais forte e o mais fraco · tolerância ±
                      {TOLERANCIA_ESTRELAS}
                    </p>
                  </HudCard>

                  {resultado.sorteio.toleranciaEstourada && (
                    <Aviso cor="var(--error)" titulo="Tolerância não atingida">
                      O melhor resultado encontrado ficou acima da tolerância. Reveja as estrelas do
                      elenco ou sorteie de novo.
                    </Aviso>
                  )}

                  {resultado.violacoes.map((v) => (
                    <Aviso
                      key={`${v.invariante}-${v.mensagem}`}
                      cor="var(--error)"
                      titulo={`Invariante ${v.invariante} violada`}
                    >
                      {v.mensagem}
                    </Aviso>
                  ))}

                  {resultado.sorteio.timesSemGoleiroIds.length > 0 && (
                    <Aviso cor="var(--warning)" titulo="Times sem goleiro">
                      {resultado.sorteio.timesSemGoleiroIds
                        .map((id) => timePorId.get(id)?.nome ?? id)
                        .join(', ')}{' '}
                      — goleiro a definir.
                    </Aviso>
                  )}

                  {resultado.sorteio.goleirosReservaIds.length > 0 && (
                    <Aviso cor="var(--accent-armor)" titulo="Goleiros reserva">
                      {resultado.sorteio.goleirosReservaIds
                        .map((id) => porId.get(id)?.apelido ?? porId.get(id)?.nome ?? id)
                        .join(', ')}{' '}
                      — ficaram de fora, não voltam ao pote de linha.
                    </Aviso>
                  )}

                  {oficial.estado === 'ok' && (
                    <Aviso cor="var(--success)" titulo="Elencos oficializados">
                      As equipes do campeonato já estão com estes jogadores. Ajuste números e capitães em Admin › Equipes.
                    </Aviso>
                  )}
                  {oficial.estado === 'erro' && (
                    <Aviso cor="var(--error)" titulo="Não deu para oficializar">
                      {oficial.msg}
                    </Aviso>
                  )}

                  {link && (
                    <HudCard barra={false} className="px-4 py-3">
                      <p className="hud-label mb-2 text-[10px]">Link para a galera</p>
                      <p className="break-all font-mono text-[11px] text-text-2">{link}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button onClick={copiar} className="btn-hud !py-1.5 !text-sm">
                          {copiado ? 'Copiado' : 'Copiar'}
                        </button>
                        <a href={link} target="_blank" rel="noreferrer" className="btn-hud !py-1.5 !text-sm">
                          Abrir
                        </a>
                      </div>
                      {link.length > LIMITE_URL && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--warning)' }}>
                          Atenção: {link.length} caracteres — acima do limite recomendado de{' '}
                          {LIMITE_URL}. Alguns apps podem truncar.
                        </p>
                      )}
                    </HudCard>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* ---------------- ELENCOS AO VIVO ---------------- */}
        {resultado && (
          <section className="pt-6">
            <h2 className="titulo-hero mb-5 text-2xl sm:text-3xl">Elencos</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {elencos.map((e) => {
                const recebeuAgora = atual?.time.id === e.time.id;
                return (
                  <HudCard
                    key={e.time.id}
                    clip
                    destaque={recebeuAgora}
                    className={`p-4 pb-5 ${recebeuAgora ? 'flash-selecao' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="titulo-hero text-xl">{e.time.nome}</h3>
                      <span
                        className="font-mono text-sm font-bold"
                        style={{ color: 'var(--warning)' }}
                        title="Soma de estrelas (capitão + linha)"
                      >
                        {e.somaEstrelas}★
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      <LinhaElenco
                        nome={e.capitao.apelido ?? e.capitao.nome}
                        posicao="CAP"
                        estrelas={e.capitao.estrelas}
                        cor="var(--accent-orange)"
                      />
                      {e.goleiro ? (
                        <LinhaElenco
                          nome={e.goleiro.apelido ?? e.goleiro.nome}
                          posicao="GOL"
                          estrelas={e.goleiro.estrelas}
                          cor="var(--accent-armor)"
                        />
                      ) : (
                        <li className="hud-label text-[10px]" style={{ color: 'var(--text3)' }}>
                          goleiro: a definir
                        </li>
                      )}
                      {e.linha.map((j) => (
                        <LinhaElenco
                          key={j.id}
                          nome={j.apelido ?? j.nome}
                          posicao={j.posicao}
                          estrelas={j.estrelas}
                        />
                      ))}
                    </ul>
                  </HudCard>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function LinhaElenco({
  nome,
  posicao,
  estrelas,
  cor,
}: {
  nome: string;
  posicao: string;
  estrelas: number;
  cor?: string;
}) {
  return (
    <li className="animar-revelar flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider"
          style={{ color: cor ?? 'var(--text3)', width: 24 }}
        >
          {posicao}
        </span>
        <span className="truncate text-[13px]">{nome}</span>
      </span>
      <Estrelas nivel={estrelas} tamanho={9} pulsar={false} />
    </li>
  );
}

function Aviso({
  cor,
  titulo,
  children,
}: {
  cor: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded border px-4 py-3"
      style={{ borderColor: cor, background: 'rgba(255,255,255,0.04)' }}
    >
      <p className="hud-label mb-1 text-[10px]" style={{ color: cor }}>
        {titulo}
      </p>
      <p className="text-sm text-text-2">{children}</p>
    </div>
  );
}

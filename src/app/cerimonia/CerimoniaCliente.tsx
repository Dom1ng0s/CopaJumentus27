'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { oficializarSorteio } from '@/app/admin/acoes';
import { EscudoPorNome, IconeLuva, SeloCapitao } from '@/components/campeonato/ui';
import { HudCard } from '@/components/HudCard';
import { PalmBackdrop } from '@/components/PalmBackdrop';
import { WordmarkCopaJumentus, WordmarkViceCity } from '@/components/Wordmark';
import { marcaPorNome } from '@/lib/campeonato/marcas';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO } from '@/lib/config';
import { montarElencos, sortear, type ResultadoSorteio } from '@/lib/domain/sorteio';
import type { Jogador, Time } from '@/lib/domain/tipos';
import {
  assinarCadastro,
  carregarSessaoCerimonia,
  limparSessaoCerimonia,
  salvarSessaoCerimonia,
  type FaseCerimonia,
} from '@/lib/repo/sessao-cerimonia';
import { codificarResultado, formatarElencosWhatsApp, LIMITE_URL } from '@/lib/share/codec';

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
  const [fase, setFase] = useState<FaseCerimonia>('pronto');
  const [link, setLink] = useState<string | null>(null);
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoResumo, setCopiadoResumo] = useState(false);
  const [sessaoHidratada, setSessaoHidratada] = useState(false);
  const [oficial, setOficial] = useState<{
    estado: 'ocioso' | 'enviando' | 'ok' | 'erro';
    msg?: string;
  }>({ estado: 'ocioso' });

  const assinatura = useMemo(
    () =>
      assinarCadastro(
        jogadores.map((j) => j.id),
        times.map((t) => t.id),
      ),
    [jogadores, times],
  );

  // Restaura sessao em andamento caso a pagina seja recarregada acidentalmente
  useEffect(() => {
    if (bloqueado) {
      setSessaoHidratada(true);
      return;
    }
    const salva = carregarSessaoCerimonia(assinatura);
    if (salva) {
      setResultado(salva.resultado);
      setReveladasLinha(salva.reveladasLinha);
      setReveladasGol(salva.reveladasGol);
      setFase(salva.fase);
    }
    setSessaoHidratada(true);
  }, [assinatura, bloqueado]);

  // Salva progresso a cada passo da cerimonia
  useEffect(() => {
    if (!sessaoHidratada) return;
    if (!resultado || fase === 'pronto') {
      limparSessaoCerimonia();
      return;
    }
    salvarSessaoCerimonia({
      resultado,
      reveladasLinha,
      reveladasGol,
      fase,
      assinaturaCadastro: assinatura,
    });
  }, [sessaoHidratada, resultado, reveladasLinha, reveladasGol, fase, assinatura]);

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
    setCopiadoLink(false);
    setCopiadoResumo(false);
    setOficial({ estado: 'ocioso' });
    setFase(r.sorteio.goleiros.length > 0 ? 'goleiros' : 'linha');
  }, [jogadores, times, bloqueado]);

  const reiniciarParaPalco = useCallback(() => {
    limparSessaoCerimonia();
    setResultado(null);
    setReveladasLinha(0);
    setReveladasGol(0);
    setLink(null);
    setOficial({ estado: 'ocioso' });
    setFase('pronto');
  }, []);

  // Ordem da cerimônia: goleiros primeiro, depois os jogadores de linha um a um,
  // em ordem aleatória (decisão do operador em 18/11/2026).
  const revelarProximo = useCallback(() => {
    if (!resultado) return;
    const { linha, goleiros } = resultado.sorteio;

    if (fase === 'goleiros') {
      if (reveladasGol < goleiros.length) {
        setReveladasGol((n) => n + 1);
        return;
      }
      setFase(linha.length > 0 ? 'pre-linha' : 'fim');
      return;
    }

    if (fase === 'pre-linha') {
      setFase(linha.length > 1 ? 'linha' : 'fim');
      setReveladasLinha(1);
      return;
    }

    if (fase === 'linha') {
      if (reveladasLinha < linha.length) {
        const proximo = reveladasLinha + 1;
        setReveladasLinha(proximo);
        if (proximo >= linha.length) setFase('fim');
        return;
      }
      setFase('fim');
    }
  }, [resultado, fase, reveladasLinha, reveladasGol]);

  const voltarPasso = useCallback(() => {
    if (!resultado) return;
    const temGoleiros = resultado.sorteio.goleiros.length > 0;
    if (fase === 'fim' || fase === 'linha') {
      if (reveladasLinha > 1) {
        setReveladasLinha((n) => n - 1);
        setFase('linha');
      } else if (reveladasLinha === 1) {
        setReveladasLinha(0);
        setFase(temGoleiros ? 'pre-linha' : 'linha');
      } else if (fase === 'fim' && reveladasGol > 0) {
        setReveladasGol((n) => n - 1);
        setFase('goleiros');
      }
      return;
    }
    if (fase === 'pre-linha') {
      setFase('goleiros');
      return;
    }
    if (fase === 'goleiros' && reveladasGol > 0) {
      setReveladasGol((n) => n - 1);
    }
  }, [resultado, fase, reveladasLinha, reveladasGol]);

  const revelarTodos = useCallback(() => {
    if (!resultado) return;
    setReveladasLinha(resultado.sorteio.linha.length);
    setReveladasGol(resultado.sorteio.goleiros.length);
    setFase('fim');
  }, [resultado]);

  // Teclado: Espaco / Enter avancam; Backspace / Seta Esquerda voltam 1 passo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && ['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(alvo.tagName)) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (fase === 'pronto') iniciar();
        else if (fase !== 'fim') revelarProximo();
      } else if (e.code === 'Backspace' || e.code === 'ArrowLeft') {
        if (fase !== 'pronto') {
          e.preventDefault();
          voltarPasso();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fase, iniciar, revelarProximo, voltarPasso]);

  // ---- Alocacao atual em destaque ----
  const atual = useMemo(() => {
    if (!resultado || fase === 'pre-linha') return null;
    const { linha, goleiros } = resultado.sorteio;
    const aloc =
      reveladasLinha > 0
        ? linha[reveladasLinha - 1]
        : reveladasGol > 0
          ? goleiros[reveladasGol - 1]
          : null;
    if (!aloc) return null;
    const jogador = porId.get(aloc.jogadorId);
    const time = timePorId.get(aloc.timeId);
    if (!jogador || !time) return null;
    return { jogador, time, etapa: aloc.etapa };
  }, [resultado, fase, reveladasLinha, reveladasGol, porId, timePorId]);

  const totalRevelacoes = resultado
    ? resultado.sorteio.linha.length + resultado.sorteio.goleiros.length
    : 0;
  const feitas = reveladasLinha + reveladasGol;
  const progresso = totalRevelacoes > 0 ? (feitas / totalRevelacoes) * 100 : 0;

  const cotaLinhaMaxima = useMemo(() => {
    if (!resultado || times.length === 0) return 0;
    return Math.ceil(resultado.sorteio.linha.length / times.length);
  }, [resultado, times.length]);

  const gerarLink = useCallback(() => {
    if (!resultado) return;
    const payload = codificarResultado(elencos, resultado.sorteio.amplitudeEstrelas);
    const url = `${window.location.origin}/resultado/${payload}`;
    setLink(url);
    setCopiadoLink(false);
  }, [resultado, elencos]);

  /** Leva os elencos revelados para o campeonato (equipes, jogadores, capitaes). */
  const oficializar = useCallback(async () => {
    if (!resultado || fase !== 'fim') return;
    if (
      !window.confirm(
        'Oficializar este sorteio? Os elencos do campeonato serão substituídos por estes.',
      )
    )
      return;
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
      setCopiadoLink(true);
    } catch {
      setCopiadoLink(false);
    }
  }, [link]);

  const copiarResumoWhatsApp = useCallback(async () => {
    if (!resultado) return;
    const payload = codificarResultado(elencos, resultado.sorteio.amplitudeEstrelas);
    const url = link ?? `${window.location.origin}/resultado/${payload}`;
    const texto = formatarElencosWhatsApp(elencos, resultado.sorteio.amplitudeEstrelas, url);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoResumo(true);
      setTimeout(() => setCopiadoResumo(false), 3000);
    } catch {
      setCopiadoResumo(false);
    }
  }, [resultado, elencos, link]);

  const emModoPalco = fase === 'pronto' || fase === 'pre-linha';
  const goleirosCompletosAguardandoTransicao =
    fase === 'goleiros' &&
    resultado !== null &&
    reveladasGol >= resultado.sorteio.goleiros.length &&
    resultado.sorteio.linha.length > 0;
  const etapaGoleiros = fase === 'goleiros';

  return (
    <div className="tela-cheia relative min-h-screen px-4 pb-20 pt-16">
      <ControlesProjecao />
      <PalmBackdrop
        className={emModoPalco ? 'opacity-90' : 'opacity-75'}
        intensidade={emModoPalco ? 'hero' : 'ambiente'}
      />

      <div className="relative mx-auto max-w-6xl">
        {/* ---------------- PALCO ---------------- */}
        <section className="pb-8 pt-4">
          {fase === 'pronto' ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-6 max-w-[min(82vw,460px)]">
                <span className="sr-only">
                  {NOME_COMPETICAO} — {SUBTITULO_COMPETICAO}
                </span>
                <WordmarkCopaJumentus />
                <div className="mx-auto mt-2 max-w-[min(48vw,240px)]">
                  <WordmarkViceCity />
                </div>
              </div>

              <HudCard className="modulo mx-auto max-w-2xl px-6 py-8 sm:px-10">
                <p className="hud-label mb-3">Cerimônia do sorteio · Edição MLS</p>
                <h1 className="titulo-hero t-xl text-[clamp(2.5rem,7.5vw,5rem)] text-text-1">
                  {bloqueado ? 'Cadastro pendente' : 'Tudo pronto'}
                </h1>
                <p className="mx-auto mt-4 max-w-lg text-sm text-text-2 sm:text-base">
                  Ao iniciar, o sistema divide os times de forma equilibrada. Primeiro saem os
                  goleiros; depois, os jogadores de linha, um por vez e em ordem aleatória. Você
                  controla o ritmo no projetor.
                </p>
                {bloqueado ? (
                  <div className="mx-auto mt-6 max-w-xl border-l-[3px] border-[var(--warning)] bg-[var(--warning-bg)] px-4 py-3 text-left">
                    <p className="hud-label mb-2 text-[11px]" style={{ color: 'var(--warning-text)' }}>
                      Corrija em Admin › Inscrições ({problemas.length})
                    </p>
                    <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-text-2">
                      {problemas.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <button onClick={iniciar} className="btn-cta mt-8">
                      <span>Sortear agora</span>
                    </button>
                    <p className="hud-label mt-4 text-[10px]">
                      ou pressione <span className="text-text-1">espaço</span>
                    </p>
                  </>
                )}
              </HudCard>
            </div>
          ) : (
            <>
              {/* Barra de progresso reta (sem pilula, manual §5) */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <span
                  className="corte-direita hud-label whitespace-nowrap px-3 py-1 !text-[11px]"
                  style={{
                    background: etapaGoleiros ? 'var(--surface3)' : 'var(--surface2)',
                    color: etapaGoleiros ? 'var(--accent-armor)' : 'var(--accent)',
                  }}
                >
                  {fase === 'fim'
                    ? 'Sorteio concluído'
                    : etapaGoleiros
                      ? 'Etapa 1 · Goleiros'
                      : 'Etapa 2 · Linha'}
                </span>

                <div className="flex min-w-[180px] flex-1 items-center gap-3">
                  <div className="h-[6px] flex-1 overflow-hidden bg-[var(--surface2)]">
                    <div
                      className="h-full transition-all duration-200 ease-hud"
                      style={{ width: `${progresso}%`, backgroundImage: 'var(--gradient-leonida)' }}
                    />
                  </div>
                  <span className="numero text-xl text-text-1">
                    {feitas}/{totalRevelacoes}
                  </span>
                </div>
              </div>

              {/* Transicao: Etapa 1 (Goleiros) -> Etapa 2 (Linha) */}
              {fase === 'pre-linha' && (
                <HudCard
                  destaque
                  className="modulo animar-revelar px-6 py-10 text-center sm:px-10 sm:py-14"
                >
                  <p className="hud-label mb-3" style={{ color: 'var(--accent-armor)' }}>
                    Etapa 1 concluída · Goleiros definidos
                  </p>
                  <h2 className="titulo-hero t-xl text-[clamp(2.4rem,7.5vw,4.8rem)] text-text-1">
                    Etapa 2 · Jogadores de linha
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-sm text-text-2 sm:text-base">
                    Agora saem os jogadores de linha,{' '}
                    <strong className="text-text-1">um por um, em ordem aleatória</strong>. Cada
                    um vai direto para o seu time, e no fim os times ficam equilibrados.
                  </p>
                </HudCard>
              )}

              {/* Card aguardando 1a revelacao */}
              {fase !== 'fim' && feitas === 0 && (
                <HudCard className="modulo animar-revelar px-6 py-10 text-center sm:px-10 sm:py-12">
                  <p className="hud-label mb-2" style={{ color: 'var(--accent)' }}>
                    Sorteio calculado e travado
                  </p>
                  <h2 className="titulo-hero t-xl text-[clamp(2rem,6vw,3.8rem)] text-text-1">
                    Pronto para a 1ª revelação
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm text-text-2">
                    Pressione <span className="font-mono font-bold text-text-1">Espaço</span> ou
                    clique no botão abaixo para revelar o primeiro{' '}
                    {resultado?.sorteio.goleiros.length ? 'goleiro' : 'jogador'}.
                  </p>
                </HudCard>
              )}

              {/* Card da revelacao atual */}
              {atual && (
                <HudCard
                  key={`${atual.jogador.id}-${feitas}`}
                  destaque
                  clip
                  className="modulo animar-revelar flash-selecao px-6 py-8 text-center sm:px-10 sm:py-12"
                >
                  <p className="hud-label mb-3">
                    {atual.etapa === 'goleiro' ? 'Goleiro sorteado' : 'Jogador sorteado'} · #{feitas}
                  </p>

                  <p className="titulo-hero t-xl text-[clamp(2.2rem,8vw,5rem)] text-text-1">
                    {atual.jogador.apelido ?? atual.jogador.nome}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold uppercase tracking-wider text-text-2">
                    {atual.jogador.nome} ·{' '}
                    <span style={{ color: 'var(--accent)' }}>{atual.jogador.posicao}</span>
                  </p>

                  <div className="mx-auto mt-7 max-w-lg border-t border-hud pt-5">
                    <p className="hud-label mb-3 text-[11px]">Vai para</p>
                    <div className="inline-flex items-center justify-center gap-4">
                      <EscudoPorNome nome={atual.time.nome} tamanho={64} />
                      <p className="titulo-hero t-xl texto-gradiente text-[clamp(1.8rem,6vw,3.2rem)]">
                        {atual.time.nome}
                      </p>
                    </div>
                  </div>
                </HudCard>
              )}

              {/* Controles */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {fase !== 'fim' ? (
                  <>
                    {(feitas > 0 || fase === 'pre-linha') && (
                      <button
                        onClick={voltarPasso}
                        className="btn-hud !px-4 !py-2 !text-sm"
                        title="Atalho: Seta Esquerda ou Backspace"
                      >
                        ← Voltar 1
                      </button>
                    )}

                    <button onClick={revelarProximo} className="btn-cta">
                      <span>
                        {fase === 'pre-linha'
                          ? 'Revelar 1º jogador de linha'
                          : goleirosCompletosAguardandoTransicao
                            ? 'Etapa 2 · Linha'
                            : feitas === 0
                              ? etapaGoleiros
                                ? 'Revelar 1º goleiro'
                                : 'Revelar 1º jogador'
                              : etapaGoleiros
                                ? 'Revelar próximo goleiro'
                                : 'Revelar próximo'}
                      </span>
                    </button>

                    <button
                      onClick={revelarTodos}
                      className="btn-hud !px-4 !py-2 !text-sm"
                      title="Revelar todos os restantes"
                    >
                      Revelar todos
                    </button>

                    <span className="hud-label w-full text-center text-[11px] text-text-3">
                      espaço <span className="text-text-1">=</span> próximo · seta esquerda{' '}
                      <span className="text-text-1">=</span> voltar
                    </span>
                  </>
                ) : (
                  <>
                    <button onClick={gerarLink} className="btn-cta">
                      <span>Gerar link do resultado</span>
                    </button>
                    <button onClick={copiarResumoWhatsApp} className="btn-hud">
                      {copiadoResumo ? 'Copiado p/ WhatsApp!' : 'Copiar p/ WhatsApp'}
                    </button>
                    <button
                      onClick={oficializar}
                      className="btn-hud"
                      disabled={oficial.estado === 'enviando' || oficial.estado === 'ok'}
                    >
                      {oficial.estado === 'ok'
                        ? 'Oficializado'
                        : oficial.estado === 'enviando'
                          ? 'Enviando…'
                          : 'Oficializar no campeonato'}
                    </button>
                    <button onClick={voltarPasso} className="btn-hud !px-4 !text-sm">
                      ← Voltar 1
                    </button>
                    <button onClick={reiniciarParaPalco} className="btn-hud !px-4 !text-sm">
                      Sortear de novo
                    </button>
                  </>
                )}
              </div>

              {/* Avisos de regra */}
              {resultado && fase === 'fim' && (
                <div className="mx-auto mt-6 max-w-2xl space-y-2">
                  {/* Projetado: confirma o equilíbrio sem mostrar estrelas. */}
                  {!resultado.sorteio.toleranciaEstourada && (
                    <HudCard barra={false} className="px-4 py-3">
                      <p className="hud-label mb-1 text-[10px]">Equilíbrio</p>
                      <p className="text-sm">
                        Times equilibrados dentro da tolerância definida pela organização.
                      </p>
                    </HudCard>
                  )}

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
                      As equipes do campeonato já estão com estes jogadores. Ajuste números e
                      capitães em Admin › Equipes.
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
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button onClick={copiar} className="btn-hud !py-1.5 !text-sm">
                          {copiadoLink ? 'Copiado' : 'Copiar link'}
                        </button>
                        <button onClick={copiarResumoWhatsApp} className="btn-hud !py-1.5 !text-sm">
                          {copiadoResumo ? 'Texto copiado!' : 'Copiar texto p/ WhatsApp'}
                        </button>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-hud !py-1.5 !text-sm"
                        >
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
                const marca = marcaPorNome(e.time.nome);
                const slotsRestantes = Math.max(0, cotaLinhaMaxima - e.linha.length);
                const semGoleiroDefinitivo =
                  fase === 'fim' && resultado.sorteio.timesSemGoleiroIds.includes(e.time.id);

                return (
                  <HudCard
                    key={e.time.id}
                    clip
                    destaque={recebeuAgora}
                    className={`modulo overflow-hidden pb-5 ${recebeuAgora ? 'flash-selecao' : ''}`}
                  >
                    {/* Cabecalho com escudo e diagonal na cor da franquia (manual §7.3) */}
                    <div
                      className="malha-camisa flex items-center gap-2.5 px-3.5 py-3"
                      style={
                        marca
                          ? {
                              color: marca.corTexto,
                              backgroundImage: `linear-gradient(135deg, ${marca.corPrimaria} 0 80%, ${marca.corSecundaria} 80% 90%, ${marca.corPrimaria} 90% 92%, #D4A12A 92% 95%, ${marca.corPrimaria} 95%)`,
                            }
                          : { background: 'var(--surface2)' }
                      }
                    >
                      <EscudoPorNome nome={e.time.nome} tamanho={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-85"
                            style={{ color: marca?.corTexto }}
                          >
                            {marca?.sigla ?? 'TIME'}
                          </span>
                        </div>
                        <h3
                          className="titulo-hero t-sm truncate text-xl"
                          style={{ color: marca?.corTexto }}
                        >
                          {e.time.nome}
                        </h3>
                      </div>
                    </div>

                    <ul className="mt-2 space-y-1.5 px-3.5">
                      <LinhaElenco
                        nome={e.capitao.apelido ?? e.capitao.nome}
                        posicao="CAP"
                        cor="var(--accent)"
                        ehCapitao
                      />
                      {e.goleiro ? (
                        <LinhaElenco
                          nome={e.goleiro.apelido ?? e.goleiro.nome}
                          posicao="GOL"
                          cor="var(--accent-armor)"
                          ehGoleiro
                          selecionado={
                            recebeuAgora &&
                            atual?.etapa === 'goleiro' &&
                            atual.jogador.id === e.goleiro.id
                          }
                        />
                      ) : (
                        <li className="hud-label border-b border-white/5 pb-1.5 text-[10px]" style={{ color: 'var(--text3)' }}>
                          {semGoleiroDefinitivo ? 'goleiro: a definir' : 'goleiro: aguardando'}
                        </li>
                      )}
                      {e.linha.map((j) => (
                        <LinhaElenco
                          key={j.id}
                          nome={j.apelido ?? j.nome}
                          posicao={j.posicao}
                          selecionado={
                            recebeuAgora && atual?.etapa === 'linha' && atual.jogador.id === j.id
                          }
                        />
                      ))}
                      {fase !== 'fim' &&
                        Array.from({ length: slotsRestantes }, (_, idx) => (
                          <li
                            key={`vaga-${idx}`}
                            className="flex items-center justify-between border-b border-white/5 pb-1.5 opacity-40 last:border-0"
                          >
                            <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">
                              --- · vaga de linha
                            </span>
                          </li>
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
  cor,
  ehCapitao = false,
  ehGoleiro = false,
  selecionado = false,
}: {
  nome: string;
  posicao: string;
  cor?: string;
  ehCapitao?: boolean;
  ehGoleiro?: boolean;
  selecionado?: boolean;
}) {
  return (
    <li
      className={`animar-revelar flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0 ${
        selecionado ? 'linha-selecionada' : ''
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ color: cor ?? 'var(--text3)', width: 24 }}
        >
          {posicao}
        </span>
        <span className="truncate text-[13px] font-medium">{nome}</span>
        {ehCapitao && <SeloCapitao tamanho={18} />}
        {ehGoleiro && <IconeLuva tamanho={14} cor="var(--accent-armor)" />}
      </span>
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
      className="rounded-component border border-l-[3px] px-4 py-3"
      style={{ borderColor: cor, borderLeftColor: cor, background: 'rgba(11, 31, 63, 0.75)' }}
    >
      <p className="hud-label mb-1 text-[10px]" style={{ color: cor }}>
        {titulo}
      </p>
      <p className="text-sm text-text-2">{children}</p>
    </div>
  );
}

/**
 * Controles discretos da projeção (canto superior direito): tela cheia e voltar ao
 * sorteio. A barra do site não aparece na cerimônia.
 */
function ControlesProjecao() {
  const [cheia, setCheia] = useState(false);
  useEffect(() => {
    const atualizar = () => setCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', atualizar);
    return () => document.removeEventListener('fullscreenchange', atualizar);
  }, []);
  return (
    <div className="nao-imprimir fixed right-3 top-3 z-50 flex gap-2 opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        className="btn-mini"
        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}
      >
        {cheia ? 'Sair da tela cheia' : 'Tela cheia'}
      </button>
      <Link href="/sorteio" className="btn-mini">
        Voltar
      </Link>
    </div>
  );
}

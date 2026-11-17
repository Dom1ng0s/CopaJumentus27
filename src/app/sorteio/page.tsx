import Image from 'next/image';
import Link from 'next/link';
import { Estrelas } from '@/components/Estrelas';
import { HudCard } from '@/components/HudCard';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO, TOLERANCIA_ESTRELAS } from '@/lib/config';
import { poteDeGoleiros, poteDeLinha } from '@/lib/domain/validacao';
import { carregarCadastro } from '@/lib/repo/cadastro';
import { idDoCampeonatoDoAdmin } from '@/lib/campeonato/selecao';
import type { Estrelas as NivelEstrelas, Jogador } from '@/lib/domain/tipos';

export const dynamic = 'force-dynamic';

export const metadata = { title: "Pote do sorteio — Copa Jumentus" };

export default async function PaginaPote() {
  const { jogadores, times, problemas, ignorados, origem } = await carregarCadastro(await idDoCampeonatoDoAdmin());
  const pote = poteDeLinha(jogadores);
  const goleiros = poteDeGoleiros(jogadores);
  const capitaoPorId = new Map(
    jogadores.filter((j) => j.ehCapitao).map((j) => [j.id, j]),
  );

  const niveis = [6, 5, 4, 3, 2, 1] as const;

  return (
    <>
      {/* ---------------- HERO ----------------
           A key art e uma arte unica da comissao: skyline, ponte, palmeiras e o
           wordmark ja compostos. Substitui o palco montado em CSS. O h1 continua
           existindo em sr-only, porque o titulo aqui e pixel, nao texto. */}
      <section className="relative">
        {/* A arte e 4:1. Em telas largas ela preenche sozinha; no celular vira uma
            tira de ~94px, entao recebe um ceu em volta para ganhar presenca. */}
        <div className="relative w-full overflow-hidden py-10 sm:py-0">
          {/* Preenchimento: a propria arte ampliada e desfocada. Casa as cores da
              emenda por construcao, em vez de eu adivinhar um gradiente. */}
          <div
            className="pointer-events-none absolute inset-0 scale-110 sm:hidden"
            style={{
              backgroundImage: 'url(/banner-copa-jumentus.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(26px) saturate(1.15)',
            }}
            aria-hidden="true"
          />
          <h1 className="sr-only">
            {NOME_COMPETICAO} {SUBTITULO_COMPETICAO}
          </h1>
          <Image
            src="/banner-copa-jumentus.webp"
            alt={`${NOME_COMPETICAO} ${SUBTITULO_COMPETICAO}`}
            width={2000}
            height={504}
            priority
            sizes="100vw"
            className="relative block h-auto w-full"
          />
          {/* Dissolve da arte para o campo escuro */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] sm:h-[14%]"
            style={{ backgroundImage: 'linear-gradient(180deg, transparent 0%, #0C0D1B 92%)' }}
            aria-hidden="true"
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-8 text-center">
          <p className="hud-label mb-5">Edição 2027 · Comissão organizadora</p>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-text-2 sm:text-base">
            Sorteio balanceado por nível. Oito capitães, um pote de {pote.length} jogadores de
            linha e {goleiros.length} goleiros sorteados à parte. O time mais fraco recebe
            primeiro em cada rodada de estrelas.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/cerimonia" className="btn-cta">
              <span>Iniciar sorteio</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- METRICAS ----------------
           Dados vivem no campo escuro, nunca sobre o ceu aceso. */}
      <section className="relative px-4 pt-10">
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica rotulo="Times" valor={String(times.length)} cor="var(--accent-orange)" />
          <Metrica rotulo="No pote" valor={String(pote.length)} cor="var(--success)" />
          <Metrica rotulo="Goleiros" valor={String(goleiros.length)} cor="var(--accent-armor)" />
          <Metrica rotulo="Tolerância" valor={`±${TOLERANCIA_ESTRELAS}`} cor="var(--warning)" />
        </div>
      </section>

      {/* ---------------- PENDENCIAS DO CADASTRO ---------------- */}
      {problemas.length > 0 && (
        <section className="relative px-4 pt-8">
          <HudCard className="mx-auto max-w-2xl px-4 py-4">
            <p className="hud-label mb-2 text-[10px]" style={{ color: 'var(--warning)' }}>
              Cadastro com {problemas.length} pendência{problemas.length > 1 ? 's' : ''} — sorteio
              bloqueado
            </p>
            <ul className="max-h-72 space-y-1 overflow-y-auto font-mono text-xs text-text-2">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </HudCard>
        </section>
      )}

      {/* ---------------- TIMES ---------------- */}
      <section className="relative px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <CabecalhoSecao
            titulo="Os oito times"
            legenda="Capitães fixos — não entram no pote"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {times.map((time, i) => {
              const capitao = capitaoPorId.get(time.capitaoId);
              return (
                <HudCard key={time.id} clip className="p-4 pb-5">
                  <span className="font-mono text-xs text-text-3">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <h3 className="titulo-hero mt-1 text-2xl">{time.nome}</h3>

                  {capitao && (
                    <div className="mt-4 border-t border-hud pt-3">
                      <p className="hud-label mb-1 text-[10px]">Capitão</p>
                      <p className="text-sm font-semibold">{capitao.apelido ?? capitao.nome}</p>
                      <p className="mb-2 font-mono text-[11px] text-text-3">
                        {capitao.nome} · {capitao.posicao}
                      </p>
                      <Estrelas nivel={capitao.estrelas} tamanho={13} />
                    </div>
                  )}
                </HudCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- POTE ---------------- */}
      <section className="relative px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <CabecalhoSecao
            titulo="O pote"
            legenda={`${pote.length} jogadores de linha, agrupados por nível`}
          />

          <div className="space-y-6">
            {niveis.map((nivel) => {
              const doNivel = pote.filter((j) => j.estrelas === nivel);
              if (doNivel.length === 0) return null;
              return (
                <div key={nivel}>
                  <div className="mb-3 flex items-center gap-3">
                    <Estrelas nivel={nivel} tamanho={14} pulsar={false} />
                    <span className="font-mono text-xs text-text-3">
                      {doNivel.length} jogador{doNivel.length > 1 ? 'es' : ''}
                    </span>
                    <div className="halftone h-[8px] flex-1 opacity-60" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {doNivel.map((j) => (
                      <FichaPote key={j.id} jogador={j} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goleiros */}
          <div className="mt-12">
            <CabecalhoSecao
              titulo="Goleiros"
              legenda="Sorteio separado, 1 por time — estrelas não contam no balanceamento"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {goleiros.map((g) => (
                <FichaPote key={g.id} jogador={g} armor />
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 py-16 text-center">
        <p className="hud-label text-[10px]">
          {origem === 'banco'
            ? `Cadastro de Admin › Inscrições${ignorados ? ` · ${ignorados} na lista de espera` : ''}`
            : 'Elenco de demonstração — cadastre os jogadores em Admin › Inscrições'}
        </p>
      </footer>
    </>
  );
}

function Metrica({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <HudCard className="px-3 py-3 text-left">
      <p className="hud-label text-[10px]">{rotulo}</p>
      <p className="numero text-3xl" style={{ color: cor }}>
        {valor}
      </p>
    </HudCard>
  );
}

function CabecalhoSecao({ titulo, legenda }: { titulo: string; legenda: string }) {
  return (
    <div className="mb-6">
      <h2 className="titulo-hero text-3xl sm:text-4xl">{titulo}</h2>
      <p className="mt-1 text-sm text-text-2">{legenda}</p>
    </div>
  );
}

function FichaPote({ jogador, armor = false }: { jogador: Jogador; armor?: boolean }) {
  return (
    <div className="hud-card flex items-center justify-between gap-2 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{jogador.apelido ?? jogador.nome}</p>
        <p
          className="font-mono text-[10px] uppercase tracking-wider"
          style={{ color: armor ? 'var(--accent-armor)' : 'var(--text3)' }}
        >
          {jogador.posicao}
        </p>
      </div>
      <Estrelas nivel={jogador.estrelas as NivelEstrelas} tamanho={11} pulsar={false} />
    </div>
  );
}

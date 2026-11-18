import Image from 'next/image';
import Link from 'next/link';
import { EscudoPorNome, SeloCapitao } from '@/components/campeonato/ui';
import { Estrelas } from '@/components/Estrelas';
import { HudCard } from '@/components/HudCard';
import { PoteInterativo } from '@/components/PoteInterativo';
import { marcaPorNome } from '@/lib/campeonato/marcas';
import { idDoCampeonatoDoAdmin } from '@/lib/campeonato/selecao';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO, TOLERANCIA_ESTRELAS } from '@/lib/config';
import { poteDeGoleiros, poteDeLinha } from '@/lib/domain/validacao';
import { carregarCadastro } from '@/lib/repo/cadastro';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Pote do sorteio — Copa Jumentus' };

export default async function PaginaPote() {
  const { jogadores, times, problemas, ignorados, origem } = await carregarCadastro(
    await idDoCampeonatoDoAdmin(),
  );
  const pote = poteDeLinha(jogadores);
  const goleiros = poteDeGoleiros(jogadores);
  const capitaoPorId = new Map(
    jogadores.filter((j) => j.ehCapitao).map((j) => [j.id, j]),
  );

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
              emenda por construcao, em vez de adivinhar um gradiente. */}
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
          {/* Dissolve da arte para o marinho profundo do sistema */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] sm:h-[14%]"
            style={{ backgroundImage: 'linear-gradient(180deg, transparent 0%, var(--background) 92%)' }}
            aria-hidden="true"
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-8 text-center">
          <p className="hud-label mb-5">Edição 2027 · Comissão organizadora</p>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-text-2 sm:text-base">
            Sorteio balanceado por nível. Oito capitães, um pote de {pote.length} jogadores de
            linha e {goleiros.length} goleiros. Na cerimônia saem primeiro os goleiros e depois a
            linha, um por um, em ordem aleatória, sem mostrar estrelas.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/cerimonia" className="btn-cta">
              <span>Iniciar sorteio</span>
            </Link>
            <Link href="/admin/inscricoes" className="btn-hud">
              Gerenciar inscrições
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- METRICAS ----------------
           Dados vivem no campo escuro, nunca sobre o ceu aceso. */}
      <section className="relative px-4 pt-6">
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Números em off-white e dourado, sem cores fora do manual. */}
          <Metrica rotulo="Times" valor={String(times.length)} cor="var(--text1)" />
          <Metrica rotulo="No pote" valor={String(pote.length)} cor="var(--text1)" />
          <Metrica rotulo="Goleiros" valor={String(goleiros.length)} cor="var(--text1)" />
          <Metrica rotulo="Tolerância" valor={`±${TOLERANCIA_ESTRELAS}`} cor="var(--accent)" />
        </div>
      </section>

      {/* ---------------- PENDENCIAS DO CADASTRO ---------------- */}
      {problemas.length > 0 && (
        <section className="relative px-4 pt-8">
          <HudCard className="mx-auto max-w-2xl border-l-[3px] border-l-[var(--warning)] px-4 py-4">
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
              const marca = marcaPorNome(time.nome);
              return (
                <HudCard key={time.id} clip className="modulo overflow-hidden pb-5">
                  <div
                    className="malha-camisa flex items-center gap-3 px-4 py-3.5"
                    style={
                      marca
                        ? {
                            color: marca.corTexto,
                            backgroundImage: `linear-gradient(135deg, ${marca.corPrimaria} 0 82%, ${marca.corSecundaria} 82% 91%, ${marca.corPrimaria} 91% 93%, #D4A12A 93% 95%, ${marca.corPrimaria} 95%)`,
                          }
                        : { background: 'var(--surface2)' }
                    }
                  >
                    <EscudoPorNome nome={time.nome} tamanho={44} />
                    <div className="min-w-0 flex-1">
                      <span
                        className="font-mono text-xs font-bold uppercase tracking-wider opacity-80"
                        style={{ color: marca?.corTexto }}
                      >
                        #{String(i + 1).padStart(2, '0')} · {marca?.sigla ?? 'MLS'}
                      </span>
                      <h3
                        className="titulo-hero t-sm truncate text-2xl"
                        style={{ color: marca?.corTexto }}
                      >
                        {time.nome}
                      </h3>
                    </div>
                  </div>

                  {capitao && (
                    <div className="px-4 pt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="hud-label text-[10px]">Capitão</p>
                        <SeloCapitao tamanho={20} />
                      </div>
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
            legenda={`${pote.length} jogadores de linha e ${goleiros.length} goleiros disponíveis para o sorteio`}
          />

          <PoteInterativo pote={pote} goleiros={goleiros} />
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

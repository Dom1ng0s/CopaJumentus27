import Link from 'next/link';
import { Aviso, Escudo, Secao, SeloStatus } from '@/components/campeonato/ui';
import { formatarData, indices, lados, partidasDaFase } from '@/lib/campeonato/consultas';
import { campeonatoDoAdmin } from '@/lib/campeonato/selecao';
import { partidaTravada } from '@/lib/domain/campeonato/chaveamento';
import { DIAS_DO_MODELO } from '@/lib/domain/campeonato/modelo';
import { problemaNaProgramacao, programacaoPadrao, resumirProgramacao } from '@/lib/domain/campeonato/programacao';
import { criarPartida, editarPartida, excluirPartida, programarJogosAcao, sortearTabelaAcao } from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/partidas';

export default async function Partidas({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const c = await campeonatoDoAdmin();
  const { equipe } = indices(c);
  const modelo = c.modelo === 'copa-jumentus-8';
  const tabela = [...c.equipes].filter((e) => e.numeroTabela !== undefined).sort((a, b) => a.numeroTabela! - b.numeroTabela!);
  const algumaComecou = c.partidas.some(partidaTravada);
  const programacao = c.programacao ?? programacaoPadrao(c.inicio, c.fim, DIAS_DO_MODELO);
  const resumo = problemaNaProgramacao(programacao, DIAS_DO_MODELO) ? [] : resumirProgramacao(c.partidas, c.fases, programacao);

  const opcoesEquipes = c.equipes.map((e) => (
    <option key={e.id} value={e.id}>
      {e.nome}
    </option>
  ));

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Partidas</h1>
      <Aviso texto={erro} />
      <Aviso texto={ok} tipo="ok" />

      {modelo && (
        <Secao titulo="Programação dos jogos">
          <p className="mb-4 text-sm text-text-2">
            Um campo, um jogo por vez: cada jogo começa quando o anterior termina, mais o intervalo. O jogo tem 2 tempos e o intervalo entre eles; o mata-mata
            tem tempos próprios e um intervalo maior ao trocar de etapa (grupos → repescagem → semifinais → finais). Jogos que já começaram mantêm o horário.
            Para um atraso no meio do dia, remarque o jogo e marque &ldquo;empurrar os seguintes&rdquo;.
          </p>
          <form action={programarJogosAcao} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <input type="hidden" name="volta" value={VOLTA} />
            {programacao.dias.map((d, i) => (
              <fieldset key={i} className="contents">
                <label>
                  <span className="rotulo-campo">Dia {i + 1} · data</span>
                  <input name={`data${i + 1}`} type="date" defaultValue={d.data} required className="campo" />
                </label>
                <label>
                  <span className="rotulo-campo">Dia {i + 1} · primeiro jogo</span>
                  <input name={`inicio${i + 1}`} type="time" step={300} defaultValue={d.inicio} required className="campo" />
                </label>
              </fieldset>
            ))}
            <label>
              <span className="rotulo-campo">Grupos · minutos por tempo (min)</span>
              <input name="tempoGrupoMin" type="number" inputMode="numeric" min={1} max={90} defaultValue={programacao.tempoGrupoMin} required className="campo" />
            </label>
            <label>
              <span className="rotulo-campo">Mata-mata · minutos por tempo (min)</span>
              <input name="tempoMataMataMin" type="number" inputMode="numeric" min={1} max={90} defaultValue={programacao.tempoMataMataMin} required className="campo" />
            </label>
            <label>
              <span className="rotulo-campo">Intervalo entre os tempos (min)</span>
              <input name="intervaloTemposMin" type="number" inputMode="numeric" min={0} max={30} defaultValue={programacao.intervaloTemposMin} required className="campo" />
            </label>
            <label>
              <span className="rotulo-campo">Entre jogos dos grupos (min)</span>
              <input name="intervaloGrupoMin" type="number" inputMode="numeric" min={0} max={120} defaultValue={programacao.intervaloGrupoMin} required className="campo" />
            </label>
            <label>
              <span className="rotulo-campo">Entre jogos do mata-mata (min)</span>
              <input name="intervaloMataMataMin" type="number" inputMode="numeric" min={0} max={120} defaultValue={programacao.intervaloMataMataMin} required className="campo" />
            </label>
            <label>
              <span className="rotulo-campo">Entre etapas do mata-mata (min)</span>
              <input name="intervaloFasesMin" type="number" inputMode="numeric" min={0} max={120} defaultValue={programacao.intervaloFasesMin} required className="campo" />
            </label>
            <div className="col-span-2 flex items-end lg:col-span-2">
              <button type="submit" className="btn-cta">
                <span>Salvar e gerar horários</span>
              </button>
            </div>
          </form>
          {resumo.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {resumo.map((r) => (
                <li key={r.dia} className="rounded-component bg-[var(--surface1)] px-3 py-2 text-sm">
                  <span className="hud-label mr-2">Dia {r.dia}</span>
                  {formatarData(r.data)} · {r.jogos} jogos · {r.primeiro} às {r.fim}
                  {r.passaDaMeiaNoite && <span className="ml-2 font-semibold text-[var(--error-text)]">passa da meia-noite</span>}
                </li>
              ))}
            </ul>
          )}
          {!c.programacao && (
            <p className="mt-3 text-sm text-text-3">Valores sugeridos. Confira as datas e salve para gravar os horários.</p>
          )}
        </Secao>
      )}

      {modelo && (
        <Secao titulo="Sorteio de T1 a T8">
          <p className="mb-3 text-sm text-text-2">
            Os 28 jogos do Grupo Único seguem a tabela T1 a T8. O sorteio vale depois de oficializar os elencos e pode ser refeito enquanto nenhuma partida tiver começado.
          </p>
          {tabela.length > 0 && (
            <ol className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tabela.map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded-component bg-[var(--surface1)] px-3 py-2">
                  <span className="numero text-2xl" style={{ color: 'var(--accent)' }}>
                    T{e.numeroTabela}
                  </span>
                  <Escudo equipe={e} tamanho={22} />
                  <span className="truncate font-semibold">{e.nome}</span>
                </li>
              ))}
            </ol>
          )}
          {!c.sorteioOficializadoEm ? (
            <Aviso tipo="info" texto="Oficialize os elencos no fim da cerimônia do sorteio para liberar este sorteio." />
          ) : algumaComecou ? (
            <p className="text-sm text-text-3">Alguma partida já começou: os números não podem mais ser sorteados.</p>
          ) : (
            <form action={sortearTabelaAcao}>
              <input type="hidden" name="volta" value={VOLTA} />
              <button type="submit" className="btn-cta">
                <span>{tabela.length ? 'Refazer sorteio de T1 a T8' : 'Sortear T1 a T8'}</span>
              </button>
            </form>
          )}
        </Secao>
      )}

      <Secao titulo="Nova partida">
        <form action={criarPartida} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="volta" value={VOLTA} />
          <label>
            <span className="rotulo-campo">Fase</span>
            <select name="faseId" required className="campo">
              {c.fases.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="rotulo-campo">Mandante</span>
            <select name="mandanteId" required className="campo">
              {opcoesEquipes}
            </select>
          </label>
          <label>
            <span className="rotulo-campo">Visitante</span>
            <select name="visitanteId" required className="campo" defaultValue={c.equipes[1]?.id}>
              {opcoesEquipes}
            </select>
          </label>
          <label>
            <span className="rotulo-campo">Rótulo</span>
            <input name="rotulo" placeholder="Ex.: Semifinal 1" className="campo" />
          </label>
          <label>
            <span className="rotulo-campo">Data e hora</span>
            <input name="dataHora" type="datetime-local" className="campo" />
          </label>
          <label>
            <span className="rotulo-campo">Local</span>
            <input name="local" defaultValue={c.local ?? ''} className="campo" />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="btn-cta">
              <span>Criar partida</span>
            </button>
          </div>
        </form>
      </Secao>

      {c.fases.map((fase) => {
        const partidas = partidasDaFase(c, fase.id);
        if (partidas.length === 0) return null;
        return (
          <Secao key={fase.id} titulo={fase.nome}>
            <ul className="space-y-3">
              {partidas.map((p) => {
                const l = lados(c, p, equipe);
                const comOrigem = !!p.origemMandante || !!p.origemVisitante;
                return (
                <li key={p.id} className="rounded-component bg-[var(--surface1)] p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {p.numero !== undefined && (
                      <span className="numero text-xl" style={{ color: 'var(--accent)' }}>
                        J{p.numero}
                      </span>
                    )}
                    <Escudo equipe={l.mandante} tamanho={24} />
                    <span className={`font-semibold ${l.mandante ? '' : 'text-text-3'}`}>
                      {l.mandante?.nome ?? l.rotuloMandante}
                      {l.mandante && l.rotuloMandante && <span className="ml-1 text-xs text-text-3">({l.rotuloMandante})</span>}
                    </span>
                    <span className="font-mono font-bold">
                      {p.status === 'agendada' ? 'x' : `${p.golsMandante} : ${p.golsVisitante}`}
                    </span>
                    <span className={`font-semibold ${l.visitante ? '' : 'text-text-3'}`}>
                      {l.visitante?.nome ?? l.rotuloVisitante}
                      {l.visitante && l.rotuloVisitante && <span className="ml-1 text-xs text-text-3">({l.rotuloVisitante})</span>}
                    </span>
                    <Escudo equipe={l.visitante} tamanho={24} />
                    <SeloStatus status={p.status} />
                    <Link href={`/admin/partidas/${p.id}`} className="btn-cta ml-auto !px-4 !py-2 !text-sm">
                      <span>Súmula / placar</span>
                    </Link>
                  </div>
                  <form action={editarPartida} className="flex flex-wrap gap-2 [&>*]:min-w-[8rem] [&>*]:flex-1">
                    <input type="hidden" name="volta" value={VOLTA} />
                    <input type="hidden" name="partidaId" value={p.id} />
                    <input name="rotulo" defaultValue={p.rotulo ?? ''} placeholder="Rótulo" aria-label="Rótulo" className="campo" />
                    <input name="dataHora" type="datetime-local" defaultValue={p.dataHora ?? ''} aria-label="Data e hora" className="campo" />
                    {p.numero !== undefined && p.dia !== undefined && (
                      <label className="flex !min-w-0 !flex-none items-center gap-2 text-sm text-text-2">
                        <input type="checkbox" name="empurrar" value="1" className="h-5 w-5 accent-[var(--accent)]" />
                        Empurrar os seguintes do dia
                      </label>
                    )}
                    {!comOrigem && (
                      <>
                        <select name="mandanteId" defaultValue={p.mandanteId} aria-label="Mandante" className="campo">
                          {opcoesEquipes}
                        </select>
                        <select name="visitanteId" defaultValue={p.visitanteId} aria-label="Visitante" className="campo">
                          {opcoesEquipes}
                        </select>
                      </>
                    )}
                    <input name="campo" defaultValue={p.campo ?? ''} placeholder="Campo" aria-label="Campo" className="campo" />
                    <input name="local" defaultValue={p.local ?? ''} placeholder="Local" aria-label="Local" className="campo" />
                    <button type="submit" className="btn-mini !flex-none">
                      Salvar
                    </button>
                    {!(modelo && p.numero !== undefined) && (
                      <button type="submit" formAction={excluirPartida} className="btn-mini !flex-none" data-perigo>
                        Excluir
                      </button>
                    )}
                  </form>
                </li>
                );
              })}
            </ul>
          </Secao>
        );
      })}
    </div>
  );
}

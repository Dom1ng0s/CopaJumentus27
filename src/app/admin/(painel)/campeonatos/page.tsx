import { Aviso, Secao } from '@/components/campeonato/ui';
import { formatarData } from '@/lib/campeonato/consultas';
import { idDoCampeonatoDoAdmin } from '@/lib/campeonato/selecao';
import { ROTULO_STATUS_CAMPEONATO } from '@/lib/domain/campeonato/tipos';
import { listarCampeonatos } from '@/lib/repo/campeonato-repo';
import { criarCampeonatoAcao, duplicarCampeonatoAcao, selecionarCampeonato } from '../../acoes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Campeonatos — Admin Copa Jumentus' };
const VOLTA = '/admin/campeonatos';

export default async function Campeonatos({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const [lista, atual] = await Promise.all([listarCampeonatos(), idDoCampeonatoDoAdmin()]);
  const nomeDe = (id?: number) => lista.find((c) => c.id === id)?.nome;

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Campeonatos</h1>
      <Aviso texto={erro} />
      <Aviso texto={ok} tipo="ok" />

      <Secao titulo="Edições">
        <ul className="divide-y divide-[var(--panel-stroke)]">
          {lista.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-[12rem] flex-1">
                <p className="font-semibold text-text-1">
                  {c.nome}
                  {c.edicao && !c.nome.includes(c.edicao) ? ` ${c.edicao}` : ''}
                  {c.id === atual && (
                    <span className="hud-label ml-2 !text-[11px]" style={{ color: 'var(--accent)' }}>
                      em edição
                    </span>
                  )}
                </p>
                <p className="font-mono text-sm text-text-3">
                  {ROTULO_STATUS_CAMPEONATO[c.status]} · {c.modelo === 'copa-jumentus-8' ? 'Modelo oficial (34 jogos)' : 'Formato livre'}
                  {c.inicio ? ` · ${formatarData(c.inicio)}` : ''}
                  {c.duplicadoDe ? ` · cópia de ${nomeDe(c.duplicadoDe) ?? `#${c.duplicadoDe}`}` : ''}
                  {c.status !== 'rascunho' ? ` · /edicoes/${c.slug}` : ''}
                </p>
              </div>
              {c.id !== atual && (
                <form action={selecionarCampeonato}>
                  <input type="hidden" name="volta" value={VOLTA} />
                  <input type="hidden" name="campeonatoId" value={c.id} />
                  <button type="submit" className="btn-mini">
                    Editar este
                  </button>
                </form>
              )}
              <details className="w-full sm:w-auto">
                <summary className="btn-mini cursor-pointer list-none">Duplicar</summary>
                <form action={duplicarCampeonatoAcao} className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end">
                  <input type="hidden" name="volta" value={VOLTA} />
                  <input type="hidden" name="origemId" value={c.id} />
                  <label>
                    <span className="rotulo-campo">Nome da cópia</span>
                    <input name="nome" defaultValue={c.nome} required className="campo" />
                  </label>
                  <label>
                    <span className="rotulo-campo">Edição</span>
                    <input name="edicao" className="campo" />
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input type="checkbox" name="comElencos" value="1" />
                    Copiar elencos
                  </label>
                  <button type="submit" className="btn-mini">
                    Criar cópia
                  </button>
                  <p className="text-xs text-text-3 sm:col-span-4">
                    Copia configuração, fases, zonas e equipes. Nunca partidas, súmulas, pagamentos nem inscrições.
                  </p>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Novo campeonato">
        <form action={criarCampeonatoAcao} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="volta" value={VOLTA} />
          <label>
            <span className="rotulo-campo">Nome</span>
            <input name="nome" required defaultValue="Copa Jumentus" className="campo" />
          </label>
          <label>
            <span className="rotulo-campo">Edição</span>
            <input name="edicao" placeholder="Ex.: 2028" className="campo" />
          </label>
          <label>
            <span className="rotulo-campo">Início</span>
            <input name="inicio" type="date" className="campo" />
          </label>
          <label>
            <span className="rotulo-campo">Término</span>
            <input name="fim" type="date" className="campo" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="rotulo-campo">Formato</legend>
            <label className="mt-1 flex items-start gap-2 text-sm">
              <input type="radio" name="modelo" value="copa-jumentus-8" defaultChecked className="mt-1" />
              <span>
                <strong>Modelo oficial · 8 times · 34 jogos.</strong> Grupo Único em turno único (28 jogos, 7 rodadas, 2 dias), repescagem,
                semifinais, 3º lugar e final.
              </span>
            </label>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="radio" name="modelo" value="livre" className="mt-1" />
              <span>
                <strong>Formato livre.</strong> Fases, grupos e partidas definidos à mão.
              </span>
            </label>
          </fieldset>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-cta">
              <span>Criar campeonato</span>
            </button>
            <p className="mt-2 text-xs text-text-3">Nasce em rascunho (fora do site público) com as 8 equipes do manual de marca.</p>
          </div>
        </form>
      </Secao>
    </div>
  );
}

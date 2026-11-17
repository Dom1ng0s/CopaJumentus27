import { Aviso, Secao } from '@/components/campeonato/ui';
import { ROTULO_CRITERIO, ROTULO_STATUS_CAMPEONATO, type StatusCampeonato } from '@/lib/domain/campeonato/tipos';
import { campeonatoDoAdmin } from '@/lib/campeonato/selecao';
import { aplicarModeloAcao, moverCriterio, salvarCampeonato } from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/campeonato';

export default async function ConfigCampeonato({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const c = await campeonatoDoAdmin();

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Campeonato</h1>
      <Aviso texto={erro} />
      <Aviso texto={ok} tipo="ok" />

      <Secao titulo="Dados e pontuação">
        <form action={salvarCampeonato} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="volta" value={VOLTA} />
          <Campo rotulo="Nome" nome="nome" valor={c.nome} obrigatorio />
          <Campo rotulo="Edição" nome="edicao" valor={c.edicao} />
          <label className="block">
            <span className="rotulo-campo">Status</span>
            <select name="status" defaultValue={c.status} className="campo">
              {(Object.keys(ROTULO_STATUS_CAMPEONATO) as StatusCampeonato[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_CAMPEONATO[s]}
                  {s === 'rascunho' ? ' (fora do site público)' : ''}
                </option>
              ))}
            </select>
          </label>
          <Campo rotulo="Endereço no histórico (/edicoes/…)" nome="slug" valor={c.slug} />
          <Campo rotulo="Subtítulo" nome="subtitulo" valor={c.subtitulo} />
          <Campo rotulo="Banner (caminho ou URL, ~4:1)" nome="banner" valor={c.banner} />
          <Campo rotulo="Escudo da edição (caminho ou URL)" nome="escudo" valor={c.escudo} />
          <Campo rotulo="Início" nome="inicio" tipo="date" valor={c.inicio} />
          <Campo rotulo="Término" nome="fim" tipo="date" valor={c.fim} />
          <Campo rotulo="Local" nome="local" valor={c.local} />
          <Campo rotulo="Inscrição por jogador (R$)" nome="valorInscricao" tipo="number" valor={String(c.valorInscricao)} passo="0.01" />
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Campo rotulo="Vitória" nome="vitoria" tipo="number" valor={String(c.pontuacao.vitoria)} />
            <Campo rotulo="Empate" nome="empate" tipo="number" valor={String(c.pontuacao.empate)} />
            <Campo rotulo="Derrota" nome="derrota" tipo="number" valor={String(c.pontuacao.derrota)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-cta">
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </Secao>

      <Secao titulo="Formato">
        <p className="mb-3 text-sm text-text-2">
          {c.modelo === 'copa-jumentus-8'
            ? 'Modelo oficial: Copa Jumentus · 8 times · 34 jogos (Grupo Único em turno único e mata-mata com repescagem).'
            : 'Formato livre: fases, grupos e partidas definidos à mão.'}
        </p>
        {c.partidas.length === 0 ? (
          <form action={aplicarModeloAcao}>
            <input type="hidden" name="volta" value={VOLTA} />
            <button type="submit" className="btn-cta" disabled={c.equipes.length !== 8}>
              <span>Aplicar modelo oficial (34 jogos)</span>
            </button>
            {c.equipes.length !== 8 && <p className="mt-2 text-xs text-text-3">O modelo precisa de exatamente 8 equipes.</p>}
            <p className="mt-2 text-xs text-text-3">Substitui as fases e grupos atuais pelo Grupo Único e o mata-mata. Só sem partidas.</p>
          </form>
        ) : (
          <p className="text-xs text-text-3">O formato só muda em campeonato sem partidas.</p>
        )}
      </Secao>

      <Secao titulo="Critérios de desempate">
        <p className="mb-3 text-sm text-text-2">
          Aplicados de cima para baixo, só entre as equipes que continuam empatadas. Confronto direto com 3 ou mais é uma
          minitabela dos jogos entre elas. Empate em tudo fica pendente em Fases e grupos, para decidir à mão.
        </p>
        <ol className="space-y-2">
          {c.criterios.map((cr, i) => (
            <li key={cr} className="flex items-center gap-3 rounded-component bg-[var(--surface1)] px-3 py-2">
              <span className="w-6 font-mono text-sm text-text-3">{i + 1}</span>
              <span className="flex-1 font-semibold">{ROTULO_CRITERIO[cr]}</span>
              {(['cima', 'baixo'] as const).map((direcao) => (
                <form key={direcao} action={moverCriterio}>
                  <input type="hidden" name="volta" value={VOLTA} />
                  <input type="hidden" name="criterio" value={cr} />
                  <input type="hidden" name="direcao" value={direcao} />
                  <button
                    type="submit"
                    className="btn-mini"
                    disabled={direcao === 'cima' ? i === 0 : i === c.criterios.length - 1}
                    aria-label={`Mover ${ROTULO_CRITERIO[cr]} para ${direcao}`}
                  >
                    {direcao === 'cima' ? '↑' : '↓'}
                  </button>
                </form>
              ))}
            </li>
          ))}
        </ol>
      </Secao>
    </div>
  );
}

function Campo({
  rotulo,
  nome,
  valor,
  tipo = 'text',
  obrigatorio,
  passo,
}: {
  rotulo: string;
  nome: string;
  valor?: string;
  tipo?: string;
  obrigatorio?: boolean;
  passo?: string;
}) {
  return (
    <label className="block">
      <span className="rotulo-campo">{rotulo}</span>
      <input name={nome} type={tipo} defaultValue={valor ?? ''} required={obrigatorio} step={passo} className="campo" />
    </label>
  );
}

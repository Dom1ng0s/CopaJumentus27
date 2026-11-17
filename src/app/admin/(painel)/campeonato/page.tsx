import { Aviso, Secao } from '@/components/campeonato/ui';
import { ROTULO_CRITERIO } from '@/lib/domain/campeonato/tipos';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';
import { moverCriterio, salvarCampeonato } from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/campeonato';

export default async function ConfigCampeonato({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const c = await carregarCampeonato();

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Campeonato</h1>
      <Aviso texto={erro} />

      <Secao titulo="Dados e pontuação">
        <form action={salvarCampeonato} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="volta" value={VOLTA} />
          <Campo rotulo="Nome" nome="nome" valor={c.nome} obrigatorio />
          <Campo rotulo="Subtítulo" nome="subtitulo" valor={c.subtitulo} />
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

      <Secao titulo="Critérios de desempate">
        <p className="mb-3 text-sm text-text-2">Aplicados de cima para baixo quando as equipes empatam.</p>
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

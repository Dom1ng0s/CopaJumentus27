import { Aviso, Escudo, Secao } from '@/components/campeonato/ui';
import { indices } from '@/lib/campeonato/consultas';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';
import {
  criarFase,
  definirGruposManual,
  editarFase,
  excluirFase,
  gerarJogosDosGrupos,
  moverFase,
  sortearGruposDaFase,
} from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/fases';

function Volta() {
  return <input type="hidden" name="volta" value={VOLTA} />;
}

export default async function Fases({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const c = await carregarCampeonato();
  const { equipe } = indices(c);

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Fases e grupos</h1>
      <p className="text-sm text-text-2">
        O formato é livre: crie as fases na ordem em que acontecem. Fases de grupos geram os jogos de todos contra todos; no
        mata-mata, os confrontos são criados em Partidas.
      </p>
      <Aviso texto={erro} />

      {c.fases.map((fase, i) => {
        const grupos = c.grupos.filter((g) => g.faseId === fase.id);
        const jogos = c.partidas.filter((p) => p.faseId === fase.id).length;
        const grupoDe = new Map(grupos.flatMap((g, gi) => g.equipeIds.map((id) => [id, gi])));
        const quantidade = grupos.length || 2;
        return (
          <Secao key={fase.id} titulo={fase.nome} acao={<span className="hud-label text-[10px]">{jogos} jogos</span>}>
            <div className="flex flex-wrap items-end gap-2">
              <form action={editarFase} className="flex flex-1 flex-wrap items-end gap-2">
                <Volta />
                <input type="hidden" name="faseId" value={fase.id} />
                <label className="min-w-[12rem] flex-1">
                  <span className="rotulo-campo">Nome</span>
                  <input name="nome" defaultValue={fase.nome} className="campo" />
                </label>
                <label>
                  <span className="rotulo-campo">Tipo</span>
                  <select name="tipo" defaultValue={fase.tipo} className="campo">
                    <option value="grupos">Grupos (pontos corridos)</option>
                    <option value="mata-mata">Mata-mata</option>
                  </select>
                </label>
                <button type="submit" className="btn-mini">
                  Salvar
                </button>
              </form>
              {(['cima', 'baixo'] as const).map((direcao) => (
                <form key={direcao} action={moverFase}>
                  <Volta />
                  <input type="hidden" name="faseId" value={fase.id} />
                  <input type="hidden" name="direcao" value={direcao} />
                  <button type="submit" className="btn-mini" disabled={direcao === 'cima' ? i === 0 : i === c.fases.length - 1} aria-label={`Mover fase para ${direcao}`}>
                    {direcao === 'cima' ? '↑' : '↓'}
                  </button>
                </form>
              ))}
              <form action={excluirFase}>
                <Volta />
                <input type="hidden" name="faseId" value={fase.id} />
                <button type="submit" className="btn-mini" data-perigo>
                  Excluir
                </button>
              </form>
            </div>

            {fase.tipo === 'grupos' && (
              <div className="mt-5 space-y-4 border-t border-hud pt-4">
                <form action={sortearGruposDaFase} className="flex flex-wrap items-end gap-2">
                  <Volta />
                  <input type="hidden" name="faseId" value={fase.id} />
                  <label>
                    <span className="rotulo-campo">Quantidade de grupos</span>
                    <input name="quantidade" type="number" min={1} max={c.equipes.length} defaultValue={quantidade} className="campo w-28" />
                  </label>
                  <button type="submit" className="btn-hud !py-2 !text-sm">
                    Sortear aleatoriamente
                  </button>
                </form>

                <form action={definirGruposManual} className="space-y-3">
                  <Volta />
                  <input type="hidden" name="faseId" value={fase.id} />
                  <input type="hidden" name="quantidade" value={quantidade} />
                  <p className="rotulo-campo">Ou defina à mão ({quantidade} grupos)</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {c.equipes.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 rounded-component bg-[var(--surface1)] px-2 py-1.5">
                        <Escudo equipe={e} tamanho={22} />
                        <span className="min-w-0 flex-1 truncate text-sm">{e.nome}</span>
                        <select name={`grupo_${e.id}`} defaultValue={grupoDe.get(e.id) ?? -1} className="campo !min-h-0 w-20 !py-1 text-sm">
                          <option value={-1}>—</option>
                          {Array.from({ length: quantidade }, (_, gi) => (
                            <option key={gi} value={gi}>
                              {String.fromCharCode(65 + gi)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="btn-mini">
                    Salvar grupos
                  </button>
                </form>

                {grupos.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {grupos.map((g) => (
                      <div key={g.id} className="rounded-component bg-[var(--surface1)] p-3">
                        <p className="titulo-hero t-sm mb-2 text-base">{g.nome}</p>
                        <ul className="space-y-1 text-sm">
                          {g.equipeIds.map((id) => (
                            <li key={id} className="flex items-center gap-2">
                              <Escudo equipe={equipe.get(id)} tamanho={18} />
                              {equipe.get(id)?.nome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <form action={gerarJogosDosGrupos}>
                  <Volta />
                  <input type="hidden" name="faseId" value={fase.id} />
                  <button type="submit" className="btn-cta" disabled={grupos.length === 0}>
                    <span>Gerar jogos dos grupos</span>
                  </button>
                  <p className="mt-2 text-xs text-text-3">Cria só os confrontos que faltam. Datas e horários você edita em Partidas.</p>
                </form>
              </div>
            )}
          </Secao>
        );
      })}

      <Secao titulo="Nova fase">
        <form action={criarFase} className="flex flex-wrap items-end gap-2">
          <Volta />
          <label className="min-w-[12rem] flex-1">
            <span className="rotulo-campo">Nome</span>
            <input name="nome" placeholder="Ex.: Quartas de final" required className="campo" />
          </label>
          <label>
            <span className="rotulo-campo">Tipo</span>
            <select name="tipo" defaultValue="mata-mata" className="campo">
              <option value="grupos">Grupos (pontos corridos)</option>
              <option value="mata-mata">Mata-mata</option>
            </select>
          </label>
          <button type="submit" className="btn-mini">
            Adicionar
          </button>
        </form>
      </Secao>
    </div>
  );
}

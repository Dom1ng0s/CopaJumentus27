import { Aviso, Escudo, Secao } from '@/components/campeonato/ui';
import { suspensoes } from '@/lib/campeonato/consultas';
import { campeonatoDoAdmin } from '@/lib/campeonato/selecao';
import { adicionarJogador, editarEquipe, editarJogador, removerJogador } from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/equipes';

export default async function EquipesAdmin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const c = await campeonatoDoAdmin();
  const situacao = suspensoes(c);

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Equipes e elencos</h1>
      <p className="text-sm text-text-2">
        Os elencos chegam do sorteio. Aqui você ajusta número, posição, capitão e transfere jogadores entre equipes.
      </p>
      <Aviso texto={erro} />

      {c.equipes.map((e) => {
        const elenco = c.jogadores.filter((j) => j.equipeId === e.id);
        return (
          <Secao key={e.id} titulo={e.nome} acao={<Escudo equipe={e} tamanho={36} />}>
            <form action={editarEquipe} className="mb-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="volta" value={VOLTA} />
              <input type="hidden" name="equipeId" value={e.id} />
              <label className="min-w-[10rem] flex-1">
                <span className="rotulo-campo">Nome</span>
                <input name="nome" defaultValue={e.nome} className="campo" />
              </label>
              <label>
                <span className="rotulo-campo">Sigla</span>
                <input name="sigla" defaultValue={e.sigla} maxLength={4} className="campo w-24" />
              </label>
              <label className="min-w-[10rem] flex-1">
                <span className="rotulo-campo">Capitão</span>
                <select name="capitaoId" defaultValue={e.capitaoId ?? ''} className="campo">
                  <option value="">—</option>
                  {elenco.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nome}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-mini">
                Salvar equipe
              </button>
            </form>

            <ul className="space-y-2">
              {elenco.map((j) => (
                <li key={j.id}>
                  <form action={editarJogador} className="grid grid-cols-[5.5rem_1fr] gap-2 rounded-component bg-[var(--surface1)] p-2 sm:grid-cols-[4rem_1fr_6rem_10rem_auto_auto]">
                    <input type="hidden" name="volta" value={VOLTA} />
                    <input type="hidden" name="jogadorId" value={j.id} />
                    <input name="numero" type="number" min={0} defaultValue={j.numero ?? ''} placeholder="Nº" aria-label="Número da camisa" className="campo" />
                    <div className="flex items-center gap-2">
                      <input name="nome" defaultValue={j.nome} aria-label="Nome" className="campo" />
                      {situacao.get(j.id)?.suspenso && <span className="hud-label text-[9px] text-error">Suspenso</span>}
                    </div>
                    <label className="campo flex cursor-pointer items-center gap-2 !py-0" style={{ touchAction: 'manipulation' }}>
                      <input name="goleiro" type="checkbox" defaultChecked={j.posicao === 'GOL'} className="h-4 w-4 accent-[var(--accent)]" />
                      <span className="text-sm">Goleiro</span>
                    </label>
                    <select name="equipeId" defaultValue={j.equipeId} aria-label="Equipe (transferir)" className="campo">
                      {c.equipes.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.nome}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-mini">
                      Salvar
                    </button>
                    <button type="submit" formAction={removerJogador} className="btn-mini" data-perigo>
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <form action={adicionarJogador} className="mt-3 flex flex-wrap items-end gap-2 border-t border-hud pt-3">
              <input type="hidden" name="volta" value={VOLTA} />
              <input type="hidden" name="equipeId" value={e.id} />
              <input name="numero" type="number" min={0} placeholder="Nº" aria-label="Número" className="campo w-20" />
              <input name="nome" required placeholder="Novo jogador" aria-label="Nome do novo jogador" className="campo min-w-[10rem] flex-1" />
              <label className="campo flex cursor-pointer items-center gap-2 !py-0" style={{ touchAction: 'manipulation' }}>
                      <input name="goleiro" type="checkbox" defaultChecked={false} className="h-4 w-4 accent-[var(--accent)]" />
                      <span className="text-sm">Goleiro</span>
                    </label>
              <button type="submit" className="btn-mini">
                Adicionar
              </button>
            </form>
          </Secao>
        );
      })}
    </div>
  );
}

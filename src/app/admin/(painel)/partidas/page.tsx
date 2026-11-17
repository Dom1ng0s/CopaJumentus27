import Link from 'next/link';
import { Aviso, Escudo, Secao, SeloStatus } from '@/components/campeonato/ui';
import { indices, partidasDaFase } from '@/lib/campeonato/consultas';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';
import { criarPartida, editarPartida, excluirPartida } from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/partidas';

export default async function Partidas({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const c = await carregarCampeonato();
  const { equipe } = indices(c);

  const opcoesEquipes = c.equipes.map((e) => (
    <option key={e.id} value={e.id}>
      {e.nome}
    </option>
  ));

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Partidas</h1>
      <Aviso texto={erro} />

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
              {partidas.map((p) => (
                <li key={p.id} className="rounded-component bg-[var(--surface1)] p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Escudo equipe={equipe.get(p.mandanteId)} tamanho={24} />
                    <span className="font-semibold">{equipe.get(p.mandanteId)?.nome}</span>
                    <span className="font-mono font-bold">
                      {p.status === 'agendada' ? 'x' : `${p.golsMandante} : ${p.golsVisitante}`}
                    </span>
                    <span className="font-semibold">{equipe.get(p.visitanteId)?.nome}</span>
                    <Escudo equipe={equipe.get(p.visitanteId)} tamanho={24} />
                    <SeloStatus status={p.status} />
                    <Link href={`/admin/partidas/${p.id}`} className="btn-cta ml-auto !px-4 !py-2 !text-sm">
                      <span>Súmula / placar</span>
                    </Link>
                  </div>
                  <form action={editarPartida} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_1fr_1fr_auto]">
                    <input type="hidden" name="volta" value={VOLTA} />
                    <input type="hidden" name="partidaId" value={p.id} />
                    <input name="rotulo" defaultValue={p.rotulo ?? ''} placeholder="Rótulo" aria-label="Rótulo" className="campo" />
                    <input name="dataHora" type="datetime-local" defaultValue={p.dataHora ?? ''} aria-label="Data e hora" className="campo" />
                    <select name="mandanteId" defaultValue={p.mandanteId} aria-label="Mandante" className="campo">
                      {opcoesEquipes}
                    </select>
                    <select name="visitanteId" defaultValue={p.visitanteId} aria-label="Visitante" className="campo">
                      {opcoesEquipes}
                    </select>
                    <input name="local" defaultValue={p.local ?? ''} placeholder="Local" aria-label="Local" className="campo" />
                    <button type="submit" className="btn-mini">
                      Salvar
                    </button>
                    <button type="submit" formAction={excluirPartida} className="btn-mini" data-perigo>
                      Excluir
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Secao>
        );
      })}
    </div>
  );
}

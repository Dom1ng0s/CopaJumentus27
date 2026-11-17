import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sumula } from '@/components/campeonato/Sumula';
import { Aviso, Escudo, Secao, SeloStatus } from '@/components/campeonato/ui';
import { formatarDataHora, indices } from '@/lib/campeonato/consultas';
import { calcularSuspensoes, ordenarPartidas } from '@/lib/domain/campeonato/suspensoes';
import type { Equipe, JogadorCampeonato, StatusPartida } from '@/lib/domain/campeonato/tipos';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';
import { adicionarEvento, ajustarPlacar, definirStatus, removerEvento } from '../../../acoes';

export const dynamic = 'force-dynamic';

const STATUS: Array<[StatusPartida, string]> = [
  ['agendada', 'Agendada'],
  ['ao-vivo', 'Ao vivo'],
  ['encerrada', 'Encerrada'],
];

export default async function ControlePartida({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const c = await carregarCampeonato();
  const p = c.partidas.find((x) => x.id === id);
  if (!p) notFound();

  const volta = `/admin/partidas/${p.id}`;
  const { equipe } = indices(c);
  const mandante = equipe.get(p.mandanteId);
  const visitante = equipe.get(p.visitanteId);
  const ehMataMata = c.fases.find((f) => f.id === p.faseId)?.tipo === 'mata-mata';

  // Suspensos para ESTE jogo: cartões das partidas anteriores a ele.
  const ordem = ordenarPartidas(c.partidas);
  const anteriores = ordem.slice(0, ordem.findIndex((x) => x.id === p.id));
  const situacao = calcularSuspensoes(anteriores, new Map(c.jogadores.map((j) => [j.id, j.equipeId])));
  const suspensos = new Set([...situacao.values()].filter((s) => s.suspenso).map((s) => s.jogadorId));

  const Placar = ({ lado, penaltis = false }: { lado: 'mandante' | 'visitante'; penaltis?: boolean }) => (
    <div className="flex items-center justify-center gap-2">
      {[-1, 1].map((delta) => (
        <form key={delta} action={ajustarPlacar}>
          <input type="hidden" name="volta" value={volta} />
          <input type="hidden" name="partidaId" value={p.id} />
          <input type="hidden" name="lado" value={lado} />
          <input type="hidden" name="delta" value={delta} />
          {penaltis && <input type="hidden" name="penaltis" value="1" />}
          <button type="submit" className="btn-mini !min-h-11 !min-w-11 text-lg" aria-label={`${delta > 0 ? 'Somar' : 'Tirar'} ${penaltis ? 'pênalti' : 'gol'} do ${lado}`}>
            {delta > 0 ? '+' : '−'}
          </button>
        </form>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/admin/partidas" className="hud-label">
        ← Partidas
      </Link>
      <Aviso texto={erro} />

      <section className="hud-card relative p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="hud-label">
            {p.rotulo ?? ''} · {formatarDataHora(p.dataHora)}
          </span>
          <SeloStatus status={p.status} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <LadoTime equipe={mandante} />
          <p className="font-mono text-6xl font-bold tabular-nums sm:text-7xl">
            {p.golsMandante}:{p.golsVisitante}
          </p>
          <LadoTime equipe={visitante} />
          <Placar lado="mandante" />
          <span />
          <Placar lado="visitante" />
        </div>

        {ehMataMata && (
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-hud pt-4">
            <Placar lado="mandante" penaltis />
            <p className="text-center">
              <span className="hud-label block text-[10px]">Pênaltis</span>
              <span className="font-mono text-2xl font-bold">
                {p.penaltisMandante ?? 0}:{p.penaltisVisitante ?? 0}
              </span>
            </p>
            <Placar lado="visitante" penaltis />
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-hud pt-4">
          {STATUS.map(([s, rotulo]) => (
            <form key={s} action={definirStatus}>
              <input type="hidden" name="volta" value={volta} />
              <input type="hidden" name="partidaId" value={p.id} />
              <input type="hidden" name="status" value={s} />
              <button type="submit" className="btn-mini" aria-pressed={p.status === s}>
                {rotulo}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-text-3">
          Gol registrado na súmula já soma no placar. Use + e − só para gols sem autor.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {[mandante, visitante].map((e) =>
          e ? (
            <FormEvento
              key={e.id}
              equipe={e}
              jogadores={c.jogadores.filter((j) => j.equipeId === e.id)}
              suspensos={suspensos}
              partidaId={p.id}
              volta={volta}
            />
          ) : null,
        )}
      </div>

      <Secao titulo="Súmula">
        <Sumula
          partida={p}
          campeonato={c}
          acao={(ev) => (
            <form action={removerEvento}>
              <input type="hidden" name="volta" value={volta} />
              <input type="hidden" name="partidaId" value={p.id} />
              <input type="hidden" name="eventoId" value={ev.id} />
              <button type="submit" className="btn-mini" data-perigo aria-label="Remover evento">
                ✕
              </button>
            </form>
          )}
        />
      </Secao>
    </div>
  );
}

function LadoTime({ equipe }: { equipe?: Equipe }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Escudo equipe={equipe} tamanho={64} />
      <span className="titulo-hero t-sm text-base">{equipe?.nome ?? '?'}</span>
    </div>
  );
}

function FormEvento({
  equipe,
  jogadores,
  suspensos,
  partidaId,
  volta,
}: {
  equipe: Equipe;
  jogadores: JogadorCampeonato[];
  suspensos: Set<string>;
  partidaId: string;
  volta: string;
}) {
  const fora = jogadores.filter((j) => suspensos.has(j.id));
  return (
    <Secao titulo={equipe.nome}>
      {fora.length > 0 && (
        <Aviso tipo="info" texto={`Suspensos neste jogo: ${fora.map((j) => j.nome).join(', ')}.`} />
      )}
      {jogadores.length === 0 ? (
        <p className="text-sm text-text-3">Sem jogadores cadastrados nesta equipe.</p>
      ) : (
        <form action={adicionarEvento} className="grid grid-cols-2 gap-2">
          <input type="hidden" name="volta" value={volta} />
          <input type="hidden" name="partidaId" value={partidaId} />
          <label className="col-span-2">
            <span className="rotulo-campo">Jogador</span>
            <select name="jogadorId" required className="campo">
              {jogadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.numero ? `${j.numero} · ` : ''}
                  {j.nome}
                  {suspensos.has(j.id) ? ' (suspenso)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="rotulo-campo">Evento</span>
            <select name="tipo" className="campo">
              <option value="gol">⚽ Gol</option>
              <option value="gol-contra">⚽ Gol contra</option>
              <option value="amarelo">🟨 Amarelo</option>
              <option value="vermelho">🟥 Vermelho</option>
            </select>
          </label>
          <label>
            <span className="rotulo-campo">Minuto</span>
            <input name="minuto" type="number" min={0} inputMode="numeric" className="campo" />
          </label>
          <label className="col-span-2">
            <span className="rotulo-campo">Assistência (só gol)</span>
            <select name="assistenciaId" className="campo" defaultValue="">
              <option value="">Sem assistência</option>
              {jogadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nome}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-cta col-span-2">
            <span>Registrar</span>
          </button>
        </form>
      )}
    </Secao>
  );
}

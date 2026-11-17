import Link from 'next/link';
import { Aviso, CardPartida, Numero, Secao } from '@/components/campeonato/ui';
import { formatarReais, grupoEncerrado, indices, lados } from '@/lib/campeonato/consultas';
import { calcularClassificacao, empatesPendentes } from '@/lib/domain/campeonato/classificacao';
import { ordenarPartidas } from '@/lib/domain/campeonato/suspensoes';
import { campeonatoDoAdmin } from '@/lib/campeonato/selecao';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin — Copa Jumentus' };

export default async function Painel({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const c = await campeonatoDoAdmin();
  const { equipe } = indices(c);
  const pagos = c.jogadores.filter((j) => j.pago).length;
  const proximas = ordenarPartidas(c.partidas).filter((p) => p.status !== 'encerrada').slice(0, 4);
  const semTabela = c.modelo === 'copa-jumentus-8' && c.equipes.some((e) => e.numeroTabela === undefined);
  const empates = c.fases.flatMap((f) =>
    c.grupos
      .filter((g) => g.faseId === f.id && grupoEncerrado(c, g.id))
      .flatMap((g) => empatesPendentes(calcularClassificacao(g.equipeIds, c.partidas.filter((p) => p.grupoId === g.id), c.pontuacao, c.criterios, { desempates: f.desempates }))),
  );

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">{c.nome}</h1>
      <Aviso texto={ok} tipo="ok" />
      <Aviso texto={erro} />
      {semTabela && c.sorteioOficializadoEm && (
        <Aviso tipo="info" texto="Elencos oficializados: falta sortear T1 a T8 (Partidas) para os 28 jogos do Grupo Único terem equipes." />
      )}
      {empates.length > 0 && (
        <Aviso tipo="info" texto={`Há ${empates.length} empate(s) em todos os critérios esperando decisão em Fases e grupos.`} />
      )}

      {!c.sorteioOficializadoEm && (
        <Aviso
          tipo="info"
          texto="Os elencos ainda não vieram do sorteio. Faça a cerimônia e use “Oficializar no campeonato” no final, ou cadastre os jogadores em Equipes."
        />
      )}

      <div className="hud-card relative grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-5">
        <Numero valor={c.equipes.length} rotulo="Equipes" />
        <Numero valor={c.jogadores.length} rotulo="Jogadores" />
        <Numero valor={`${pagos}/${c.jogadores.length}`} rotulo="Pagos" />
        <Numero valor={formatarReais(pagos * c.valorInscricao)} rotulo="Arrecadado" />
        <Numero valor={c.partidas.length} rotulo="Partidas" />
      </div>

      <Secao
        titulo="Próximas partidas"
        acao={
          <Link href="/admin/partidas" className="btn-mini">
            Todas
          </Link>
        }
      >
        {proximas.length === 0 ? (
          <p className="text-sm text-text-3">Nenhuma partida pendente. Crie em Fases e grupos ou em Partidas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proximas.map((p) => (
              <CardPartida key={p.id} partida={p} {...lados(c, p, equipe)} href={`/admin/partidas/${p.id}`} />
            ))}
          </div>
        )}
      </Secao>
    </div>
  );
}

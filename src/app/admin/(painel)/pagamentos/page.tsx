import Link from 'next/link';
import { Aviso, Escudo, Numero, Secao } from '@/components/campeonato/ui';
import { formatarReais } from '@/lib/campeonato/consultas';
import { carregarCampeonato } from '@/lib/repo/campeonato-repo';
import { alternarPagamento } from '../../acoes';

export const dynamic = 'force-dynamic';
const VOLTA = '/admin/pagamentos';

export default async function Pagamentos({ searchParams }: { searchParams: Promise<{ erro?: string; filtro?: string }> }) {
  const { erro, filtro } = await searchParams;
  const c = await carregarCampeonato();
  const pagos = c.jogadores.filter((j) => j.pago).length;
  const pendentes = c.jogadores.length - pagos;

  return (
    <div className="space-y-6">
      <h1 className="titulo-hero t-xl text-4xl">Pagamentos</h1>
      <Aviso texto={erro} />
      {c.valorInscricao === 0 && (
        <Aviso tipo="info" texto="Defina o valor da inscrição por jogador em Campeonato para ver os totais em reais." />
      )}

      <div className="hud-card relative grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-4">
        <Numero valor={pagos} rotulo="Pagos" />
        <Numero valor={pendentes} rotulo="Pendentes" />
        <Numero valor={formatarReais(pagos * c.valorInscricao)} rotulo="Recebido" />
        <Numero valor={formatarReais(pendentes * c.valorInscricao)} rotulo="A receber" />
      </div>

      <nav className="flex gap-2" aria-label="Filtro">
        {[
          ['', 'Todos'],
          ['pendentes', 'Pendentes'],
          ['pagos', 'Pagos'],
        ].map(([valor, rotulo]) => (
          <Link key={valor} href={valor ? `${VOLTA}?filtro=${valor}` : VOLTA} className="btn-mini" aria-pressed={(filtro ?? '') === valor}>
            {rotulo}
          </Link>
        ))}
      </nav>

      {c.equipes.map((e) => {
        const elenco = c.jogadores
          .filter((j) => j.equipeId === e.id)
          .filter((j) => (filtro === 'pagos' ? j.pago : filtro === 'pendentes' ? !j.pago : true));
        if (elenco.length === 0) return null;
        return (
          <Secao key={e.id} titulo={e.nome} acao={<Escudo equipe={e} tamanho={30} />}>
            <ul className="divide-y divide-[var(--panel-stroke)]">
              {elenco.map((j) => (
                <li key={j.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1 font-semibold">{j.nome}</span>
                  <form action={alternarPagamento}>
                    <input type="hidden" name="volta" value={filtro ? `${VOLTA}?filtro=${filtro}` : VOLTA} />
                    <input type="hidden" name="jogadorId" value={j.id} />
                    <button type="submit" className="btn-mini w-28" aria-pressed={j.pago}>
                      {j.pago ? 'Pago' : 'Pendente'}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Secao>
        );
      })}

      {c.jogadores.length === 0 && <p className="text-sm text-text-3">Nenhum jogador no campeonato ainda.</p>}
    </div>
  );
}

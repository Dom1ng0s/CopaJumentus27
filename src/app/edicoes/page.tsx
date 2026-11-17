import Link from 'next/link';
import { Cabecalho } from '@/components/campeonato/ui';
import { formatarData } from '@/lib/campeonato/consultas';
import { edicoesPublicas } from '@/lib/campeonato/selecao';
import { ROTULO_STATUS_CAMPEONATO } from '@/lib/domain/campeonato/tipos';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edições — Copa Jumentus' };

/** Histórico: toda edição publicada (encerradas continuam consultáveis). */
export default async function Edicoes() {
  const edicoes = await edicoesPublicas();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20">
      <Cabecalho titulo="Edições" />
      {edicoes.length === 0 && <p className="text-sm text-text-3">Nenhuma edição publicada ainda.</p>}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {edicoes.map((e) => (
          <li key={e.id}>
            <Link href={`/edicoes/${e.slug}`} className="hud-card hud-clip modulo relative flex items-center gap-3 px-4 py-4">
              {e.escudo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.escudo} alt="" width={44} height={44} className="h-11 w-auto object-contain" />
              )}
              <span>
                <span className="titulo-hero t-sm block text-2xl">
                  {e.nome}
                  {e.edicao && !e.nome.includes(e.edicao) ? ` ${e.edicao}` : ''}
                </span>
                <span className="hud-label block !text-[11px]">
                  {ROTULO_STATUS_CAMPEONATO[e.status]}
                  {e.inicio ? ` · ${formatarData(e.inicio)}` : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

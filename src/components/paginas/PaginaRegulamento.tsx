import Link from 'next/link';
import { Cabecalho, Secao } from '@/components/campeonato/ui';
import type { CampeonatoPublico } from '@/lib/campeonato/selecao';
import { montarRegulamento } from '@/lib/domain/campeonato/regulamento';

/** Regulamento da edição, gerado da configuração do campeonato (regulamento.ts). */
export function PaginaRegulamento({ c, base }: CampeonatoPublico) {
  const secoes = montarRegulamento(c);
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <Cabecalho titulo="Regulamento" legenda={`${c.nome}${c.edicao && !c.nome.includes(c.edicao) ? ` ${c.edicao}` : ''}`} />
      <div className="space-y-5">
        {secoes.map((s) => (
          <Secao key={s.titulo} titulo={s.titulo}>
            <ul className="space-y-2.5">
              {s.itens.map((item) => (
                <li key={item} className="flex gap-3 text-base leading-relaxed text-text-1">
                  <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 bg-[var(--accent)]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Secao>
        ))}
        <p className="text-sm text-text-3">Casos não previstos aqui são resolvidos pela organização.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`${base}/jogos`} className="btn-hud">
            Ver os jogos
          </Link>
          <Link href={`${base}/classificacao`} className="btn-hud">
            Ver a tabela
          </Link>
        </div>
      </div>
    </div>
  );
}

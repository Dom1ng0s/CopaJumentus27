import Link from 'next/link';
import { Estrelas } from '@/components/Estrelas';
import { HudCard } from '@/components/HudCard';
import { PalmBackdrop } from '@/components/PalmBackdrop';
import { WordmarkCopaJumentus, WordmarkViceCity } from '@/components/Wordmark';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO } from '@/lib/config';
import { decodificarResultado } from '@/lib/share/codec';

export const metadata = { title: 'Resultado do sorteio — Copa Jumentus' };

interface Props {
  params: Promise<{ payload: string }>;
}

export default async function ResultadoPage({ params }: Props) {
  const { payload } = await params;
  const dados = decodificarResultado(payload);

  if (!dados) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="titulo-hero t-xl text-4xl">Link inválido</h1>
        <p className="mt-3 text-sm text-text-2">
          Este link de resultado está incompleto ou foi truncado pelo app de mensagens. Peça um
          novo à comissão.
        </p>
        <Link href="/" className="btn-hud mt-8 inline-block">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 pb-20">
      <PalmBackdrop className="opacity-90" intensidade="ambiente" />

      <div className="relative mx-auto max-w-3xl">
        <header className="py-6 text-center">
          <p className="hud-label mb-3">Resultado oficial do sorteio</p>
          <h1 className="mx-auto w-full max-w-[min(88vw,560px)]">
            <span className="sr-only">{NOME_COMPETICAO}</span>
            <WordmarkCopaJumentus />
          </h1>
          <h2 className="mx-auto mt-3 w-full max-w-[min(52vw,300px)]">
            <span className="sr-only">{SUBTITULO_COMPETICAO}</span>
            <WordmarkViceCity />
          </h2>
          <p className="mt-4 font-mono text-xs text-text-3">
            {dados.d} · amplitude de {dados.a} estrela(s)
          </p>
        </header>

        <div className="mt-4 space-y-4">
          {dados.t.map(([nomeTime, capitao, goleiro, linha], i) => {
            const soma = capitao[1] + linha.reduce((s, [, est]) => s + est, 0);
            return (
              <HudCard key={`${nomeTime}-${i}`} clip className="p-4 pb-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="titulo-hero text-2xl sm:text-3xl">{nomeTime}</h3>
                  <span
                    className="shrink-0 font-mono text-sm font-bold"
                    style={{ color: 'var(--warning)' }}
                  >
                    {soma}★
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  <Item nome={capitao[0]} rotulo="CAP" estrelas={capitao[1]} cor="var(--accent-orange)" />
                  {goleiro !== 0 ? (
                    <Item nome={goleiro[0]} rotulo="GOL" estrelas={goleiro[1]} cor="var(--accent-armor)" />
                  ) : (
                    <li className="hud-label text-[10px]" style={{ color: 'var(--text3)' }}>
                      goleiro: a definir
                    </li>
                  )}
                  {linha.map(([nome, est, pos], k) => (
                    <Item key={`${nome}-${k}`} nome={nome} rotulo={pos} estrelas={est} />
                  ))}
                </ul>
              </HudCard>
            );
          })}
        </div>

        <footer className="pt-12 text-center">
          <p className="hud-label text-[10px]">
            Sorteio balanceado por nível · Copa Jumentus — Vice City
          </p>
        </footer>
      </div>
    </div>
  );
}

function Item({
  nome,
  rotulo,
  estrelas,
  cor,
}: {
  nome: string;
  rotulo: string;
  estrelas: number;
  cor?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
      <span className="flex min-w-0 items-center gap-3">
        <span
          className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ color: cor ?? 'var(--text3)', width: 26 }}
        >
          {rotulo}
        </span>
        <span className="truncate text-sm">{nome}</span>
      </span>
      <Estrelas nivel={estrelas} tamanho={11} pulsar={false} />
    </li>
  );
}

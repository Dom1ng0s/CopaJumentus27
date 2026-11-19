'use client';

import { rotuloPosicao } from '@/lib/domain/tipos';
import { useCallback, useMemo, useState } from 'react';
import { EscudoPorNome, IconeLuva, SeloCapitao } from '@/components/campeonato/ui';
import { HudCard } from '@/components/HudCard';
import { marcaPorNome } from '@/lib/campeonato/marcas';
import { formatarPayloadWhatsApp, type PayloadResultado } from '@/lib/share/codec';

interface Props {
  dados: PayloadResultado;
}

/**
 * Visão pública dos elencos sorteados (mobile-first).
 * Conforme CLAUDE.md §1, §5 e §8.4: a plateia nunca vê estrelas.
 */
export function ResultadoCliente({ dados }: Props) {
  const [busca, setBusca] = useState('');
  const [timeFiltro, setTimeFiltro] = useState<string | null>(null);
  const [copiadoWhats, setCopiadoWhats] = useState(false);
  const [copiadoUrl, setCopiadoUrl] = useState(false);

  const termo = busca.trim().toLowerCase();

  const timesFiltrados = useMemo(() => {
    return dados.t.filter(([nomeTime, capitao, goleiro, linha]) => {
      if (timeFiltro && nomeTime !== timeFiltro) return false;
      if (!termo) return true;
      if (nomeTime.toLowerCase().includes(termo)) return true;
      if (capitao !== 0 && capitao.toLowerCase().includes(termo)) return true;
      if (goleiro !== 0 && goleiro.toLowerCase().includes(termo)) return true;
      return linha.some(([nome, pos]) => {
        return nome.toLowerCase().includes(termo) || pos.toLowerCase().includes(termo);
      });
    });
  }, [dados.t, timeFiltro, termo]);

  const copiarWhatsApp = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : undefined;
    const texto = formatarPayloadWhatsApp(dados, url);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoWhats(true);
      setTimeout(() => setCopiadoWhats(false), 3000);
    } catch {
      setCopiadoWhats(false);
    }
  }, [dados]);

  const compartilharLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Os times estão definidos — Copa Jumentus Vice City',
          text: `Confira os ${dados.t.length} elencos oficiais sorteados na Copa Jumentus!`,
          url,
        });
        return;
      } catch {
        // Fallback para clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiadoUrl(true);
      setTimeout(() => setCopiadoUrl(false), 3000);
    } catch {
      setCopiadoUrl(false);
    }
  }, [dados.t.length]);

  return (
    <div className="mt-4 space-y-6">
      {/* Acoes de compartilhamento para a galera */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={copiarWhatsApp} className="btn-cta !px-6 !py-2.5 !text-sm">
          <span>{copiadoWhats ? 'Escalações copiadas!' : 'Copiar p/ WhatsApp'}</span>
        </button>
        <button onClick={compartilharLink} className="btn-hud !px-5 !py-2 !text-sm">
          {copiadoUrl ? 'Link copiado!' : 'Compartilhar link'}
        </button>
      </div>

      {/* Busca rapida e filtro por franquia */}
      <div className="hud-card modulo space-y-3 p-4">
        <div>
          <label htmlFor="busca-resultado" className="rotulo-campo">
            Encontre seu nome ou time
          </label>
          <input
            id="busca-resultado"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite seu nome, apelido, posição (GOL, ZAG, MEI, ATA) ou time..."
            className="campo"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTimeFiltro(null)}
            aria-pressed={timeFiltro === null}
            className="btn-mini !min-h-8 !px-2.5 !text-xs"
          >
            Todos ({dados.t.length})
          </button>
          {dados.t.map(([nomeTime]) => {
            const m = marcaPorNome(nomeTime);
            return (
              <button
                key={nomeTime}
                type="button"
                onClick={() => setTimeFiltro((atual) => (atual === nomeTime ? null : nomeTime))}
                aria-pressed={timeFiltro === nomeTime}
                className="btn-mini !min-h-8 !px-2.5 !text-xs"
              >
                {m?.sigla ?? nomeTime}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade dos elencos definidos (sem estrelas, com escudos e cores do manual) */}
      {timesFiltrados.length === 0 ? (
        <HudCard className="p-8 text-center">
          <p className="titulo-hero text-2xl text-text-1">Nenhum jogador ou time encontrado</p>
          <p className="mt-2 text-xs text-text-3">
            Limpe a busca para visualizar todos os {dados.t.length} elencos.
          </p>
          <button
            type="button"
            onClick={() => {
              setBusca('');
              setTimeFiltro(null);
            }}
            className="btn-mini mt-4"
          >
            Mostrar todos
          </button>
        </HudCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {timesFiltrados.map(([nomeTime, capitao, goleiro, linha], i) => {
            const marca = marcaPorNome(nomeTime);
            const capBate = Boolean(termo && capitao !== 0 && capitao.toLowerCase().includes(termo));
            const golBate = Boolean(
              termo && goleiro !== 0 && goleiro.toLowerCase().includes(termo),
            );

            return (
              <HudCard key={`${nomeTime}-${i}`} clip className="modulo overflow-hidden pb-4">
                {/* Cabecalho na cor primaria da franquia com faixa secundaria e filete dourado a 45° */}
                <div
                  className="malha-camisa flex items-center gap-3 px-4 py-4"
                  style={
                    marca
                      ? {
                          color: marca.corTexto,
                          backgroundImage: `linear-gradient(135deg, ${marca.corPrimaria} 0 82%, ${marca.corSecundaria} 82% 91%, ${marca.corPrimaria} 91% 93%, #D4A12A 93% 95%, ${marca.corPrimaria} 95%)`,
                        }
                      : { background: 'var(--surface2)' }
                  }
                >
                  <EscudoPorNome nome={nomeTime} tamanho={52} />
                  <div className="min-w-0 flex-1">
                    <span
                      className="block font-mono text-[11px] font-bold uppercase tracking-wider opacity-85"
                      style={{ color: marca?.corTexto }}
                    >
                      {marca?.sigla ?? 'MLS'} · {1 + (goleiro !== 0 ? 1 : 0) + linha.length} atletas
                    </span>
                    <h3
                      className="titulo-hero t-sm truncate text-2xl sm:text-3xl"
                      style={{ color: marca?.corTexto }}
                    >
                      {nomeTime}
                    </h3>
                  </div>
                </div>

                <ul className="divide-y divide-[var(--panel-stroke)] px-4 pt-2">
                  {/* Linha 1: Goleiro sempre no topo (manual §7.3 — Elenco) */}
                  {goleiro !== 0 ? (
                    <Item
                      nome={goleiro}
                      rotulo="GOL"
                      cor="var(--accent-armor)"
                      ehGoleiro
                      destacado={golBate}
                    />
                  ) : (
                    <li className="hud-label py-2 text-[10px]" style={{ color: 'var(--text3)' }}>
                      goleiro: a definir
                    </li>
                  )}

                  {/* Capitão só em links antigos: desde 18/11/2026 o time escolhe depois. */}
                  {capitao !== 0 && (
                    <Item
                      nome={capitao}
                      rotulo="CAP"
                      cor="var(--accent)"
                      ehCapitao
                      destacado={capBate}
                    />
                  )}

                  {/* Jogadores de linha */}
                  {linha.map(([nome, pos], k) => {
                    const bate = Boolean(
                      termo &&
                        (nome.toLowerCase().includes(termo) || pos.toLowerCase().includes(termo)),
                    );
                    return <Item key={`${nome}-${k}`} nome={nome} rotulo={rotuloPosicao(pos)} destacado={bate} />;
                  })}
                </ul>
              </HudCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Item({
  nome,
  rotulo,
  cor,
  ehCapitao = false,
  ehGoleiro = false,
  destacado = false,
}: {
  nome: string;
  rotulo: string;
  cor?: string;
  ehCapitao?: boolean;
  ehGoleiro?: boolean;
  destacado?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 py-2 ${
        destacado ? 'linha-selecionada' : ''
      }`}
      style={ehCapitao ? { borderBottom: '2px solid var(--accent)' } : undefined}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className="corte-direita inline-flex h-6 w-10 shrink-0 items-center justify-center pr-1 font-mono text-[11px] font-bold uppercase tracking-wider"
          style={{
            background: ehCapitao ? 'var(--accent-subtle)' : 'var(--surface2)',
            color: cor ?? 'var(--text2)',
          }}
        >
          {rotulo}
        </span>
        <span className="truncate font-mono text-base font-bold uppercase tracking-wide text-text-1">
          {nome}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {ehGoleiro && <IconeLuva tamanho={16} cor="var(--accent-armor)" />}
        {ehCapitao && <SeloCapitao tamanho={22} />}
      </span>
    </li>
  );
}

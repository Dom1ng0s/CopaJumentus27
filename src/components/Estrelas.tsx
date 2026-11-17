// Wanted System de 6 estrelas (design system §4.C).
// Mesma escala do dominio: 1 a 6, sem conversao (CLAUDE.md §3.2).

const TOTAL = 6;

interface Props {
  nivel: number;
  tamanho?: number;
  /** Nivel alto (5 ou 6) pulsa, como no HUD do jogo. */
  pulsar?: boolean;
}

export function Estrelas({ nivel, tamanho = 16, pulsar = true }: Props) {
  const alto = nivel >= 5;

  return (
    <span
      className="inline-flex items-center gap-[3px]"
      role="img"
      aria-label={`${nivel} de ${TOTAL} estrelas`}
    >
      {Array.from({ length: TOTAL }, (_, i) => {
        const ativa = i < nivel;
        return (
          <svg
            key={i}
            width={tamanho}
            height={tamanho}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={ativa && alto && pulsar ? 'wanted-pulse' : undefined}
            style={{ animationDelay: ativa ? `${i * 90}ms` : undefined }}
          >
            <path
              d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.6 5.9 20.8 7.3 14l-5-4.6 6.8-.8z"
              fill={ativa ? (alto ? 'var(--accent-orange)' : '#ffffff') : 'none'}
              stroke={ativa ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

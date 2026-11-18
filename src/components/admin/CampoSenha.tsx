'use client';

import { useState } from 'react';

type Props = {
  name: string;
  autoComplete: string;
  minLength?: number;
  autoFocus?: boolean;
};

/** Campo de senha com o "olhinho" para mostrar ou esconder o que foi digitado. */
export function CampoSenha({ name, autoComplete, minLength, autoFocus }: Props) {
  const [visivel, setVisivel] = useState(false);
  return (
    <span className="relative block">
      <input
        name={name}
        type={visivel ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        className="campo pr-12"
      />
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Esconder senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-2 transition-colors duration-150 hover:text-text-1 focus-visible:text-[var(--dourado-claro)] focus-visible:outline-none active:scale-95"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visivel && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </span>
  );
}

// Palco de evento Vice City (manual de marca §Cores — Paleta Vice City):
// Ceu: #2A0E4F -> #3B146B -> #7B208F -> #C9349B -> #F36A78 -> #FF9B55, horizonte em 3/4,
// #1E0838 abaixo e dissolve para var(--background) (#06122A).
// Sol: #FFE08A -> #FFB458 -> #FF9B55 cortado por faixas horizontais.
// Palmeiras: silhuetas nas laterais e na base.

import type { CSSProperties } from 'react';

interface Props {
  className?: string;
  /** 'hero' queima o ceu inteiro (peca de evento). 'ambiente' e a versao contida. */
  intensidade?: 'hero' | 'ambiente';
}

export function PalmBackdrop({ className = '', intensidade = 'hero' }: Props) {
  const hero = intensidade === 'hero';

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Ceu padrao do manual de marca */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: hero ? '100%' : '52%',
          backgroundImage:
            'linear-gradient(180deg, #2A0E4F 0%, #3B146B 17%, #7B208F 37%, #C9349B 54%, #F36A78 65%, #FF9B55 75%, #1E0838 90%, #06122A 100%)',
          opacity: hero ? 0.92 : 0.48,
        }}
      />

      {/* Halo ambar no horizonte */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: hero ? '10%' : '0%',
          width: 1200,
          height: 620,
          background:
            'radial-gradient(ellipse at center, rgba(255, 180, 88, 0.42) 0%, rgba(201, 52, 155, 0.24) 40%, transparent 70%)',
        }}
      />

      {/* Disco solar (#FFE08A -> #FFB458 -> #FF9B55) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          top: hero ? '28%' : '10%',
          width: hero ? 340 : 190,
          height: hero ? 340 : 190,
          background:
            'radial-gradient(circle, #FFE08A 0%, #FFB458 42%, #FF9B55 64%, rgba(255, 155, 85, 0) 74%)',
          opacity: hero ? 0.92 : 0.45,
        }}
      />

      {/* Faixas horizontais cortando o sol */}
      {hero && (
        <div
          className="absolute inset-x-0"
          style={{
            top: '44%',
            height: 150,
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(30, 8, 56, 0.55) 0px, rgba(30, 8, 56, 0.55) 3px, transparent 3px, transparent 14px)',
          }}
        />
      )}

      {/* Dissolve para o marinho profundo do sistema (--background: #06122A) */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: hero ? '22%' : '62%',
          backgroundImage: 'linear-gradient(180deg, transparent 0%, var(--background) 92%)',
        }}
      />

      {/* Palmeiras em silhueta nas laterais e na base */}
      <Palmeira className="absolute bottom-0 left-0" style={{ height: hero ? 430 : 250 }} />
      <Palmeira
        className="absolute bottom-0 right-0"
        style={{ height: hero ? 370 : 210, transform: 'scaleX(-1)' }}
      />
      {hero && (
        <Palmeira className="absolute bottom-0 left-[22%] opacity-65" style={{ height: 240 }} />
      )}
    </div>
  );
}

function Palmeira({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`w-auto ${className}`} style={style} viewBox="0 0 240 420" fill="#06122A">
      {/* tronco */}
      <path d="M112 420c-4-120 2-212 10-286l14 2c-9 74-14 166-10 284z" />
      {/* folhas */}
      <path d="M126 136c30-44 76-62 126-52-42 4-78 24-100 56-9 13-25 9-26-4z" />
      <path d="M120 132C98 84 54 54 2 54c42 14 74 42 92 80 5 12 22 13 26-2z" />
      <path d="M128 130c38-18 84-10 118 22-38-14-78-14-108 4-10 6-19-20-10-26z" />
      <path d="M118 128C92 100 48 90 4 104c43-4 82 10 106 36 7 7 15-5 8-12z" />
      <path d="M124 124c10-48 44-86 94-104-38 24-64 60-72 106-2 12-23 10-22-2z" />
      <path d="M122 126C116 78 90 38 44 14c34 28 56 66 60 112 1 12 20 12 18 0z" />
      {/* cocos */}
      <circle cx="118" cy="140" r="7" />
      <circle cx="132" cy="146" r="6" />
    </svg>
  );
}

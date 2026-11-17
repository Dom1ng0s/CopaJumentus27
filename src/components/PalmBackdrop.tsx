// Palco key art: sol queimando, ceu de sunset, palmeiras grandes em silhueta.
// A referencia aqui e a arte do trailer, nao o site de pre-venda.
// Decorativo: pointer-events-none, aria-hidden.

import type { CSSProperties } from 'react';

interface Props {
  className?: string;
  /** 'hero' queima o ceu inteiro. 'ambiente' e a versao contida para paginas internas. */
  intensidade?: 'hero' | 'ambiente';
}

export function PalmBackdrop({ className = '', intensidade = 'hero' }: Props) {
  const hero = intensidade === 'hero';

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Ceu de sunset: violeta em cima, pink no meio, laranja queimando embaixo */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          // No hero o ceu desce ate a base: o tronco das palmeiras e da cor do
          // campo escuro, entao so e visivel recortado contra o ceu aceso.
          height: hero ? '100%' : '46%',
          backgroundImage:
            'linear-gradient(180deg, #2A1046 0%, #6B1E63 26%, #C53A7E 48%, #FF7A3D 70%, #FFB067 86%, #E8743A 100%)',
          opacity: hero ? 0.95 : 0.42,
        }}
      />

      {/* Halo quente */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: hero ? '4%' : '0%',
          width: 1200,
          height: 620,
          background:
            'radial-gradient(ellipse at center, rgba(255,147,71,0.45) 0%, rgba(241,67,162,0.28) 38%, transparent 70%)',
        }}
      />

      {/* Disco solar */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          top: hero ? '30%' : '12%',
          width: hero ? 340 : 190,
          height: hero ? 340 : 190,
          background:
            'radial-gradient(circle, #FFE9B0 0%, #FFC46B 38%, #FF8A47 62%, rgba(255,120,60,0) 72%)',
          opacity: hero ? 0.95 : 0.45,
        }}
      />

      {/* Linhas de horizonte retro cortando o sol */}
      {hero && (
        <div
          className="absolute inset-x-0"
          style={{
            top: '46%',
            height: 150,
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(12,13,27,0.5) 0px, rgba(12,13,27,0.5) 3px, transparent 3px, transparent 14px)',
          }}
        />
      )}

      {/* Dissolve para o campo escuro.
          Comeca tarde de proposito: se o dissolve subir demais, o tronco das
          palmeiras (que e da cor do campo) some e elas viram arbustos. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: hero ? '18%' : '62%',
          backgroundImage: 'linear-gradient(180deg, transparent 0%, #0C0D1B 92%)',
        }}
      />

      {/* Palmeiras grandes em silhueta solida */}
      <Palmeira className="absolute bottom-0 left-0" style={{ height: hero ? 430 : 250 }} />
      <Palmeira
        className="absolute bottom-0 right-0"
        style={{ height: hero ? 370 : 210, transform: 'scaleX(-1)' }}
      />
      {hero && (
        <Palmeira className="absolute bottom-0 left-[24%] opacity-70" style={{ height: 240 }} />
      )}
    </div>
  );
}

function Palmeira({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`w-auto ${className}`} style={style} viewBox="0 0 240 420" fill="#0C0D1B">
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

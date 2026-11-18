import type { ReactNode } from 'react';

/** Barra segmentada inferior, motivo de transmissao da liga (dourado, vermelho, marinho). */
export function MinimapBar() {
  return (
    <div className="hud-minimap-bar absolute bottom-0 left-0 right-0" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

interface Props {
  children: ReactNode;
  className?: string;
  /** Canto cortado assimetrico a 45°. */
  clip?: boolean;
  /** Barra de status inferior. Cards de metrica/perfil devem ter. */
  barra?: boolean;
  destaque?: boolean;
}

export function HudCard({ children, className = '', clip = true, barra = true, destaque = false }: Props) {
  return (
    <div
      className={`hud-card overflow-hidden ${clip ? 'hud-clip' : ''} ${className}`}
      style={
        destaque
          ? { borderColor: 'var(--accent)', boxShadow: 'var(--shadow-3)' }
          : undefined
      }
    >
      {children}
      {barra && <MinimapBar />}
    </div>
  );
}

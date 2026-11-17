'use client';

/** Imprime a página com o CSS de impressão (globals.css, @media print). Sem biblioteca de PDF. */
export function BotaoImprimir({ rotulo = 'Imprimir' }: { rotulo?: string }) {
  return (
    <button type="button" className="btn-mini nao-imprimir" onClick={() => window.print()}>
      {rotulo}
    </button>
  );
}

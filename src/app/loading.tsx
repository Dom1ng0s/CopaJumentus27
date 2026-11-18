// Esqueleto enquanto a tela carrega: mesmo desenho dos módulos, sem texto falso.

export default function Carregando() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:pt-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="esqueleto mb-3 h-12 w-56" />
      <div className="filete mb-10 w-24 opacity-60" aria-hidden="true" />
      <div className="esqueleto mb-8 h-24 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="esqueleto h-36" />
        ))}
      </div>
    </div>
  );
}

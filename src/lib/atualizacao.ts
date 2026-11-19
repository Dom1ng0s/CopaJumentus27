// Aba aberta antes de um deploy chama server actions que não existem mais
// (aconteceu na importação de inscritos em 19/11/2026). O Next lança
// UnrecognizedActionError no navegador e nada chega ao servidor. O error boundary
// usa estas regras para recarregar a tela uma vez e avisar. Puro e testado.

export const AVISO_SITE_ATUALIZADO = 'O site foi atualizado. Recarregamos esta tela. Refaça a última ação.';

/** Chave do sessionStorage: quando foi a última recarga automática (ms). */
export const CHAVE_RECARGA = 'copa-jumentus:recarga-por-atualizacao';

/** Duas recargas automáticas seguidas em menos que isso viram erro normal, sem laço. */
export const INTERVALO_MINIMO_MS = 30_000;

/** O erro é de server action que este deploy não conhece? */
export function ehAcaoDesatualizada(erro: unknown): boolean {
  if (!(erro instanceof Error)) return false;
  return (
    erro.name === 'UnrecognizedActionError' ||
    /failed-to-find-server-action|Failed to find Server Action|was not found on the server/i.test(erro.message)
  );
}

/** Pode recarregar agora? Não, se já recarregou automaticamente há pouco. */
export function podeRecarregar(agora: number, ultimaRecarga: number | null): boolean {
  return ultimaRecarga === null || !Number.isFinite(ultimaRecarga) || agora - ultimaRecarga >= INTERVALO_MINIMO_MS;
}

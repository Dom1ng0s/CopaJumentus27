// Bloqueio por tentativas erradas (CLAUDE.md §4.1). Puro e testável.

export const MAX_TENTATIVAS_LOGIN = 5;
export const BLOQUEIO_MS = 15 * 60 * 1000;

export interface EstadoTentativas {
  tentativasFalhas: number;
  bloqueadoAte: Date | null;
}

export function estaBloqueado(estado: EstadoTentativas, agora: Date): boolean {
  return estado.bloqueadoAte !== null && estado.bloqueadoAte.getTime() > agora.getTime();
}

/** Estado depois de uma senha errada: na 5ª seguida, bloqueia por 15 minutos e zera a contagem. */
export function aposFalha(estado: EstadoTentativas, agora: Date): EstadoTentativas {
  // Um bloqueio vencido não conta mais: recomeça do zero.
  const base = estado.bloqueadoAte && !estaBloqueado(estado, agora) ? 0 : estado.tentativasFalhas;
  const tentativas = base + 1;
  if (tentativas >= MAX_TENTATIVAS_LOGIN) {
    return { tentativasFalhas: 0, bloqueadoAte: new Date(agora.getTime() + BLOQUEIO_MS) };
  }
  return { tentativasFalhas: tentativas, bloqueadoAte: estaBloqueado(estado, agora) ? estado.bloqueadoAte : null };
}

export const ESTADO_LIMPO: EstadoTentativas = { tentativasFalhas: 0, bloqueadoAte: null };

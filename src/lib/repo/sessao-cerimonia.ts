// Persistencia local da sessao de cerimonia (CLAUDE.md §4.2).
// Nenhum componente de UI acessa localStorage diretamente; tudo passa por este modulo.

import type { ResultadoSorteioOk } from '@/lib/domain/sorteio';

/** Goleiros primeiro, depois a linha (decisão do operador em 18/11/2026). */
export type FaseCerimonia = 'pronto' | 'goleiros' | 'pre-linha' | 'linha' | 'fim';

export interface SessaoCerimonia {
  resultado: ResultadoSorteioOk;
  reveladasLinha: number;
  reveladasGol: number;
  fase: FaseCerimonia;
  /** false enquanto o nome está na tela e o time ainda não foi sorteado. */
  timeRevelado?: boolean;
  assinaturaCadastro: string;
}

// v3: sorteio com composição idêntica (19/11/2026); sessões antigas são descartadas.
const CHAVE_SESSAO = 'copa-jumentus:sessao-cerimonia:v3';

/** Gera uma assinatura simples do cadastro atual para invalidar sessao se o elenco mudar. */
export function assinarCadastro(idsJogadores: readonly string[], idsTimes: readonly string[]): string {
  return `${idsTimes.join(',')}::${idsJogadores.join(',')}`;
}

export function carregarSessaoCerimonia(assinaturaAtual: string): SessaoCerimonia | null {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const obj = JSON.parse(bruto) as SessaoCerimonia;
    if (
      !obj ||
      obj.assinaturaCadastro !== assinaturaAtual ||
      !obj.resultado?.sorteio ||
      typeof obj.reveladasLinha !== 'number' ||
      typeof obj.reveladasGol !== 'number'
    ) {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}

export function salvarSessaoCerimonia(sessao: SessaoCerimonia): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    // Ignorar caso storage esteja indisponivel
  }
}

export function limparSessaoCerimonia(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Ignorar
  }
}

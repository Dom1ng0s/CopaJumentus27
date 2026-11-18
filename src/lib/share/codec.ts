// Codificacao do resultado na propria URL (CLAUDE.md §4.4).
// Payload enxuto: so o que a pagina de resultado precisa renderizar.

import type { ElencoDoTime } from '@/lib/domain/tipos';

/** Formato compacto: arrays posicionais em vez de objetos com chaves repetidas. */
interface PayloadResultado {
  v: 1;
  /** timestamp ISO */
  d: string;
  /** amplitude de estrelas */
  a: number;
  /**
   * [nomeTime, capitão | 0, [goleiroNome, estrelas] | 0, [[nome, estrelas, posicao], ...]].
   * Desde 18/11/2026 o sorteio não tem capitão (o time escolhe depois): links novos
   * trazem 0 nessa posição; links antigos ainda trazem [nome, estrelas].
   */
  t: Array<[string, [string, number] | 0, [string, number] | 0, Array<[string, number, string]>]>;
}

export const LIMITE_URL = 2000;

export function codificarResultado(elencos: readonly ElencoDoTime[], amplitude: number): string {
  const payload: PayloadResultado = {
    v: 1,
    d: new Date().toISOString().slice(0, 10),
    a: amplitude,
    t: elencos.map((e) => [
      e.time.nome,
      0,
      e.goleiro ? [e.goleiro.apelido ?? e.goleiro.nome, e.goleiro.estrelas] : 0,
      e.linha.map((j) => [j.apelido ?? j.nome, j.estrelas, j.posicao]),
    ]),
  };
  return paraBase64Url(JSON.stringify(payload));
}

export function decodificarResultado(payload: string): PayloadResultado | null {
  try {
    const json = deBase64Url(payload);
    const obj = JSON.parse(json) as PayloadResultado;
    if (obj.v !== 1 || !Array.isArray(obj.t)) return null;
    return obj;
  } catch {
    return null;
  }
}

function paraBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(payload: string): string {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const preenchido = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(preenchido);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Formata o resumo público dos elencos para WhatsApp (sem estrelas, conforme CLAUDE.md §1 e §8.4).
 */
export function formatarPayloadWhatsApp(dados: PayloadResultado, url?: string): string {
  const blocos = dados.t.map(([nomeTime, capitao, goleiro, linha]) => {
    const linhasJogadores = [
      `  • [GOL] ${goleiro !== 0 ? goleiro[0] : 'A definir'}`,
      ...(capitao !== 0 ? [`  • [CAP] ${capitao[0]}`] : []),
      ...linha.map(([nome, , pos]) => `  • [${pos}] ${nome}`),
    ];
    return `*${nomeTime.toUpperCase()}*\n${linhasJogadores.join('\n')}`;
  });

  const rodape = url ? `\n\nLink oficial: ${url}` : '';
  return `*COPA JUMENTUS — VICE CITY*\n*Os times estão definidos (${dados.d})*\n\n${blocos.join('\n\n')}${rodape}`;
}

export function formatarElencosWhatsApp(
  elencos: readonly ElencoDoTime[],
  amplitude: number,
  url?: string,
): string {
  const payload = decodificarResultado(codificarResultado(elencos, amplitude));
  if (!payload) return '';
  return formatarPayloadWhatsApp(payload, url);
}

export type { PayloadResultado };

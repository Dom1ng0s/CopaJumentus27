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
  /** [nomeTime, [capitaoNome, estrelas], [goleiroNome, estrelas] | 0, [[nome, estrelas, posicao], ...]] */
  t: Array<[string, [string, number], [string, number] | 0, Array<[string, number, string]>]>;
}

export const LIMITE_URL = 2000;

export function codificarResultado(elencos: readonly ElencoDoTime[], amplitude: number): string {
  const payload: PayloadResultado = {
    v: 1,
    d: new Date().toISOString().slice(0, 10),
    a: amplitude,
    t: elencos.map((e) => [
      e.time.nome,
      [e.capitao.apelido ?? e.capitao.nome, e.capitao.estrelas],
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

export type { PayloadResultado };

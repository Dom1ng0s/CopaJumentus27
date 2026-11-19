// Codificacao do resultado na propria URL (CLAUDE.md §4.4).
// Payload enxuto: so o que a pagina de resultado precisa renderizar.
// Sem estrelas desde 19/11/2026 (v2): o link e publico e "nao deve mostrar em
// hipotese alguma as estrelas de cada jogador". Links v1 antigos continuam abrindo,
// e as estrelas que eles carregam sao descartadas na leitura.

import type { ElencoDoTime } from '@/lib/domain/tipos';

/** v2: [nomeTime, goleiro | 0, [[nome, posicao], ...]]. */
interface PayloadV2 {
  v: 2;
  /** data ISO (aaaa-mm-dd) */
  d: string;
  t: Array<[string, string | 0, Array<[string, string]>]>;
}

/** v1 (até 18/11/2026): [nomeTime, [capitão, estrelas] | 0, [goleiro, estrelas] | 0, [[nome, estrelas, posicao], ...]]. */
interface PayloadV1 {
  v: 1;
  d: string;
  t: Array<[string, [string, number] | 0, [string, number] | 0, Array<[string, number, string]>]>;
}

/** Forma lida pela página de resultado: nunca tem estrelas. */
export interface PayloadResultado {
  d: string;
  /** [nomeTime, capitão (só links antigos) | 0, goleiro | 0, [[nome, posicao], ...]] */
  t: Array<[string, string | 0, string | 0, Array<[string, string]>]>;
}

export const LIMITE_URL = 2000;

export function codificarResultado(elencos: readonly ElencoDoTime[]): string {
  const payload: PayloadV2 = {
    v: 2,
    d: new Date().toISOString().slice(0, 10),
    t: elencos.map((e) => [
      e.time.nome,
      e.goleiro ? (e.goleiro.apelido ?? e.goleiro.nome) : 0,
      e.linha.map((j): [string, string] => [j.apelido ?? j.nome, j.posicao]),
    ]),
  };
  return paraBase64Url(JSON.stringify(payload));
}

function ehLista(x: unknown): x is unknown[] {
  return Array.isArray(x);
}

function texto(x: unknown): string | null {
  return typeof x === 'string' ? x : null;
}

/** Nome de um campo que pode ser 0, "nome" ou ["nome", estrelas]. */
function nomeOuZero(x: unknown): string | 0 {
  if (typeof x === 'string') return x;
  if (ehLista(x) && typeof x[0] === 'string') return x[0];
  return 0;
}

export function decodificarResultado(payload: string): PayloadResultado | null {
  try {
    const obj: unknown = JSON.parse(deBase64Url(payload));
    if (typeof obj !== 'object' || obj === null || !('v' in obj) || !('t' in obj) || !ehLista(obj.t)) return null;
    const d = 'd' in obj ? (texto(obj.d) ?? '') : '';
    const t: PayloadResultado['t'] = [];
    for (const time of obj.t) {
      if (!ehLista(time)) return null;
      const nomeTime = texto(time[0]);
      if (nomeTime === null) return null;
      if (obj.v === 2) {
        const linha = ehLista(time[2]) ? time[2] : [];
        t.push([nomeTime, 0, nomeOuZero(time[1]), linha.filter(ehLista).map((j) => [texto(j[0]) ?? '', texto(j[1]) ?? ''])]);
      } else if (obj.v === 1) {
        const linha = ehLista(time[3]) ? time[3] : [];
        // v1 trazia [nome, estrelas, posicao]: as estrelas ficam de fora.
        t.push([nomeTime, nomeOuZero(time[1]), nomeOuZero(time[2]), linha.filter(ehLista).map((j) => [texto(j[0]) ?? '', texto(j[2]) ?? ''])]);
      } else {
        return null;
      }
    }
    return { d, t };
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
      `  • [GOL] ${goleiro !== 0 ? goleiro : 'A definir'}`,
      ...(capitao !== 0 ? [`  • [CAP] ${capitao}`] : []),
      ...linha.map(([nome, pos]) => `  • ${pos && pos !== 'LIN' ? `[${pos}] ` : ''}${nome}`),
    ];
    return `*${nomeTime.toUpperCase()}*\n${linhasJogadores.join('\n')}`;
  });

  const rodape = url ? `\n\nLink oficial: ${url}` : '';
  return `*COPA JUMENTUS — VICE CITY*\n*Os times estão definidos (${dados.d})*\n\n${blocos.join('\n\n')}${rodape}`;
}

export function formatarElencosWhatsApp(elencos: readonly ElencoDoTime[], url?: string): string {
  const payload = decodificarResultado(codificarResultado(elencos));
  if (!payload) return '';
  return formatarPayloadWhatsApp(payload, url);
}

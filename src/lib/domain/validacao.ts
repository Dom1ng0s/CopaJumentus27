// As invariantes de CLAUDE.md §3.3 como funcoes (composicao identica, 19/11/2026).
// Toda invariante aqui tem teste. Nada e exibido ao operador sem passar por validarSorteio.

import type { Alocacao, Jogador, Time } from './tipos';

export interface Violacao {
  invariante: 1 | 2 | 3;
  mensagem: string;
}

interface EntradaValidacao {
  jogadores: readonly Jogador[];
  times: readonly Time[];
  alocacoesLinha: readonly Alocacao[];
}

/** Soma de estrelas por time: jogadores de linha. Goleiro nao conta. Todo time comeca em 0. */
export function somasDeEstrelas(
  jogadores: readonly Jogador[],
  times: readonly Time[],
  alocacoesLinha: readonly Alocacao[],
): Map<string, number> {
  const porId = new Map(jogadores.map((j) => [j.id, j]));
  const somas = new Map<string, number>();

  for (const time of times) somas.set(time.id, 0);
  for (const a of alocacoesLinha) {
    const jogador = porId.get(a.jogadorId);
    if (!jogador) continue;
    somas.set(a.timeId, (somas.get(a.timeId) ?? 0) + jogador.estrelas);
  }
  return somas;
}

export function amplitude(somas: Map<string, number>): number {
  const valores = [...somas.values()];
  if (valores.length === 0) return 0;
  return Math.max(...valores) - Math.min(...valores);
}

/** Pote de linha: todos os jogadores de linha (CLAUDE.md §3.3; sem capitão fixo). */
export function poteDeLinha(jogadores: readonly Jogador[]): Jogador[] {
  return jogadores.filter((j) => j.posicao !== 'GOL');
}

export function poteDeGoleiros(jogadores: readonly Jogador[]): Jogador[] {
  return jogadores.filter((j) => j.posicao === 'GOL');
}

export function validarSorteio({
  jogadores,
  times,
  alocacoesLinha,
}: EntradaValidacao): Violacao[] {
  const violacoes: Violacao[] = [];
  const pote = poteDeLinha(jogadores);

  // Invariante 1: todo jogador de linha alocado a exatamente um time.
  const contagem = new Map<string, number>();
  for (const a of alocacoesLinha) {
    contagem.set(a.jogadorId, (contagem.get(a.jogadorId) ?? 0) + 1);
  }
  const naoAlocados = pote.filter((j) => !contagem.has(j.id));
  const duplicados = [...contagem.entries()].filter(([, n]) => n > 1);
  if (naoAlocados.length > 0) {
    violacoes.push({
      invariante: 1,
      mensagem: `${naoAlocados.length} jogador(es) do pote ficaram sem time: ${naoAlocados
        .map((j) => j.apelido ?? j.nome)
        .join(', ')}`,
    });
  }
  if (duplicados.length > 0) {
    violacoes.push({
      invariante: 1,
      mensagem: `${duplicados.length} jogador(es) alocados em mais de um time`,
    });
  }

  // Invariante 2: elencos do mesmo tamanho.
  const tamanhos = new Map<string, number>(times.map((t) => [t.id, 0]));
  for (const a of alocacoesLinha) {
    tamanhos.set(a.timeId, (tamanhos.get(a.timeId) ?? 0) + 1);
  }
  const valoresTamanho = [...tamanhos.values()];
  const difTamanho = valoresTamanho.length ? Math.max(...valoresTamanho) - Math.min(...valoresTamanho) : 0;
  if (difTamanho > 0) {
    violacoes.push({
      invariante: 2,
      mensagem: `Elencos de tamanhos diferentes: diferenca de ${difTamanho} jogador(es)`,
    });
  }

  // Invariante 3: mesma quantidade de cada nivel em todos os times (e, por isso,
  // a mesma soma de estrelas). A mensagem nao cita jogadores.
  const porId = new Map(jogadores.map((j) => [j.id, j]));
  const niveis = [...new Set(pote.map((j) => j.estrelas))];
  const niveisDiferentes = niveis.filter((nivel) => {
    const contagens = times.map(
      (t) => alocacoesLinha.filter((a) => a.timeId === t.id && porId.get(a.jogadorId)?.estrelas === nivel).length,
    );
    return Math.max(...contagens) !== Math.min(...contagens);
  });
  const amp = amplitude(somasDeEstrelas(jogadores, times, alocacoesLinha));
  if (niveisDiferentes.length > 0 || amp !== 0) {
    violacoes.push({
      invariante: 3,
      mensagem: 'Os times nao ficaram com a mesma composicao de niveis',
    });
  }

  return violacoes;
}

// Andamento do campeonato e projeção do mata-mata, para as telas públicas.
// Puro: deriva tudo das partidas, sem gravar nada.

import { calcularClassificacao } from './classificacao';
import { ordenarPartidas } from './suspensoes';
import type { Campeonato, Partida } from './tipos';

export interface Andamento {
  total: number;
  encerrados: number;
  aoVivo: Partida[];
  /** Primeira partida agendada na ordem dos jogos. */
  proxima?: Partida;
  /** Dia (do modelo) do jogo ao vivo ou do próximo; ausente fora do modelo. */
  dia?: number;
  /** Todos os jogos encerrados. */
  terminou: boolean;
}

export function andamento(partidas: readonly Partida[]): Andamento {
  const ordem = ordenarPartidas(partidas);
  const aoVivo = ordem.filter((p) => p.status === 'ao-vivo');
  const proxima = ordem.find((p) => p.status === 'agendada');
  const encerrados = partidas.filter((p) => p.status === 'encerrada').length;
  return {
    total: partidas.length,
    encerrados,
    aoVivo,
    proxima,
    dia: (aoVivo[0] ?? proxima)?.dia,
    terminou: partidas.length > 0 && encerrados === partidas.length,
  };
}

export interface Projecao {
  mandanteId?: string;
  visitanteId?: string;
}

/**
 * "Se acabasse agora": para cada vaga do mata-mata que vem de uma posição de grupo
 * ainda não definida, a equipe que ocupa essa posição na tabela atual (só jogos
 * encerrados). Só aparece depois do primeiro jogo encerrado da fase. Vagas já
 * definidas e vagas de vencedor/perdedor não entram.
 * O campeonato precisa já ter passado por aplicarChaveamento (participantes resolvidos).
 */
export function projecaoMataMata(c: Campeonato): Map<string, Projecao> {
  const tabelas = new Map<string, string[] | null>();
  const tabelaDaFase = (faseId: string): string[] | null => {
    if (tabelas.has(faseId)) return tabelas.get(faseId)!;
    const fase = c.fases.find((f) => f.id === faseId);
    const grupos = c.grupos.filter((g) => g.faseId === faseId);
    const jogos = c.partidas.filter((p) => p.faseId === faseId && p.status === 'encerrada' && p.mandanteId && p.visitanteId);
    const ordem =
      fase && grupos.length === 1 && jogos.length > 0
        ? calcularClassificacao(grupos[0].equipeIds, jogos, c.pontuacao, c.criterios, { desempates: fase.desempates }).map((l) => l.equipeId)
        : null;
    tabelas.set(faseId, ordem);
    return ordem;
  };

  const resultado = new Map<string, Projecao>();
  for (const p of c.partidas) {
    const lado = (o: Partida['origemMandante'], definido: string | undefined) =>
      !definido && o?.tipo === 'posicao' ? tabelaDaFase(o.faseId)?.[o.posicao - 1] : undefined;
    const projecao: Projecao = {
      mandanteId: lado(p.origemMandante, p.mandanteId),
      visitanteId: lado(p.origemVisitante, p.visitanteId),
    };
    if (projecao.mandanteId || projecao.visitanteId) resultado.set(p.id, projecao);
  }
  return resultado;
}

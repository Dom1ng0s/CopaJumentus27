// Participantes das partidas com origem (modelo oficial, CLAUDE.md §8.6).
// Tudo calculado das partidas, sem gravar (como as suspensões):
// - tabela: equipe com aquele número T1–T8 (sorteado no admin);
// - posição: só com todos os jogos da fase encerrados e a posição sem empate pendente;
// - vencedor/perdedor: só com o jogo de origem encerrado; empate decide nos pênaltis.

import { calcularClassificacao, perdedor, vencedor } from './classificacao';
import type { Campeonato, Origem, Partida } from './tipos';

export interface Participantes {
  mandanteId?: string;
  visitanteId?: string;
}

/** Texto da origem para a tela: "T3", "3º do Grupo Único", "Vencedor J30". */
export function descreverOrigem(o: Origem, c: Pick<Campeonato, 'fases'>): string {
  switch (o.tipo) {
    case 'tabela':
      return `T${o.numero}`;
    case 'posicao':
      return `${o.posicao}º do ${c.fases.find((f) => f.id === o.faseId)?.nome ?? 'grupo'}`;
    case 'vencedor':
      return `Vencedor J${o.partidaNumero}`;
    case 'perdedor':
      return `Perdedor J${o.partidaNumero}`;
  }
}

function temOrigem(p: Partida): boolean {
  return !!p.origemMandante || !!p.origemVisitante;
}

/**
 * Calcula os participantes de cada partida com origem. As partidas sem origem
 * não aparecem no mapa (os participantes delas são os gravados).
 * Não altera o campeonato.
 */
export function resolverChaveamento(c: Campeonato): Map<string, Participantes> {
  const resultado = new Map<string, Participantes>();
  const porNumero = new Map<number, Partida>();
  for (const p of c.partidas) if (p.numero !== undefined) porNumero.set(p.numero, p);
  const porTabela = new Map<number, string>();
  for (const e of c.equipes) if (e.numeroTabela !== undefined) porTabela.set(e.numeroTabela, e.id);

  // Participantes efetivos (gravados ou já resolvidos) de uma partida.
  const efetiva = (p: Partida): Partida => {
    if (!temOrigem(p)) return p;
    return { ...p, ...resolver(p) };
  };

  const classificacoes = new Map<string, Map<number, string> | null>();
  const posicoesDaFase = (faseId: string): Map<number, string> | null => {
    if (classificacoes.has(faseId)) return classificacoes.get(faseId)!;
    classificacoes.set(faseId, null); // evita ciclo
    const fase = c.fases.find((f) => f.id === faseId);
    const jogos = c.partidas.filter((p) => p.faseId === faseId).map(efetiva);
    let mapa: Map<number, string> | null = null;
    if (fase && jogos.length > 0 && jogos.every((p) => p.status === 'encerrada' && p.mandanteId && p.visitanteId)) {
      const grupos = c.grupos.filter((g) => g.faseId === faseId);
      // Posição numa fase só faz sentido com um grupo (Grupo Único do modelo).
      if (grupos.length === 1) {
        const tabela = calcularClassificacao(grupos[0].equipeIds, jogos, c.pontuacao, c.criterios, { desempates: fase.desempates });
        mapa = new Map(tabela.filter((l) => !l.empatada).map((l) => [l.posicao, l.equipeId]));
      }
    }
    classificacoes.set(faseId, mapa);
    return mapa;
  };

  const emCalculo = new Set<string>();
  function deOrigem(o: Origem | undefined): string | undefined {
    if (!o) return undefined;
    switch (o.tipo) {
      case 'tabela':
        return porTabela.get(o.numero);
      case 'posicao':
        return posicoesDaFase(o.faseId)?.get(o.posicao);
      case 'vencedor':
      case 'perdedor': {
        const origem = porNumero.get(o.partidaNumero);
        if (!origem || emCalculo.has(origem.id)) return undefined;
        const p = efetiva(origem);
        return (o.tipo === 'vencedor' ? vencedor(p) : perdedor(p)) ?? undefined;
      }
    }
  }

  function resolver(p: Partida): Participantes {
    const pronto = resultado.get(p.id);
    if (pronto) return pronto;
    emCalculo.add(p.id);
    const r: Participantes = {
      mandanteId: p.origemMandante ? deOrigem(p.origemMandante) : p.mandanteId,
      visitanteId: p.origemVisitante ? deOrigem(p.origemVisitante) : p.visitanteId,
    };
    emCalculo.delete(p.id);
    resultado.set(p.id, r);
    return r;
  }

  for (const p of c.partidas) if (temOrigem(p)) resolver(p);
  return resultado;
}

/** Grava no documento (em memória) os participantes calculados das partidas com origem. */
export function aplicarChaveamento(c: Campeonato): Campeonato {
  const mapa = resolverChaveamento(c);
  for (const p of c.partidas) {
    const r = mapa.get(p.id);
    if (!r) continue;
    p.mandanteId = r.mandanteId;
    p.visitanteId = r.visitanteId;
  }
  return c;
}

/** Partida já começou ou tem súmula: os participantes dela não podem mais mudar. */
export function partidaTravada(p: Partida): boolean {
  return p.status !== 'agendada' || p.eventos.length > 0 || !!p.goleiroMandanteId || !!p.goleiroVisitanteId;
}

export function nomeDaPartida(p: Partida): string {
  const numero = p.numero !== undefined ? `Jogo ${p.numero}` : 'Uma partida';
  return p.rotulo ? `${numero} (${p.rotulo})` : numero;
}

/**
 * Trava: compara os participantes calculados antes e depois de uma mudança.
 * Retorna a mensagem de erro se alguma partida travada mudaria de participantes.
 */
export function violacaoDaTrava(antes: Campeonato, depois: Campeonato): string | null {
  const a = resolverChaveamento(antes);
  const d = resolverChaveamento(depois);
  for (const p of depois.partidas) {
    const anterior = antes.partidas.find((x) => x.id === p.id);
    if (!anterior || !partidaTravada(anterior)) continue;
    const ra = a.get(p.id);
    const rd = d.get(p.id);
    if (!ra && !rd) continue;
    if (ra?.mandanteId !== rd?.mandanteId || ra?.visitanteId !== rd?.visitanteId) {
      return `Essa mudança alteraria quem joga o ${nomeDaPartida(p)}, que já começou ou tem súmula. Desfaça a súmula desse jogo antes de corrigir.`;
    }
  }
  return null;
}

/**
 * Regras que valem depois de qualquer mudança. Retorna a primeira violação.
 * - partida iniciada precisa ter os dois participantes definidos;
 * - jogo eliminatório encerrado empatado precisa de placar de pênaltis com vencedor.
 */
export function problemaDeConsistencia(c: Campeonato): string | null {
  const mata = new Set(c.fases.filter((f) => f.tipo === 'mata-mata').map((f) => f.id));
  for (const p of c.partidas) {
    if (p.status !== 'agendada' && (!p.mandanteId || !p.visitanteId)) {
      return `O ${nomeDaPartida(p)} ainda não tem os dois participantes definidos; não pode começar.`;
    }
    if (p.status === 'encerrada' && mata.has(p.faseId) && p.golsMandante === p.golsVisitante) {
      const pm = p.penaltisMandante;
      const pv = p.penaltisVisitante;
      if (pm === undefined || pv === undefined || pm === pv) {
        return `O ${nomeDaPartida(p)} é eliminatório e terminou empatado: lance o placar dos pênaltis, com um vencedor, antes de encerrar.`;
      }
    }
  }
  return null;
}

/** Pódio: final (1º e 2º) e disputa de 3º. Só quando a final está encerrada. */
export function podio(c: Campeonato): { primeiro: string; segundo: string; terceiro?: string } | null {
  if (c.modelo !== 'copa-jumentus-8') return null;
  const final = c.partidas.find((p) => p.numero === 34);
  const terceiro = c.partidas.find((p) => p.numero === 33);
  if (!final) return null;
  const v = vencedor(final);
  const s = perdedor(final);
  if (!v || !s) return null;
  return { primeiro: v, segundo: s, terceiro: (terceiro && vencedor(terceiro)) ?? undefined };
}

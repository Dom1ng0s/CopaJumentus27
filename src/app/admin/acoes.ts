'use server';

// Todas as alterações do campeonato. Só admins: cada ação passa por exigirAdmin(),
// que confere a sessão no banco e recusa enquanto houver troca de senha pendente.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirAdmin } from '@/lib/auth/servidor';
import { cookies } from 'next/headers';
import { COOKIE_CAMPEONATO, idDoCampeonatoDoAdmin } from '@/lib/campeonato/selecao';
import { gerarRodadas, nomeGrupo, sortearGrupos } from '@/lib/domain/campeonato/grupos';
import { DIAS_DO_MODELO, sortearNumerosTabela } from '@/lib/domain/campeonato/modelo';
import { aplicarProgramacao, problemaNaProgramacao, remarcarPartida, type Programacao } from '@/lib/domain/campeonato/programacao';
import {
  ehGol,
  TIPOS_EVENTO,
  type Campeonato,
  type Criterio,
  type Partida,
  type StatusCampeonato,
  type StatusPartida,
  type TipoEvento,
  type TipoFase,
} from '@/lib/domain/campeonato/tipos';
import type { Posicao } from '@/lib/domain/tipos';
import {
  ErroCampeonato,
  aplicarModeloOficial,
  atualizarCampeonato,
  criarCampeonato,
  duplicarCampeonato,
  listarCampeonatos,
  novoId,
  slugDe,
} from '@/lib/repo/campeonato-repo';
import {
  atualizarInscricao,
  criarInscricao,
  importarCsv,
  lerEstrelas,
  lerPosicao,
  lerStatus,
  removerInscricao,
  type DadosInscricao,
} from '@/lib/repo/inscricoes-repo';

// ---------- utilitários ----------

class ErroRegra extends Error {}

/** Erros de regra de qualquer camada que devem aparecer para o admin. */
function ehErroDeRegra(e: unknown): e is Error {
  return e instanceof ErroRegra || e instanceof ErroCampeonato;
}

/** Funções do domínio lançam Error comum; aqui viram erro de regra visível. */
function noDominio(f: () => void): void {
  try {
    f();
  } catch (e) {
    throw new ErroRegra(e instanceof Error ? e.message : String(e));
  }
}

function texto(f: FormData, campo: string): string {
  const v = f.get(campo);
  return typeof v === 'string' ? v.trim() : '';
}

function inteiro(f: FormData, campo: string, padrao = 0): number {
  const n = Number(texto(f, campo).replace(',', '.'));
  return Number.isFinite(n) ? Math.trunc(n) : padrao;
}

function opcional(f: FormData, campo: string): string | undefined {
  return texto(f, campo) || undefined;
}

const POSICOES: readonly Posicao[] = ['GOL', 'ZAG', 'MEI', 'ATA'];
function posicao(f: FormData): Posicao {
  const p = texto(f, 'posicao').toUpperCase();
  return POSICOES.find((x) => x === p) ?? 'MEI';
}

/**
 * Executa a alteração no campeonato em edição; erro de regra (inclusive a trava
 * do chaveamento e as regras de consistência) volta para a página com a mensagem.
 */
/** Se `mudanca` devolve um texto, ele aparece como confirmação depois de gravar. */
async function alterar(f: FormData, mudanca: (c: Campeonato) => string | void): Promise<void> {
  await exigirAdmin();
  const volta = texto(f, 'volta') || '/admin';
  let erro: string | null = null;
  let mensagem: string | null = null;
  try {
    await atualizarCampeonato(await idDoCampeonatoDoAdmin(), (c) => {
      mensagem = mudanca(c) ?? null;
    });
  } catch (e) {
    if (ehErroDeRegra(e)) erro = e.message;
    else throw e;
  }
  revalidatePath('/', 'layout');
  const sep = volta.includes('?') ? '&' : '?';
  if (erro) redirect(`${volta}${sep}erro=${encodeURIComponent(erro)}`);
  if (mensagem) redirect(`${volta}${sep}ok=${encodeURIComponent(mensagem)}`);
}

/** Igual a `alterar`, para operações fora do documento do campeonato. */
async function executar(f: FormData, operacao: () => Promise<string | void>): Promise<void> {
  await exigirAdmin();
  const volta = texto(f, 'volta') || '/admin';
  let mensagem: string | null = null;
  let erro: string | null = null;
  try {
    mensagem = (await operacao()) ?? null;
  } catch (e) {
    if (ehErroDeRegra(e)) erro = e.message;
    else throw e;
  }
  revalidatePath('/', 'layout');
  const sep = volta.includes('?') ? '&' : '?';
  if (erro) redirect(`${volta}${sep}erro=${encodeURIComponent(erro)}`);
  // Sempre volta para a URL limpa, para não reexibir o aviso da ação anterior.
  redirect(mensagem ? `${volta}${sep}ok=${encodeURIComponent(mensagem)}` : volta);
}

function acharPartida(c: Campeonato, id: string): Partida {
  const p = c.partidas.find((x) => x.id === id);
  if (!p) throw new ErroRegra('Partida não encontrada.');
  return p;
}

// Sessão e contas: ver acoes-conta.ts.

// ---------- campeonato ----------

export async function salvarCampeonato(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const nome = texto(f, 'nome');
    if (!nome) throw new ErroRegra('O campeonato precisa de um nome.');
    c.nome = nome;
    c.edicao = opcional(f, 'edicao');
    c.slug = slugDe(texto(f, 'slug') || [nome, c.edicao].filter(Boolean).join(' '));
    const status = texto(f, 'status') as StatusCampeonato;
    if (['rascunho', 'inscricoes', 'andamento', 'encerrado'].includes(status)) c.status = status;
    c.banner = opcional(f, 'banner');
    c.escudo = opcional(f, 'escudo');
    c.subtitulo = opcional(f, 'subtitulo');
    c.inicio = opcional(f, 'inicio');
    c.fim = opcional(f, 'fim');
    c.local = opcional(f, 'local');
    c.pontuacao = {
      vitoria: inteiro(f, 'vitoria', 3),
      empate: inteiro(f, 'empate', 1),
      derrota: inteiro(f, 'derrota', 0),
    };
    c.valorInscricao = Math.max(0, Number(texto(f, 'valorInscricao').replace(',', '.')) || 0);
  });
}

export async function moverCriterio(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const criterio = texto(f, 'criterio') as Criterio;
    const i = c.criterios.indexOf(criterio);
    const j = texto(f, 'direcao') === 'cima' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= c.criterios.length) return;
    [c.criterios[i], c.criterios[j]] = [c.criterios[j], c.criterios[i]];
  });
}

// ---------- fases e grupos ----------

export async function criarFase(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const nome = texto(f, 'nome');
    if (!nome) throw new ErroRegra('Dê um nome à fase.');
    const tipo: TipoFase = texto(f, 'tipo') === 'grupos' ? 'grupos' : 'mata-mata';
    c.fases.push({ id: novoId(), nome, tipo });
  });
}

export async function editarFase(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const fase = c.fases.find((x) => x.id === texto(f, 'faseId'));
    if (!fase) throw new ErroRegra('Fase não encontrada.');
    fase.nome = texto(f, 'nome') || fase.nome;
    const tipo: TipoFase = texto(f, 'tipo') === 'grupos' ? 'grupos' : 'mata-mata';
    if (tipo !== fase.tipo && c.partidas.some((p) => p.faseId === fase.id)) {
      throw new ErroRegra('Não dá para trocar o tipo de uma fase que já tem partidas.');
    }
    fase.tipo = tipo;
    if (tipo === 'mata-mata') c.grupos = c.grupos.filter((g) => g.faseId !== fase.id);
  });
}

export async function moverFase(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const i = c.fases.findIndex((x) => x.id === texto(f, 'faseId'));
    const j = texto(f, 'direcao') === 'cima' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= c.fases.length) return;
    [c.fases[i], c.fases[j]] = [c.fases[j], c.fases[i]];
  });
}

export async function excluirFase(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const id = texto(f, 'faseId');
    if (c.partidas.some((p) => p.faseId === id)) {
      throw new ErroRegra('Exclua as partidas desta fase antes de excluí-la.');
    }
    c.fases = c.fases.filter((x) => x.id !== id);
    c.grupos = c.grupos.filter((g) => g.faseId !== id);
  });
}

/** No modelo oficial, grupo e jogos vêm prontos (T1–T8): nada de refazer grupos. */
function exigirFormatoLivre(c: Campeonato): void {
  if (c.modelo === 'copa-jumentus-8') throw new ErroRegra('No modelo oficial o Grupo Único e os 34 jogos já vêm prontos; use o sorteio de T1 a T8 em Partidas.');
}

function exigirFaseSemJogos(c: Campeonato, faseId: string): void {
  exigirFormatoLivre(c);
  if (c.partidas.some((p) => p.faseId === faseId && p.grupoId)) {
    throw new ErroRegra('Esta fase já tem jogos de grupo. Exclua-os antes de refazer os grupos.');
  }
}

/** Sorteio aleatório das equipes nos grupos. */
export async function sortearGruposDaFase(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const faseId = texto(f, 'faseId');
    exigirFaseSemJogos(c, faseId);
    const quantidade = Math.max(1, Math.min(c.equipes.length, inteiro(f, 'quantidade', 2)));
    const sorteados = sortearGrupos(c.equipes.map((e) => e.id), quantidade);
    c.grupos = [
      ...c.grupos.filter((g) => g.faseId !== faseId),
      ...sorteados.map((equipeIds, i) => ({ id: novoId(), faseId, nome: nomeGrupo(i), equipeIds })),
    ];
  });
}

/** Definição manual: um select por equipe com o índice do grupo. */
export async function definirGruposManual(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const faseId = texto(f, 'faseId');
    exigirFaseSemJogos(c, faseId);
    const quantidade = Math.max(1, Math.min(c.equipes.length, inteiro(f, 'quantidade', 2)));
    const grupos = Array.from({ length: quantidade }, (_, i) => ({
      id: novoId(),
      faseId,
      nome: nomeGrupo(i),
      equipeIds: [] as string[],
    }));
    for (const e of c.equipes) {
      const i = inteiro(f, `grupo_${e.id}`, -1);
      if (i >= 0 && i < quantidade) grupos[i].equipeIds.push(e.id);
    }
    c.grupos = [...c.grupos.filter((g) => g.faseId !== faseId), ...grupos];
  });
}

/** Cria os jogos de todos contra todos que ainda não existem em cada grupo da fase. */
export async function gerarJogosDosGrupos(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    exigirFormatoLivre(c);
    const faseId = texto(f, 'faseId');
    const grupos = c.grupos.filter((g) => g.faseId === faseId);
    if (grupos.length === 0) throw new ErroRegra('Defina os grupos antes de gerar os jogos.');
    for (const g of grupos) {
      const existentes = new Set(
        c.partidas
          .filter((p) => p.grupoId === g.id)
          .map((p) => [p.mandanteId, p.visitanteId].sort().join('|')),
      );
      gerarRodadas(g.equipeIds).forEach((rodada, r) => {
        for (const [m, v] of rodada) {
          if (existentes.has([m, v].sort().join('|'))) continue;
          c.partidas.push({
            id: novoId(),
            faseId,
            grupoId: g.id,
            rotulo: `${g.nome} · Rodada ${r + 1}`,
            mandanteId: m,
            visitanteId: v,
            status: 'agendada',
            golsMandante: 0,
            golsVisitante: 0,
            eventos: [],
          });
        }
      });
    }
  });
}

// ---------- partidas ----------

export async function criarPartida(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const faseId = texto(f, 'faseId');
    const mandanteId = texto(f, 'mandanteId');
    const visitanteId = texto(f, 'visitanteId');
    if (!c.fases.some((x) => x.id === faseId)) throw new ErroRegra('Escolha a fase.');
    if (!mandanteId || !visitanteId || mandanteId === visitanteId) {
      throw new ErroRegra('Escolha duas equipes diferentes.');
    }
    const grupo = c.grupos.find((g) => g.faseId === faseId && g.equipeIds.includes(mandanteId) && g.equipeIds.includes(visitanteId));
    c.partidas.push({
      id: novoId(),
      faseId,
      grupoId: grupo?.id,
      rotulo: opcional(f, 'rotulo'),
      mandanteId,
      visitanteId,
      dataHora: opcional(f, 'dataHora'),
      local: opcional(f, 'local'),
      status: 'agendada',
      golsMandante: 0,
      golsVisitante: 0,
      eventos: [],
    });
  });
}

export async function editarPartida(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    p.rotulo = opcional(f, 'rotulo');
    let empurrados = 0;
    noDominio(() => (empurrados = remarcarPartida(c.partidas, p.id, opcional(f, 'dataHora'), texto(f, 'empurrar') === '1')));
    p.local = opcional(f, 'local');
    p.campo = opcional(f, 'campo');
    const m = opcional(f, 'mandanteId');
    const v = opcional(f, 'visitanteId');
    if (m && v && !p.origemMandante && !p.origemVisitante) {
      if (m === v) throw new ErroRegra('Escolha duas equipes diferentes.');
      if ((m !== p.mandanteId || v !== p.visitanteId) && p.eventos.length > 0) {
        throw new ErroRegra('A súmula já tem eventos; não dá para trocar as equipes.');
      }
      p.mandanteId = m;
      p.visitanteId = v;
    }
    if (empurrados) return `Partida salva e ${empurrados} jogo${empurrados > 1 ? 's seguintes andaram' : ' seguinte andou'} junto.`;
  });
}

export async function excluirPartida(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const id = texto(f, 'partidaId');
    const p = c.partidas.find((x) => x.id === id);
    if (p && p.numero !== undefined && c.modelo === 'copa-jumentus-8') {
      throw new ErroRegra('Os 34 jogos do modelo oficial não podem ser excluídos.');
    }
    c.partidas = c.partidas.filter((p) => p.id !== id);
  });
}

export async function definirStatus(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const s = texto(f, 'status') as StatusPartida;
    if (s === 'agendada' || s === 'ao-vivo' || s === 'encerrada') p.status = s;
  });
}

export async function ajustarPlacar(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const delta = inteiro(f, 'delta');
    const penaltis = texto(f, 'penaltis') === '1';
    if (texto(f, 'lado') === 'mandante') {
      if (penaltis) p.penaltisMandante = Math.max(0, (p.penaltisMandante ?? 0) + delta);
      else p.golsMandante = Math.max(0, p.golsMandante + delta);
    } else if (penaltis) p.penaltisVisitante = Math.max(0, (p.penaltisVisitante ?? 0) + delta);
    else p.golsVisitante = Math.max(0, p.golsVisitante + delta);
  });
}

/** Lado do placar que um evento de gol altera. */
function ladoDoGol(p: Partida, tipo: TipoEvento, equipeId: string): 'mandante' | 'visitante' | null {
  if (!ehGol(tipo)) return null;
  const doMandante = equipeId === p.mandanteId;
  const marcaMandante = tipo === 'gol-contra' ? !doMandante : doMandante;
  return marcaMandante ? 'mandante' : 'visitante';
}

export async function adicionarEvento(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const tipo = texto(f, 'tipo') as TipoEvento;
    if (!TIPOS_EVENTO.includes(tipo)) throw new ErroRegra('Tipo de evento inválido.');
    if (!p.mandanteId || !p.visitanteId) throw new ErroRegra('Esta partida ainda não tem os dois participantes definidos.');
    const jogador = c.jogadores.find((j) => j.id === texto(f, 'jogadorId'));
    if (!jogador) throw new ErroRegra('Escolha o jogador.');
    if (jogador.equipeId !== p.mandanteId && jogador.equipeId !== p.visitanteId) {
      throw new ErroRegra('Esse jogador não é de nenhuma das duas equipes.');
    }
    if (tipo === 'defesa') {
      const goleiro = jogador.equipeId === p.mandanteId ? p.goleiroMandanteId : p.goleiroVisitanteId;
      if (goleiro && goleiro !== jogador.id) throw new ErroRegra('Defesa é do goleiro registrado nesta partida.');
    }
    const assistente = c.jogadores.find((j) => j.id === texto(f, 'assistenciaId'));
    const minuto = inteiro(f, 'minuto', 0);
    p.eventos.push({
      id: novoId(),
      tipo,
      jogadorId: jogador.id,
      equipeId: jogador.equipeId,
      assistenciaId: tipo === 'gol' && assistente && assistente.id !== jogador.id ? assistente.id : undefined,
      minuto: minuto > 0 ? minuto : undefined,
    });
    const lado = ladoDoGol(p, tipo, jogador.equipeId);
    if (lado === 'mandante') p.golsMandante += 1;
    if (lado === 'visitante') p.golsVisitante += 1;
    if (p.status === 'agendada') p.status = 'ao-vivo';
  });
}

export async function removerEvento(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const ev = p.eventos.find((e) => e.id === texto(f, 'eventoId'));
    if (!ev) return;
    p.eventos = p.eventos.filter((e) => e.id !== ev.id);
    const lado = ladoDoGol(p, ev.tipo, ev.equipeId);
    if (lado === 'mandante') p.golsMandante = Math.max(0, p.golsMandante - 1);
    if (lado === 'visitante') p.golsVisitante = Math.max(0, p.golsVisitante - 1);
  });
}

// ---------- equipes, jogadores e pagamentos ----------

export async function editarEquipe(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const e = c.equipes.find((x) => x.id === texto(f, 'equipeId'));
    if (!e) throw new ErroRegra('Equipe não encontrada.');
    e.nome = texto(f, 'nome') || e.nome;
    e.sigla = (texto(f, 'sigla') || e.sigla).toUpperCase().slice(0, 4);
    const capitao = texto(f, 'capitaoId');
    e.capitaoId = capitao && c.jogadores.some((j) => j.id === capitao && j.equipeId === e.id) ? capitao : undefined;
  });
}

export async function adicionarJogador(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const nome = texto(f, 'nome');
    const equipeId = texto(f, 'equipeId');
    if (!nome) throw new ErroRegra('Informe o nome do jogador.');
    if (!c.equipes.some((e) => e.id === equipeId)) throw new ErroRegra('Escolha a equipe.');
    const numero = inteiro(f, 'numero', 0);
    c.jogadores.push({ id: novoId(), nome, equipeId, posicao: posicao(f), numero: numero > 0 ? numero : undefined, pago: false });
  });
}

/** Edita nome, número, posição e equipe (transferência). */
export async function editarJogador(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const j = c.jogadores.find((x) => x.id === texto(f, 'jogadorId'));
    if (!j) throw new ErroRegra('Jogador não encontrado.');
    j.nome = texto(f, 'nome') || j.nome;
    j.posicao = posicao(f);
    const numero = inteiro(f, 'numero', 0);
    j.numero = numero > 0 ? numero : undefined;
    const equipeId = texto(f, 'equipeId');
    if (equipeId && equipeId !== j.equipeId && c.equipes.some((e) => e.id === equipeId)) {
      for (const e of c.equipes) if (e.capitaoId === j.id) e.capitaoId = undefined;
      j.equipeId = equipeId;
    }
  });
}

export async function removerJogador(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const id = texto(f, 'jogadorId');
    const usado = c.partidas.some(
      (p) => p.goleiroMandanteId === id || p.goleiroVisitanteId === id || p.eventos.some((e) => e.jogadorId === id || e.assistenciaId === id),
    );
    if (usado) throw new ErroRegra('Esse jogador já aparece em súmulas; transfira em vez de remover.');
    c.jogadores = c.jogadores.filter((j) => j.id !== id);
    for (const e of c.equipes) if (e.capitaoId === id) e.capitaoId = undefined;
  });
}

export async function alternarPagamento(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const j = c.jogadores.find((x) => x.id === texto(f, 'jogadorId'));
    if (j) j.pago = !j.pago;
  });
}

// ---------- integração com o sorteio ----------

export interface ElencoParaOficializar {
  time: string;
  capitao: { nome: string; posicao: Posicao };
  goleiro: { nome: string } | null;
  linha: Array<{ nome: string; posicao: Posicao }>;
}

/**
 * Transforma o resultado da cerimônia em elencos do campeonato.
 * Mantém o status de pagamento de quem já estava cadastrado (pelo nome).
 */
export async function oficializarSorteio(elencos: ElencoParaOficializar[]): Promise<{ ok: boolean; erro?: string }> {
  await exigirAdmin();
  try {
    await atualizarCampeonato(await idDoCampeonatoDoAdmin(), (c) => {
      if (c.partidas.some((p) => p.eventos.length > 0)) {
        throw new ErroRegra('O campeonato já tem súmulas preenchidas; o sorteio não pode mais ser oficializado.');
      }
      const chave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
      const pagos = new Set(c.jogadores.filter((j) => j.pago).map((j) => chave(j.nome)));
      const jogadores: Campeonato['jogadores'] = [];

      for (const el of elencos) {
        const equipe = c.equipes.find((e) => chave(e.nome) === chave(el.time));
        if (!equipe) throw new ErroRegra(`Equipe "${el.time}" não existe no campeonato.`);
        const novo = (nome: string, pos: Posicao) => {
          const j = { id: novoId(), nome, equipeId: equipe.id, posicao: pos, pago: pagos.has(chave(nome)) };
          jogadores.push(j);
          return j;
        };
        equipe.capitaoId = novo(el.capitao.nome, el.capitao.posicao).id;
        if (el.goleiro) novo(el.goleiro.nome, 'GOL');
        for (const j of el.linha) novo(j.nome, j.posicao);
      }
      c.jogadores = jogadores;
      c.sorteioOficializadoEm = new Date().toISOString();
    });
  } catch (e) {
    if (ehErroDeRegra(e)) return { ok: false, erro: e.message };
    throw e;
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------- inscrições do sorteio ----------

function dadosInscricao(f: FormData): DadosInscricao {
  const nome = texto(f, 'nome');
  if (!nome) throw new ErroRegra('Informe o nome.');
  return {
    nome,
    apelido: opcional(f, 'apelido') ?? null,
    posicao: lerPosicao(texto(f, 'posicao')),
    estrelas: lerEstrelas(texto(f, 'estrelas')),
    capitaoDe: opcional(f, 'capitaoDe') ?? null,
    status: lerStatus(texto(f, 'status') === 'espera' ? 'espera' : 'confirmado'),
  };
}

export async function criarInscricaoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await criarInscricao(await idDoCampeonatoDoAdmin(), dadosInscricao(f));
  });
}

export async function editarInscricaoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await atualizarInscricao(await idDoCampeonatoDoAdmin(), texto(f, 'inscricaoId'), dadosInscricao(f));
  });
}

export async function removerInscricaoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await removerInscricao(await idDoCampeonatoDoAdmin(), texto(f, 'inscricaoId'));
  });
}

/** Importa o CSV baixado da planilha (Arquivo › Fazer download › CSV na aba INSCRITOS). */
export async function importarInscricoesAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    const arquivo = f.get('arquivo');
    if (!(arquivo instanceof File) || arquivo.size === 0) throw new ErroRegra('Escolha o arquivo CSV.');
    if (arquivo.size > 1_000_000) throw new ErroRegra('Arquivo grande demais para uma lista de inscritos.');
    const r = await importarCsv(await idDoCampeonatoDoAdmin(), await arquivo.text());
    if (r.erro) throw new ErroRegra(r.erro);
    return `${r.importadas} importada(s)${r.puladas ? `, ${r.puladas} já estavam cadastradas` : ''}.`;
  });
}

// ---------- súmula: goleiros ----------

/** Goleiro de cada lado da partida (vale para o ranking de goleiros). */
export async function definirGoleiro(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const lado = texto(f, 'lado') === 'visitante' ? 'visitante' : 'mandante';
    const equipeId = lado === 'mandante' ? p.mandanteId : p.visitanteId;
    if (!equipeId) throw new ErroRegra('Esta partida ainda não tem os dois participantes definidos.');
    const id = texto(f, 'jogadorId');
    if (id && !c.jogadores.some((j) => j.id === id && j.equipeId === equipeId)) throw new ErroRegra('Esse jogador não é desta equipe.');
    if (lado === 'mandante') p.goleiroMandanteId = id || undefined;
    else p.goleiroVisitanteId = id || undefined;
  });
}

// ---------- vários campeonatos e modelo oficial ----------

/** Escolhe o campeonato em edição deste admin (cookie do navegador). */
export async function selecionarCampeonato(f: FormData): Promise<void> {
  await exigirAdmin();
  const id = inteiro(f, 'campeonatoId', -1);
  if (!(await listarCampeonatos()).some((c) => c.id === id)) redirect('/admin/campeonatos?erro=Campeonato%20n%C3%A3o%20encontrado.');
  (await cookies()).set(COOKIE_CAMPEONATO, String(id), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
  redirect(texto(f, 'volta') === '/admin/campeonatos' ? '/admin/campeonatos' : '/admin');
}

export async function criarCampeonatoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    const modelo = texto(f, 'modelo') === 'livre' ? 'livre' : 'copa-jumentus-8';
    const id = await criarCampeonato({ nome: texto(f, 'nome'), edicao: opcional(f, 'edicao'), modelo, inicio: opcional(f, 'inicio'), fim: opcional(f, 'fim'), local: opcional(f, 'local') });
    (await cookies()).set(COOKIE_CAMPEONATO, String(id), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
    return modelo === 'livre' ? 'Campeonato criado e selecionado.' : 'Campeonato criado com os 34 jogos do modelo oficial e selecionado.';
  });
}

export async function duplicarCampeonatoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await duplicarCampeonato(inteiro(f, 'origemId', -1), { nome: texto(f, 'nome'), edicao: opcional(f, 'edicao'), comElencos: texto(f, 'comElencos') === '1' });
    return 'Campeonato duplicado, em rascunho.';
  });
}

/** Aplica o modelo oficial ao campeonato em edição (só sem partidas). */
export async function aplicarModeloAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await aplicarModeloOficial(await idDoCampeonatoDoAdmin());
    return 'Modelo oficial aplicado: Grupo Único com 28 jogos e mata-mata com 6.';
  });
}

/** Sorteio de T1 a T8 (random.ts), depois de oficializar os elencos. */
/** Programação do modelo: início de cada dia, duração e intervalo; grava e gera os horários. */
export async function programarJogosAcao(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const programacao: Programacao = {
      dias: Array.from({ length: DIAS_DO_MODELO }, (_, i) => ({ data: texto(f, `data${i + 1}`), inicio: texto(f, `inicio${i + 1}`) })),
      duracaoMin: inteiro(f, 'duracaoMin', -1),
      intervaloMin: inteiro(f, 'intervaloMin', -1),
    };
    const problema = problemaNaProgramacao(programacao, DIAS_DO_MODELO);
    if (problema) throw new ErroRegra(problema);
    const fixos = c.partidas.filter((p) => p.dia !== undefined && p.status !== 'agendada' && p.dataHora).length;
    noDominio(() => aplicarProgramacao(c.partidas, programacao));
    c.programacao = programacao;
    return fixos
      ? `Horários gerados. ${fixos} jogo${fixos > 1 ? 's' : ''} já começado${fixos > 1 ? 's mantiveram' : ' manteve'} o horário.`
      : 'Horários gerados para todos os jogos.';
  });
}

/** Remarca uma partida pela tela da súmula; com "empurrar", os seguintes do dia andam junto. */
export async function remarcarPartidaAcao(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const nova = opcional(f, 'dataHora');
    if (!nova) throw new ErroRegra('Informe a data e a hora.');
    let empurrados = 0;
    noDominio(() => (empurrados = remarcarPartida(c.partidas, p.id, nova, texto(f, 'empurrar') === '1')));
    return empurrados ? `Jogo remarcado e ${empurrados} jogo${empurrados > 1 ? 's seguintes andaram' : ' seguinte andou'} junto.` : 'Jogo remarcado.';
  });
}

export async function sortearTabelaAcao(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    if (!c.sorteioOficializadoEm) throw new ErroRegra('Oficialize os elencos (fim da cerimônia) antes de sortear T1 a T8.');
    noDominio(() => sortearNumerosTabela(c));
  });
}

/** Decisão manual de um empate total na classificação: a ordem vem do formulário. */
export async function decidirDesempate(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const fase = c.fases.find((x) => x.id === texto(f, 'faseId'));
    if (!fase) throw new ErroRegra('Fase não encontrada.');
    const empatadas = texto(f, 'equipes').split(',').filter(Boolean);
    const ordem = [...empatadas].sort((a, b) => inteiro(f, `ordem_${a}`, 99) - inteiro(f, `ordem_${b}`, 99));
    if (new Set(empatadas.map((id) => inteiro(f, `ordem_${id}`, 0))).size !== empatadas.length) {
      throw new ErroRegra('Dê uma posição diferente para cada equipe empatada.');
    }
    const mesmas = (d: string[]) => d.length === ordem.length && d.every((id) => ordem.includes(id));
    fase.desempates = [...(fase.desempates ?? []).filter((d) => !mesmas(d)), ordem];
  });
}

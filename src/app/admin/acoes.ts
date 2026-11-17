'use server';

// Todas as alterações do campeonato. Só admins: cada ação confere o cookie.

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_ADMIN, tokenDaSenha, tokenValido } from '@/lib/auth';
import { gerarRodadas, nomeGrupo, sortearGrupos } from '@/lib/domain/campeonato/grupos';
import type { Campeonato, Criterio, Partida, StatusPartida, TipoEvento, TipoFase } from '@/lib/domain/campeonato/tipos';
import type { Posicao } from '@/lib/domain/tipos';
import { atualizarCampeonato, novoId } from '@/lib/repo/campeonato-repo';
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

async function exigirAdmin(): Promise<void> {
  const loja = await cookies();
  if (!(await tokenValido(loja.get(COOKIE_ADMIN)?.value))) redirect('/admin/entrar');
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

/** Executa a alteração; erro de regra volta para a página com a mensagem. */
async function alterar(f: FormData, mudanca: (c: Campeonato) => void): Promise<void> {
  await exigirAdmin();
  const volta = texto(f, 'volta') || '/admin';
  let erro: string | null = null;
  try {
    await atualizarCampeonato(mudanca);
  } catch (e) {
    if (e instanceof ErroRegra) erro = e.message;
    else throw e;
  }
  revalidatePath('/', 'layout');
  if (erro) redirect(`${volta}${volta.includes('?') ? '&' : '?'}erro=${encodeURIComponent(erro)}`);
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
    if (e instanceof ErroRegra) erro = e.message;
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

// ---------- sessão ----------

export async function entrar(f: FormData): Promise<void> {
  const senha = process.env.ADMIN_SENHA;
  const volta = texto(f, 'volta') || '/admin';
  if (!senha) redirect('/admin/entrar?erro=' + encodeURIComponent('Defina ADMIN_SENHA no .env.local do servidor.'));
  if (texto(f, 'senha') !== senha) redirect(`/admin/entrar?erro=${encodeURIComponent('Senha incorreta.')}&volta=${encodeURIComponent(volta)}`);
  const loja = await cookies();
  loja.set(COOKIE_ADMIN, await tokenDaSenha(senha), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(volta.startsWith('/') ? volta : '/admin');
}

export async function sair(): Promise<void> {
  const loja = await cookies();
  loja.delete(COOKIE_ADMIN);
  redirect('/');
}

// ---------- campeonato ----------

export async function salvarCampeonato(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const nome = texto(f, 'nome');
    if (!nome) throw new ErroRegra('O campeonato precisa de um nome.');
    c.nome = nome;
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

function exigirFaseSemJogos(c: Campeonato, faseId: string): void {
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
    p.dataHora = opcional(f, 'dataHora');
    p.local = opcional(f, 'local');
    const m = opcional(f, 'mandanteId');
    const v = opcional(f, 'visitanteId');
    if (m && v) {
      if (m === v) throw new ErroRegra('Escolha duas equipes diferentes.');
      if ((m !== p.mandanteId || v !== p.visitanteId) && p.eventos.length > 0) {
        throw new ErroRegra('A súmula já tem eventos; não dá para trocar as equipes.');
      }
      p.mandanteId = m;
      p.visitanteId = v;
    }
  });
}

export async function excluirPartida(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const id = texto(f, 'partidaId');
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
  if (tipo !== 'gol' && tipo !== 'gol-contra') return null;
  const doMandante = equipeId === p.mandanteId;
  const marcaMandante = tipo === 'gol' ? doMandante : !doMandante;
  return marcaMandante ? 'mandante' : 'visitante';
}

export async function adicionarEvento(f: FormData): Promise<void> {
  await alterar(f, (c) => {
    const p = acharPartida(c, texto(f, 'partidaId'));
    const tipo = texto(f, 'tipo') as TipoEvento;
    if (!['gol', 'gol-contra', 'amarelo', 'vermelho'].includes(tipo)) throw new ErroRegra('Tipo de evento inválido.');
    const jogador = c.jogadores.find((j) => j.id === texto(f, 'jogadorId'));
    if (!jogador) throw new ErroRegra('Escolha o jogador.');
    if (jogador.equipeId !== p.mandanteId && jogador.equipeId !== p.visitanteId) {
      throw new ErroRegra('Esse jogador não é de nenhuma das duas equipes.');
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
    const usado = c.partidas.some((p) => p.eventos.some((e) => e.jogadorId === id || e.assistenciaId === id));
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
    await atualizarCampeonato((c) => {
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
    if (e instanceof ErroRegra) return { ok: false, erro: e.message };
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
    await criarInscricao(dadosInscricao(f));
  });
}

export async function editarInscricaoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await atualizarInscricao(texto(f, 'inscricaoId'), dadosInscricao(f));
  });
}

export async function removerInscricaoAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    await removerInscricao(texto(f, 'inscricaoId'));
  });
}

/** Importa o CSV baixado da planilha (Arquivo › Fazer download › CSV na aba INSCRITOS). */
export async function importarInscricoesAcao(f: FormData): Promise<void> {
  await executar(f, async () => {
    const arquivo = f.get('arquivo');
    if (!(arquivo instanceof File) || arquivo.size === 0) throw new ErroRegra('Escolha o arquivo CSV.');
    if (arquivo.size > 1_000_000) throw new ErroRegra('Arquivo grande demais para uma lista de inscritos.');
    const r = await importarCsv(await arquivo.text());
    if (r.erro) throw new ErroRegra(r.erro);
    return `${r.importadas} importada(s)${r.puladas ? `, ${r.puladas} já estavam cadastradas` : ''}.`;
  });
}

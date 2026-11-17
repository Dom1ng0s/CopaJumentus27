// Persistência do campeonato: um documento JSON em dados/campeonato.json (CLAUDE.md §4.2).
// Só roda no servidor. Para hospedar onde o disco não persiste, troque a implementação
// de carregarCampeonato/atualizarCampeonato por um banco, sem mexer nas telas.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CRITERIOS_PADRAO, type Campeonato } from '@/lib/domain/campeonato/tipos';
import { escudoDe, MARCAS } from '@/lib/campeonato/marcas';

export const ARQUIVO_CAMPEONATO = path.join(process.cwd(), 'dados', 'campeonato.json');

export function campeonatoPadrao(): Campeonato {
  return {
    versao: 1,
    nome: 'Copa Jumentus 2027',
    subtitulo: 'Edição MLS',
    inicio: '2027-01-16',
    fim: '2027-01-17',
    pontuacao: { vitoria: 3, empate: 1, derrota: 0 },
    criterios: [...CRITERIOS_PADRAO],
    valorInscricao: 0,
    equipes: MARCAS.map((m) => ({
      id: m.slug,
      nome: m.nome,
      sigla: m.sigla,
      escudo: escudoDe(m.slug),
      corPrimaria: m.corPrimaria,
      corSecundaria: m.corSecundaria,
      corTexto: m.corTexto,
    })),
    jogadores: [],
    fases: [
      { id: 'grupos', nome: 'Fase de grupos', tipo: 'grupos' },
      { id: 'mata-mata', nome: 'Mata-mata', tipo: 'mata-mata' },
    ],
    grupos: [],
    partidas: [],
  };
}

export async function carregarCampeonato(): Promise<Campeonato> {
  try {
    const texto = await readFile(ARQUIVO_CAMPEONATO, 'utf8');
    return JSON.parse(texto) as Campeonato;
  } catch {
    return campeonatoPadrao();
  }
}

async function salvar(c: Campeonato): Promise<void> {
  await mkdir(path.dirname(ARQUIVO_CAMPEONATO), { recursive: true });
  const temporario = `${ARQUIVO_CAMPEONATO}.${process.pid}.tmp`;
  await writeFile(temporario, JSON.stringify(c, null, 2), 'utf8');
  await rename(temporario, ARQUIVO_CAMPEONATO);
}

// Fila de escrita: duas ações ao mesmo tempo não se sobrescrevem.
let fila: Promise<unknown> = Promise.resolve();

/** Lê, aplica a alteração e grava, uma de cada vez. */
export function atualizarCampeonato(alterar: (c: Campeonato) => void): Promise<Campeonato> {
  const tarefa = fila.then(async () => {
    const c = await carregarCampeonato();
    alterar(c);
    await salvar(c);
    return c;
  });
  fila = tarefa.catch(() => undefined);
  return tarefa;
}

export function novoId(): string {
  return crypto.randomUUID().slice(0, 8);
}

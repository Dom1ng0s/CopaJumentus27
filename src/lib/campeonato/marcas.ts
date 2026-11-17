// Cores e escudos das 8 equipes, do manual de marca (docs/marca/manual-de-marca.md).

export interface MarcaEquipe {
  nome: string;
  slug: string;
  sigla: string;
  corPrimaria: string;
  corSecundaria: string;
  corTexto: string;
}

export const MARCAS: readonly MarcaEquipe[] = [
  { nome: 'Inter Miami', slug: 'inter-miami', sigla: 'MIA', corPrimaria: '#EE7FA6', corSecundaria: '#231F20', corTexto: '#231F20' },
  { nome: 'LA Galaxy', slug: 'la-galaxy', sigla: 'LAG', corPrimaria: '#00245D', corSecundaria: '#FFD200', corTexto: '#FFFFFF' },
  { nome: 'LAFC', slug: 'lafc', sigla: 'LAFC', corPrimaria: '#000000', corSecundaria: '#C39E6D', corTexto: '#FFFFFF' },
  { nome: 'Seattle Sounders', slug: 'seattle-sounders', sigla: 'SEA', corPrimaria: '#5CD27F', corSecundaria: '#2A57C6', corTexto: '#0B1F3F' },
  { nome: 'Atlanta United', slug: 'atlanta-united', sigla: 'ATL', corPrimaria: '#C22B3A', corSecundaria: '#221F1F', corTexto: '#FFFFFF' },
  { nome: 'New York City FC', slug: 'new-york-city-fc', sigla: 'NYC', corPrimaria: '#212E4B', corSecundaria: '#40527D', corTexto: '#FFFFFF' },
  { nome: 'Houston Dynamo', slug: 'houston-dynamo', sigla: 'HOU', corPrimaria: '#FF6B00', corSecundaria: '#101820', corTexto: '#101820' },
  { nome: 'Orlando City', slug: 'orlando-city', sigla: 'ORL', corPrimaria: '#633492', corSecundaria: '#FDE192', corTexto: '#FFFFFF' },
];

/** Compara nomes ignorando acento, caixa e espaços ("LA FC" == "LAFC"). */
function chave(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function marcaPorNome(nome: string): MarcaEquipe | undefined {
  const k = chave(nome);
  return MARCAS.find((m) => chave(m.nome) === k);
}

export function escudoDe(slug: string): string {
  return `/imagens/escudos/${slug}.webp`;
}

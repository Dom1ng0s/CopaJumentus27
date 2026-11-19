// Fluxo completo do admin, em ordem, no banco descartável (dados/e2e-pglite):
// primeiro acesso com troca de senha → campeonato no modelo oficial → inscrições
// com as cotas fechadas → pote sem estrelas → cerimônia → oficializar → T1 a T8 →
// súmula com gol e assistência → tabela e rankings públicos → financeiro → artes → sair.
// Nunca roda contra produção (playwright.config.ts só inclui este projeto localmente).

import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const USUARIO = 'e2e';
const SENHA_INICIAL = process.env.E2E_SENHA_INICIAL ?? 'senha-inicial-e2e';
const SENHA_NOVA = 'senha-nova-do-e2e-2027';
const CSV = path.join(__dirname, 'inscritos-e2e.csv');

test.describe.configure({ mode: 'serial' });

let page: Page;
/** Quem marcou o gol na súmula, para conferir nos rankings. */
let artilheiro = '';

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  page.on('dialog', (d) => void d.accept());
});

test.afterAll(async () => {
  await page.close();
});

async function irPara(caminho: string) {
  await page.goto(caminho);
  await expect(page.locator('body')).not.toContainText('Falta técnica');
}

/** Toast de confirmação das ações do admin. */
async function confirmado(texto: string | RegExp) {
  await expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible();
}

test('primeiro acesso: login e troca obrigatória de senha', async () => {
  await irPara('/admin/entrar');
  await page.fill('input[name=usuario]', USUARIO.toUpperCase()); // usuário sem diferenciar maiúsculas
  await page.fill('input[name=senha]', SENHA_INICIAL);
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Pop-up que não fecha até trocar a senha.
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeVisible();

  await dialogo.locator('input[name=nova]').fill(SENHA_NOVA);
  await dialogo.locator('input[name=confirmacao]').fill(SENHA_NOVA);
  await dialogo.getByRole('button', { name: /Salvar nova senha/ }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByRole('link', { name: 'Painel' })).toBeVisible();
});

test('cria o campeonato no modelo oficial e coloca em andamento', async () => {
  await irPara('/admin/campeonatos');
  const form = page.locator('form', { has: page.locator('input[name=inicio]') });
  await form.locator('input[name=nome]').fill('Copa E2E');
  await form.locator('input[name=edicao]').fill('2099');
  await form.locator('input[name=inicio]').fill('2099-01-16');
  await form.locator('input[name=fim]').fill('2099-01-17');
  await form.locator('input[name=modelo][value="copa-jumentus-8"]').check();
  await form.locator('button[type=submit]').click();
  await confirmado(/34 jogos/);

  await irPara('/admin/campeonato');
  await page.locator('select[name=status]').selectOption('andamento');
  await page.getByRole('button', { name: 'Salvar' }).first().click();
  await expect(page.locator('select[name=status]')).toHaveValue('andamento');
});

test('importa as inscrições e as cotas de estrelas fecham', async () => {
  await irPara('/admin/inscricoes');
  await page.setInputFiles('input[name=arquivo]', CSV);
  await page.locator('form', { has: page.locator('input[name=arquivo]') }).locator('button[type=submit]').click();
  await expect(page.getByText('Cotas de estrelas · fechadas')).toBeVisible();
  await expect(page.locator('main')).toContainText('16/16');
});

test('pote do sorteio sem estrelas, com 56 de linha e 8 goleiros', async () => {
  await irPara('/sorteio');
  const corpo = page.locator('body');
  await expect(corpo).toContainText('56 jogadores de linha e 8 goleiros');
  await expect(corpo).not.toContainText('★');
  // Nem nos dados da página.
  expect(await page.content()).not.toMatch(/"estrelas"/);
});

test('cerimônia: sorteia, revela todos e oficializa no campeonato', async () => {
  await irPara('/cerimonia');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Sortear agora' }).click();
  await expect(page.locator('body')).not.toContainText('★');

  // Primeiro goleiro, com os dois botões: nome e depois time.
  await page.getByRole('button', { name: /Sortear goleiro/ }).click();
  await page.getByRole('button', { name: /Sortear time/ }).click();

  // O resto pela tecla Espaço (como o operador no projetor) até o fim.
  const oficializar = page.getByRole('button', { name: 'Oficializar no campeonato' });
  for (let i = 0; i < 200 && !(await oficializar.isVisible()); i++) {
    const revelarTodos = page.getByRole('button', { name: 'Revelar todos' });
    if (await revelarTodos.isVisible()) await revelarTodos.click();
    else await page.keyboard.press('Space');
    await page.waitForTimeout(150);
  }
  await expect(page.locator('body')).toContainText('mesma composição de níveis');
  await oficializar.click();
  await expect(page.getByRole('button', { name: 'Oficializado' })).toBeVisible();
});

test('sorteia T1 a T8', async () => {
  await irPara('/admin/partidas');
  await page.getByRole('button', { name: 'Sortear T1 a T8' }).click();
  await expect(page.getByRole('button', { name: /Refazer sorteio de T1 a T8/ })).toBeVisible();
});

test('súmula: começa o jogo 1, lança gol com assistência e encerra', async () => {
  await irPara('/admin/partidas');
  await page.getByRole('link', { name: 'Súmula / placar' }).first().click();
  await page.getByRole('button', { name: 'Ao vivo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ao vivo', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // Lançamento rápido: jogador → Gol → assistência.
  const autor = page.locator('ol[aria-label="Lançamento"] + ul button').first();
  artilheiro = (await autor.locator('span').nth(1).innerText()).trim();
  await autor.click();
  await page.getByRole('button', { name: 'Gol', exact: true }).click();
  await expect(page.getByText('Quem deu a assistência?')).toBeVisible();
  await page.locator('p:has-text("Quem deu a assistência") ~ ul button.btn-mini').first().click();
  await confirmado(/1/);

  await page.getByRole('button', { name: 'Encerrada', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Encerrada', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('site público mostra o resultado: tabela, jogos e artilharia', async () => {
  await irPara('/classificacao');
  await expect(page.locator('main')).toContainText('Grupo Único');
  await irPara('/jogos');
  await expect(page.locator('main')).toContainText('1 de 34 jogos encerrados');
  await irPara('/rankings');
  await expect(page.locator('main')).toContainText(artilheiro);
  await irPara('/regulamento');
  await expect(page.locator('main')).toContainText('34 jogos');
});

test('financeiro: começa pelo modelo da planilha e calcula o valor por atleta', async () => {
  await irPara('/admin/financeiro');
  await page.getByRole('button', { name: 'Começar com o modelo da planilha' }).click();
  await expect(page.locator('input[name=descricao][value="Uniformes Camizzeria"]')).toHaveCount(1);
  // 64 atletas × R$ 78,50 de uniforme: R$ 78,50 por atleta.
  await expect(page.locator('main')).toContainText('R$ 5.024,00 divididos por 64 atletas');
});

test('artes: prévias de feed e stories e download do PNG', async () => {
  await irPara('/admin/artes');
  await expect(page.locator('canvas')).toHaveCount(3);
  const baixar = page.getByRole('button', { name: 'Baixar PNG' }).first();
  await expect(baixar).toBeEnabled();
  const [arquivo] = await Promise.all([page.waitForEvent('download'), baixar.click()]);
  expect(arquivo.suggestedFilename()).toMatch(/^copa-jumentus-rodada-1-feed\.png$/);

  await page.getByRole('radio', { name: /Stories/ }).click();
  await expect(page.getByRole('button', { name: 'Baixar PNG' }).first()).toBeEnabled();
  const [story] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar PNG' }).nth(1).click()]);
  expect(story.suggestedFilename()).toBe('copa-jumentus-artilharia-story.png');
});

test('sair encerra a sessão', async () => {
  await irPara('/admin');
  await page.getByRole('button', { name: 'Sair' }).click();
  // Sair apaga o cookie e volta para o Início.
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await irPara('/admin');
  await expect(page).toHaveURL(/\/admin\/entrar/);
});

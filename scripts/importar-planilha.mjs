// Baixa a aba INSCRITOS da planilha oficial em CSV para dados/inscritos.csv.
// Uso:
//   npm run importar -- "<URL do CSV>"
//   PLANILHA_CSV_URL="<URL>" npm run importar
// URL aceita: link "Publicar na Web" em CSV da aba INSCRITOS, ou
//   https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=2002
// (o segundo exige que a planilha esteja aberta para "qualquer pessoa com o link").
// Sem acesso publico: Arquivo > Fazer download > CSV na aba INSCRITOS e salve como dados/inscritos.csv.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.argv[2] ?? process.env.PLANILHA_CSV_URL;
if (!url) {
  console.error('Informe a URL do CSV: npm run importar -- "<url>" (ou PLANILHA_CSV_URL).');
  process.exit(1);
}

const resposta = await fetch(url, { redirect: 'follow' });
const texto = await resposta.text();
if (!resposta.ok || /^\s*<!doctype html|^\s*<html/i.test(texto)) {
  console.error(
    `Nao foi possivel baixar o CSV (HTTP ${resposta.status}). A planilha esta publica/publicada? A URL aponta para a aba INSCRITOS?`,
  );
  process.exit(1);
}

const destino = path.join(process.cwd(), 'dados', 'inscritos.csv');
await mkdir(path.dirname(destino), { recursive: true });
await writeFile(destino, texto, 'utf8');
const linhas = texto.split(/\r?\n/).filter((l) => l.replace(/,/g, '').trim() !== '').length - 1;
console.log(`OK: ${linhas} linhas salvas em dados/inscritos.csv`);

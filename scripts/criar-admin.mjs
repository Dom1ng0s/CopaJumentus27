// Cria uma conta de admin e mostra a senha temporária uma vez.
// Para o primeiro acesso em desenvolvimento (banco local vazio) ou emergência.
// Uso: npm run admin:criar -- <usuario> [Nome de exibição]
// Com DATABASE_URL usa o Postgres; sem ela, o PGlite em dados/pglite
// (pare o `npm run dev` antes: o PGlite não aceita dois processos).
// O hash segue o formato de src/lib/auth/senha.ts (scrypt$N$r$p$sal$chave);
// o teste src/lib/auth/criar-admin.test.ts garante que os dois batem.

import path from 'node:path';
import { randomBytes, randomInt, scryptSync } from 'node:crypto';

const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function senhaTemporaria(tamanho = 14) {
  let s = '';
  for (let i = 0; i < tamanho; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

export function hashScrypt(senha) {
  const sal = randomBytes(16);
  const chave = scryptSync(senha.normalize('NFC'), sal, 64, { N: 16384, r: 8, p: 1 });
  return ['scrypt', 16384, 8, 1, sal.toString('base64url'), chave.toString('base64url')].join('$');
}

async function principal() {
  const [usuarioBruto, ...resto] = process.argv.slice(2);
  const usuario = (usuarioBruto ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(usuario)) {
    console.error('Uso: npm run admin:criar -- <usuario> [Nome]  (usuário: 2 a 32 caracteres, a-z 0-9 . _ -)');
    process.exit(1);
  }
  const nome = resto.join(' ').trim() || usuario.charAt(0).toUpperCase() + usuario.slice(1);
  const senha = senhaTemporaria();
  const hash = hashScrypt(senha);
  const consulta = 'insert into admin (usuario, nome, senha_hash, deve_trocar_senha) values ($1, $2, $3, true) on conflict (usuario) do nothing returning id';

  let linhas;
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const sql = postgres(url, { max: 1, prepare: false });
    try {
      linhas = await sql.unsafe(consulta, [usuario, nome, hash]);
    } finally {
      await sql.end();
    }
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const pg = new PGlite(path.join(process.cwd(), 'dados', 'pglite'));
    await migrate(drizzle(pg), { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    linhas = (await pg.query(consulta, [usuario, nome, hash])).rows;
    await pg.close();
  }
  if (linhas.length === 0) {
    console.error(`Já existe um admin "${usuario}". Para trocar a senha, use Admin › Admins › Redefinir senha.`);
    process.exit(1);
  }
  console.log(`Conta "${usuario}" criada. Senha temporária (só aparece agora): ${senha}`);
  console.log('No primeiro acesso em /admin/entrar, o sistema pede uma senha nova.');
}

if (import.meta.url === `file://${process.argv[1]}`) await principal();

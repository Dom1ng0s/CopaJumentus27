// Aplica as migrações SQL de drizzle/ no Postgres de DATABASE_URL.
// Roda no build da Vercel (ver "build" no package.json). Sem DATABASE_URL não faz
// nada: em desenvolvimento o PGlite aplica as migrações sozinho.

import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('migrar: sem DATABASE_URL, nada a fazer (desenvolvimento usa PGlite).');
  process.exit(0);
}

const { default: postgres } = await import('postgres');
const { drizzle } = await import('drizzle-orm/postgres-js');
const { migrate } = await import('drizzle-orm/postgres-js/migrator');

const sql = postgres(url, { max: 1, prepare: false });
try {
  await migrate(drizzle(sql), { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  console.log('migrar: banco atualizado.');
} finally {
  await sql.end();
}

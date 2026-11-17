import { defineConfig } from 'drizzle-kit';

// Gera as migrações SQL em drizzle/ a partir de src/lib/db/schema.ts.
// npm run db:gerar  → cria a migração nova (commitar a pasta drizzle/)
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
});

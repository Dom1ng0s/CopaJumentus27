/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PGlite (Postgres em WebAssembly, usado sem DATABASE_URL) não pode ser empacotado.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Server actions: arquivo CSV de inscritos cabe com folga.
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};

export default nextConfig;

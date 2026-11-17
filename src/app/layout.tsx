import type { Metadata } from 'next';
import { Bowlby_One, JetBrains_Mono, Manrope } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO } from '@/lib/config';
import './globals.css';

// Fontes do design system Leonida (~/.claude/skills/leonida-design).
// Bowlby One substitui o wordmark Pricedown do GTA, que e proprietario:
// gorda, condensada, terminais arredondados. Ver SKILL.md secao 6.
const bowlby = Bowlby_One({ subsets: ['latin'], weight: '400', variable: '--font-bowlby' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: `${NOME_COMPETICAO} — ${SUBTITULO_COMPETICAO}`,
  description: 'Sorteio balanceado dos elencos da Copa Jumentus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // As variaveis de fonte ficam no <html> para existirem no :root, onde
    // globals.css compoe --font-display / --font-sans / --font-mono.
    <html lang="pt-BR" className={`${bowlby.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body>
        <div className="grain-overlay" aria-hidden="true" />
        <div className="scroll-edge" aria-hidden="true" />
        <Navbar />
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}

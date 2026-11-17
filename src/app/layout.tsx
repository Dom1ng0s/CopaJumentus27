import type { Metadata } from 'next';
import { Anton, Barlow, Barlow_Condensed, Big_Shoulders } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { NOME_COMPETICAO, SUBTITULO_COMPETICAO } from '@/lib/config';
import './globals.css';

// Fontes do manual de marca (docs/marca/manual-de-marca.md, Tipografia):
// títulos Anton, números Big Shoulders (antiga Display), rótulos Barlow Condensed, texto Barlow.
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' });
const bigShoulders = Big_Shoulders({ subsets: ['latin'], weight: ['800', '900'], variable: '--font-big-shoulders' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-barlow-condensed' });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-barlow' });

export const metadata: Metadata = {
  title: `${NOME_COMPETICAO} — ${SUBTITULO_COMPETICAO}`,
  description: 'Sorteio balanceado dos elencos da Copa Jumentus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // As variaveis de fonte ficam no <html> para existirem no :root, onde
    // globals.css compoe --font-display / --font-sans / --font-mono.
    <html lang="pt-BR" className={`${anton.variable} ${bigShoulders.variable} ${barlowCondensed.variable} ${barlow.variable}`}>
      <body>
        <div className="grain-overlay" aria-hidden="true" />
        <div className="scroll-edge" aria-hidden="true" />
        <Navbar />
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}

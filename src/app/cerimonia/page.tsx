import { CerimoniaCliente } from './CerimoniaCliente';
import { JOGADORES_EXEMPLO, TIMES_EXEMPLO } from '@/lib/repo/seed';

export const metadata = { title: 'Cerimônia do sorteio — Copa Jumentus' };

export default function CerimoniaPage() {
  // Fase 1: dados vindos do seed. Ao plugar o CopaRepo, trocar aqui apenas.
  return <CerimoniaCliente jogadores={JOGADORES_EXEMPLO} times={TIMES_EXEMPLO} />;
}

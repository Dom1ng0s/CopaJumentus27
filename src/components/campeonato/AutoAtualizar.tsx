'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Recarrega os dados da página a cada `segundos` enquanto houver jogo ao vivo. */
export function AutoAtualizar({ ativo, segundos = 20 }: { ativo: boolean; segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [ativo, segundos, router]);
  return null;
}

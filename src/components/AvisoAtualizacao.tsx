'use client';

// Depois da recarga automática do error boundary (aba antiga após um deploy),
// mostra "O site foi atualizado…" uma vez, no padrão de toast da Copa.

import { useEffect, useState } from 'react';
import { Toast } from '@/components/campeonato/Toast';
import { AVISO_SITE_ATUALIZADO, CHAVE_RECARGA, INTERVALO_MINIMO_MS } from '@/lib/atualizacao';

const CHAVE_AVISADO = `${CHAVE_RECARGA}:avisado`;

export function AvisoAtualizacao() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      const recarga = window.sessionStorage.getItem(CHAVE_RECARGA);
      if (recarga === null || window.sessionStorage.getItem(CHAVE_AVISADO) === recarga) return;
      if (Date.now() - Number(recarga) > INTERVALO_MINIMO_MS) return;
      window.sessionStorage.setItem(CHAVE_AVISADO, recarga);
      setMostrar(true);
    } catch {
      // Sem sessionStorage: sem aviso.
    }
  }, []);

  return mostrar ? <Toast texto={AVISO_SITE_ATUALIZADO} /> : null;
}

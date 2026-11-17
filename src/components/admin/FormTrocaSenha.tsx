'use client';

import { useActionState } from 'react';
import { trocarMinhaSenha, type EstadoTroca } from '@/app/admin/acoes-conta';
import { Aviso } from '@/components/campeonato/ui';

const MINIMO = 10;

/** Formulário de nova senha (troca obrigatória e Minha conta). */
export function FormTrocaSenha({ exigirAtual, volta, autoFocus }: { exigirAtual: boolean; volta: string; autoFocus?: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoTroca, FormData>(trocarMinhaSenha, {});
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="volta" value={volta} />
      <Aviso texto={estado.erro} />
      {exigirAtual && (
        <label className="block">
          <span className="rotulo-campo">Senha atual</span>
          <input name="senhaAtual" type="password" required autoComplete="current-password" className="campo" autoFocus={autoFocus} />
        </label>
      )}
      <label className="block">
        <span className="rotulo-campo">Nova senha (mínimo {MINIMO} caracteres)</span>
        <input name="nova" type="password" required minLength={MINIMO} autoComplete="new-password" className="campo" autoFocus={autoFocus && !exigirAtual} />
      </label>
      <label className="block">
        <span className="rotulo-campo">Repita a nova senha</span>
        <input name="confirmacao" type="password" required minLength={MINIMO} autoComplete="new-password" className="campo" />
      </label>
      <button type="submit" className="btn-cta w-full" disabled={enviando}>
        <span>{enviando ? 'Salvando…' : 'Salvar nova senha'}</span>
      </button>
    </form>
  );
}

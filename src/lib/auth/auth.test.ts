import { describe, expect, it } from 'vitest';
import { BLOQUEIO_MS, ESTADO_LIMPO, MAX_TENTATIVAS_LOGIN, aposFalha, estaBloqueado, type EstadoTentativas } from './bloqueio';
import { gerarHash, gerarSenhaTemporaria, lerHash, problemaNaNovaSenha, verificarSenha } from './senha';
import { DURACAO_SESSAO_MS, assinarSessao, destinoSeguro, lerSessao } from './sessao';

// Gerado fora do Node (Python hashlib.scrypt) no formato do arquivo de contas
// iniciais: N=16384, r=8, p=1, sal de 16 bytes, chave de 64 bytes, base64url sem "=".
const HASH_EXTERNO =
  'scrypt$16384$8$1$AAECAwQFBgcICQoLDA0ODw$HXWHHXy_x79glNuat1wjTCAYP-k4q4sBxNzxXa4HbBdH32bOUjRF8zFuvwt9xHvByKuhN831XENXKgd0rcc9Og';

describe('senha (scrypt)', () => {
  it('gera hash no formato scrypt$N$r$p$sal$chave e verifica', async () => {
    const hash = await gerarHash('uma senha longa');
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/);
    expect(await verificarSenha('uma senha longa', hash)).toBe(true);
    expect(await verificarSenha('uma senha longA', hash)).toBe(false);
  });

  it('sal aleatório: a mesma senha gera hashes diferentes', async () => {
    expect(await gerarHash('repetida-123')).not.toBe(await gerarHash('repetida-123'));
  });

  it('aceita o formato do arquivo de contas iniciais (hash gerado por outra implementação)', async () => {
    const lido = lerHash(HASH_EXTERNO);
    expect(lido).toMatchObject({ N: 16384, r: 8, p: 1 });
    expect(lido?.sal).toHaveLength(16);
    expect(lido?.chave).toHaveLength(64);
    expect(await verificarSenha('senha-de-teste-123', HASH_EXTERNO)).toBe(true);
    expect(await verificarSenha('senha-de-teste-124', HASH_EXTERNO)).toBe(false);
  });

  it('hash malformado ou com parâmetros absurdos nunca verifica', async () => {
    for (const ruim of ['', 'bcrypt$x', 'scrypt$16384$8$1$abc', 'scrypt$3$8$1$AAECAwQFBgcICQoLDA0ODw$AAAAAAAAAAAAAAAAAAAAAA', 'scrypt$1048577$8$1$AAECAwQFBgcICQoLDA0ODw$AAAAAAAAAAAAAAAAAAAAAA']) {
      expect(lerHash(ruim)).toBeNull();
      expect(await verificarSenha('x', ruim)).toBe(false);
    }
  });

  it('nova senha: mínimo de 10, confirmação igual e diferente da atual', async () => {
    const atual = await gerarHash('senha-atual-1');
    expect(await problemaNaNovaSenha('curta', 'curta', atual)).toMatch(/10 caracteres/);
    expect(await problemaNaNovaSenha('nova-senha-1', 'nova-senha-2', atual)).toMatch(/confirmação/);
    expect(await problemaNaNovaSenha('senha-atual-1', 'senha-atual-1', atual)).toMatch(/diferente/);
    expect(await problemaNaNovaSenha('nova-senha-1', 'nova-senha-1', atual)).toBeNull();
  });

  it('senha temporária tem pelo menos 10 caracteres e passa nas regras', () => {
    const s = gerarSenhaTemporaria();
    expect(s.length).toBeGreaterThanOrEqual(10);
    expect(s).toMatch(/^[a-zA-Z2-9]+$/);
    expect(s).not.toMatch(/[01lIO]/);
  });
});

describe('cookie de sessão', () => {
  const segredo = 'x'.repeat(40);
  const agora = 1_800_000_000_000;
  const sessao = { adminId: 3, versao: 2, expira: agora + DURACAO_SESSAO_MS };

  it('assina e lê de volta', async () => {
    const token = await assinarSessao(sessao, segredo);
    expect(await lerSessao(token, segredo, agora)).toEqual(sessao);
  });

  it('recusa expirado, segredo errado, sem segredo e token adulterado', async () => {
    const token = await assinarSessao(sessao, segredo);
    expect(await lerSessao(token, segredo, sessao.expira)).toBeNull();
    expect(await lerSessao(token, 'y'.repeat(40), agora)).toBeNull();
    expect(await lerSessao(token, null, agora)).toBeNull();
    expect(await lerSessao(undefined, segredo, agora)).toBeNull();

    // Troca o adminId mantendo a assinatura antiga.
    const [, assinatura] = token.split('.');
    const forjado = Buffer.from(JSON.stringify({ ...sessao, adminId: 1 })).toString('base64url');
    expect(await lerSessao(`${forjado}.${assinatura}`, segredo, agora)).toBeNull();
    expect(await lerSessao(`${token}x`, segredo, agora)).toBeNull();
    expect(await lerSessao('lixo', segredo, agora)).toBeNull();
  });

  it('recusa conteúdo assinado mas fora do formato', async () => {
    const token = await assinarSessao({ adminId: '3', versao: 2, expira: agora + 1 } as never, segredo);
    expect(await lerSessao(token, segredo, agora)).toBeNull();
  });

  it('destino depois do login: só caminho interno', () => {
    expect(destinoSeguro('/admin/partidas')).toBe('/admin/partidas');
    expect(destinoSeguro('//malicioso.com')).toBe('/admin');
    expect(destinoSeguro('/\\malicioso.com')).toBe('/admin');
    expect(destinoSeguro('https://malicioso.com')).toBe('/admin');
    expect(destinoSeguro(undefined)).toBe('/admin');
  });
});

describe('bloqueio por tentativas', () => {
  const t0 = new Date('2026-11-17T12:00:00Z');
  const depois = (ms: number) => new Date(t0.getTime() + ms);

  it(`bloqueia na ${MAX_TENTATIVAS_LOGIN}ª falha seguida por 15 minutos`, () => {
    let e: EstadoTentativas = ESTADO_LIMPO;
    for (let i = 1; i < MAX_TENTATIVAS_LOGIN; i++) {
      e = aposFalha(e, t0);
      expect(e.tentativasFalhas).toBe(i);
      expect(estaBloqueado(e, t0)).toBe(false);
    }
    e = aposFalha(e, t0);
    expect(estaBloqueado(e, t0)).toBe(true);
    expect(estaBloqueado(e, depois(BLOQUEIO_MS - 1))).toBe(true);
    expect(estaBloqueado(e, depois(BLOQUEIO_MS))).toBe(false);
  });

  it('depois do bloqueio vencido, a contagem recomeça', () => {
    const bloqueado = { tentativasFalhas: 0, bloqueadoAte: depois(BLOQUEIO_MS) };
    const e = aposFalha(bloqueado, depois(BLOQUEIO_MS + 1));
    expect(e).toEqual({ tentativasFalhas: 1, bloqueadoAte: null });
  });
});

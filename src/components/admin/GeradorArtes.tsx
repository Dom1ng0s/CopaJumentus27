'use client';

// Artes do Instagram desenhadas no navegador (canvas 2D, sem dependência):
// resultados de uma rodada, artilharia e assistências, em feed (1080×1350) e
// stories (1080×1920), na grade do manual de marca (docs/marca/manual-de-marca.md,
// "Grade"). Os dados chegam prontos de lib/domain/campeonato/artes.ts.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BlocoDeJogos, JogoArte, RankingArte } from '@/lib/domain/campeonato/artes';

type Formato = 'feed' | 'story';
type TipoArte = 'rodada' | 'artilharia' | 'assistencias';

interface Props {
  blocos: BlocoDeJogos[];
  artilharia: RankingArte;
  assistencias: RankingArte;
  /** "COPA JUMENTUS 2027", no rodapé. */
  assinatura: string;
  blocoInicial?: string;
}

const L = 1080;
const ALTURA: Record<Formato, number> = { feed: 1350, story: 1920 };
/** Zonas da grade do manual (feed e stories). */
const GRADE: Record<Formato, { cab: number; conteudo: number; fimConteudo: number; rodape: number }> = {
  feed: { cab: 80, conteudo: 220, fimConteudo: 1200, rodape: 1230 },
  story: { cab: 250, conteudo: 400, fimConteudo: 1480, rodape: 1490 },
};
const M = 80;

const COR = {
  fundo: '#06122A',
  modulo: '#0B1F3F',
  moduloLider: '#10274D',
  linha: '#1B3560',
  texto: '#F4F2EC',
  concreto: '#C9CCD1',
  dourado: '#D4A12A',
  douradoClaro: '#F2CB57',
  vermelho: '#E4002B',
  noite: '#1E0838',
};

interface Fontes {
  titulo: string;
  numero: string;
  rotulo: string;
  texto: string;
}

function lerFontes(): Fontes {
  const css = getComputedStyle(document.documentElement);
  const v = (nome: string, reserva: string) => css.getPropertyValue(nome).trim() || reserva;
  return {
    titulo: v('--font-anton', 'Impact, sans-serif'),
    numero: v('--font-big-shoulders', 'Impact, sans-serif'),
    rotulo: v('--font-barlow-condensed', 'sans-serif'),
    texto: v('--font-barlow', 'sans-serif'),
  };
}

const imagens = new Map<string, Promise<HTMLImageElement | null>>();
function carregarImagem(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const ja = imagens.get(src);
  if (ja) return ja;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  imagens.set(src, p);
  return p;
}

// ---------- primitivas ----------

function gradienteDourado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y + h, x + w, y);
  g.addColorStop(0, '#9C6F14');
  g.addColorStop(0.55, COR.douradoClaro);
  g.addColorStop(1, COR.dourado);
  return g;
}

function espacamento(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing existe no Chrome e no Safari recentes; sem ele, só fica sem tracking.
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function texto(
  ctx: CanvasRenderingContext2D,
  conteudo: string,
  x: number,
  y: number,
  fonte: string,
  cor: string | CanvasGradient,
  opcoes: { alinhar?: CanvasTextAlign; tracking?: number; maxLargura?: number } = {},
) {
  ctx.font = fonte;
  ctx.fillStyle = cor;
  ctx.textAlign = opcoes.alinhar ?? 'left';
  ctx.textBaseline = 'alphabetic';
  espacamento(ctx, opcoes.tracking ?? 0);
  if (opcoes.maxLargura) {
    // Encolhe a fonte até caber (nomes longos), em vez de cortar.
    const tamanho = Number(/(\d+)px/.exec(fonte)?.[1] ?? 40);
    let t = tamanho;
    while (t > 12 && ctx.measureText(conteudo).width > opcoes.maxLargura) {
      t -= 2;
      ctx.font = fonte.replace(`${tamanho}px`, `${t}px`);
    }
  }
  ctx.fillText(conteudo, x, y);
  espacamento(ctx, 0);
}

/** Módulo de transmissão: canto superior direito cortado a 45° e filete dourado na base. */
function modulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fundo = COR.modulo) {
  const corte = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - corte, y);
  ctx.lineTo(x + w, y + corte);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = fundo;
  ctx.fill();
  ctx.fillStyle = gradienteDourado(ctx, x, y + h - 3, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
}

function imagemContida(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, lado: number) {
  if (!img) return;
  const r = Math.min(lado / img.naturalWidth, lado / img.naturalHeight);
  const w = img.naturalWidth * r;
  const h = img.naturalHeight * r;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

let ruido: HTMLCanvasElement | null = null;
function padraoRuido(): HTMLCanvasElement {
  if (ruido) return ruido;
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  if (g) {
    const dados = g.createImageData(160, 160);
    for (let i = 0; i < dados.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      dados.data[i] = dados.data[i + 1] = dados.data[i + 2] = v;
      dados.data[i + 3] = 255;
    }
    g.putImageData(dados, 0, 0);
  }
  ruido = c;
  return c;
}

// ---------- moldura comum ----------

async function moldura(ctx: CanvasRenderingContext2D, f: Formato, fontes: Fontes, rotulo: string, sub: string, assinatura: string) {
  const H = ALTURA[f];
  const g = GRADE[f];
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, L, H);

  // Faixa de céu Vice City no topo (peça de jogo: só a faixa).
  const ceu = ctx.createLinearGradient(0, 0, 0, g.conteudo + 80);
  ceu.addColorStop(0, 'rgba(30,8,56,0.95)');
  ceu.addColorStop(0.4, 'rgba(59,20,107,0.75)');
  ceu.addColorStop(0.72, 'rgba(122,46,110,0.45)');
  ceu.addColorStop(1, 'rgba(6,18,42,0)');
  ctx.fillStyle = ceu;
  ctx.fillRect(0, 0, L, g.conteudo + 80);

  // Malha de camisa (~8%).
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = COR.texto;
  ctx.lineWidth = 1;
  for (let d = -H; d < L + H; d += 7) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + H, H);
    ctx.moveTo(d, H);
    ctx.lineTo(d + H, 0);
    ctx.stroke();
  }
  ctx.restore();

  // Diagonais no canto (marinho, vermelho, dourado), acima do cabeçalho.
  const topo = f === 'feed' ? 0 : 150;
  ctx.save();
  ctx.beginPath();
  ctx.rect(L - 300, topo, 300, 64);
  ctx.clip();
  [COR.linha, COR.vermelho, COR.dourado].forEach((cor, i) => {
    ctx.save();
    ctx.translate(L - 140 + i * 36, topo + 32);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = cor;
    ctx.fillRect(-260, -13, 520, 26);
    ctx.restore();
  });
  ctx.restore();

  // Cabeçalho: brasão à esquerda, rótulo da peça à direita.
  const logo = await carregarImagem('/imagens/logo/copa-jumentus-logo.png');
  if (logo) {
    const h = 120;
    ctx.drawImage(logo, M, g.cab, (logo.naturalWidth / logo.naturalHeight) * h, h);
  }
  texto(ctx, rotulo.toUpperCase(), L - M, g.cab + 56, `700 26px ${fontes.rotulo}`, COR.dourado, { alinhar: 'right', tracking: 3.6 });
  texto(ctx, sub.toUpperCase(), L - M, g.cab + 88, `600 22px ${fontes.rotulo}`, COR.concreto, { alinhar: 'right', tracking: 2.2 });

  // Rodapé: filete dourado de 4 px e @C.R.JUMENTUS.
  ctx.fillStyle = gradienteDourado(ctx, M, g.rodape, L - 2 * M, 4);
  ctx.fillRect(M, g.rodape, L - 2 * M, 4);
  texto(ctx, '@C.R.JUMENTUS', M, g.rodape + 46, `700 26px ${fontes.rotulo}`, COR.concreto, { tracking: 3.6 });
  texto(ctx, assinatura.toUpperCase(), L - M, g.rodape + 46, `700 26px ${fontes.rotulo}`, COR.concreto, { alinhar: 'right', tracking: 3.6 });
}

function grao(ctx: CanvasRenderingContext2D, f: Formato) {
  const p = ctx.createPattern(padraoRuido(), 'repeat');
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, L, ALTURA[f]);
  ctx.restore();
}

/** Título em Anton com a parte dourada opcional ("RODADA" + "3"). Devolve o y logo abaixo do subtítulo. */
function titulo(ctx: CanvasRenderingContext2D, fontes: Fontes, y: number, branco: string, dourado: string, sub: string, tam: number): number {
  const base = y + tam * 0.86;
  texto(ctx, branco.toUpperCase(), M, base, `${tam}px ${fontes.titulo}`, COR.texto, { tracking: 0.5 });
  if (dourado) {
    ctx.font = `${tam}px ${fontes.titulo}`;
    espacamento(ctx, 0.5);
    const w = ctx.measureText(`${branco.toUpperCase()} `).width;
    espacamento(ctx, 0);
    texto(ctx, dourado.toUpperCase(), M + w, base, `${tam}px ${fontes.titulo}`, gradienteDourado(ctx, M + w, y, tam, tam), { tracking: 0.5 });
  }
  texto(ctx, sub.toUpperCase(), M, base + 64, `600 28px ${fontes.rotulo}`, COR.concreto, { tracking: 3.4 });
  return base + 64;
}

// ---------- arte de resultados ----------

async function desenharRodada(ctx: CanvasRenderingContext2D, f: Formato, fontes: Fontes, bloco: BlocoDeJogos, assinatura: string) {
  const [primeiraParte, ...resto] = bloco.legenda.split(' · ');
  await moldura(ctx, f, fontes, primeiraParte, resto.join(' · '), assinatura);
  const g = GRADE[f];
  const m = /^(.*?)(\d+)$/.exec(bloco.titulo);
  const fimTitulo = titulo(ctx, fontes, g.conteudo, m ? m[1].trim() : bloco.titulo, m ? m[2] : '', `Resultados · ${bloco.faixa}`, f === 'story' ? 128 : 104);

  const jogos = bloco.jogos;
  const topo = fimTitulo + (f === 'story' ? 64 : 46);
  const disponivel = g.fimConteudo - topo;
  const gap = f === 'story' ? 30 : 22;
  const h = Math.min(f === 'story' ? 220 : 172, (disponivel - gap * (jogos.length - 1)) / Math.max(1, jogos.length));
  const escudos = await Promise.all(jogos.flatMap((j) => [carregarImagem(j.mandante.escudo), carregarImagem(j.visitante.escudo)]));
  jogos.forEach((j, i) => cardJogo(ctx, fontes, j, topo + i * (h + gap), h, escudos[2 * i], escudos[2 * i + 1]));
  grao(ctx, f);
}

function cardJogo(ctx: CanvasRenderingContext2D, fontes: Fontes, j: JogoArte, y: number, h: number, escM: HTMLImageElement | null, escV: HTMLImageElement | null) {
  const w = L - 2 * M;
  modulo(ctx, M, y, w, h);
  ctx.fillStyle = j.mandante.cor;
  ctx.fillRect(M, y, 8, h - 3);
  ctx.fillStyle = j.visitante.cor;
  ctx.fillRect(M + w - 8, y + 26, 8, h - 29);

  const cy = y + h / 2;
  const esc = Math.min(96, h * 0.56);
  const siglaFonte = (s: string) => (s.length > 4 ? `30px ${fontes.titulo}` : `46px ${fontes.titulo}`);
  imagemContida(ctx, escM, M + 36 + esc / 2, cy, esc);
  texto(ctx, j.mandante.texto.toUpperCase(), M + 36 + esc + 26, cy + 16, siglaFonte(j.mandante.texto), j.mandante.escudo ? COR.texto : COR.concreto, { maxLargura: 250 });
  imagemContida(ctx, escV, M + w - 36 - esc / 2, cy, esc);
  texto(ctx, j.visitante.texto.toUpperCase(), M + w - 36 - esc - 26, cy + 16, siglaFonte(j.visitante.texto), j.visitante.escudo ? COR.texto : COR.concreto, { alinhar: 'right', maxLargura: 250 });

  const centro = L / 2;
  const situacao = `${j.numero ? `J${j.numero} · ` : ''}${j.situacao}`;
  texto(ctx, situacao, centro, y + 40, `700 22px ${fontes.rotulo}`, j.situacao === 'AO VIVO' ? COR.vermelho : COR.concreto, { alinhar: 'center', tracking: 3 });

  const tam = Math.round(Math.min(104, h * 0.6));
  const base = cy + tam * 0.42 + (j.penaltis ? -6 : 8);
  if (j.golsMandante === undefined || j.golsVisitante === undefined) {
    texto(ctx, 'X', centro, base - tam * 0.12, `${Math.round(tam * 0.62)}px ${fontes.numero}`, COR.concreto, { alinhar: 'center' });
  } else {
    const corM = j.vencedor === 'mandante' ? COR.douradoClaro : COR.texto;
    const corV = j.vencedor === 'visitante' ? COR.douradoClaro : COR.texto;
    texto(ctx, String(j.golsMandante), centro - 62, base, `900 ${tam}px ${fontes.numero}`, corM, { alinhar: 'right' });
    texto(ctx, '×', centro, base - tam * 0.18, `900 ${Math.round(tam * 0.6)}px ${fontes.numero}`, COR.concreto, { alinhar: 'center' });
    texto(ctx, String(j.golsVisitante), centro + 62, base, `900 ${tam}px ${fontes.numero}`, corV, { alinhar: 'left' });
  }
  if (j.penaltis) {
    texto(ctx, `PÊNALTIS ${j.penaltis[0]} × ${j.penaltis[1]}`, centro, y + h - 18, `700 22px ${fontes.rotulo}`, COR.vermelho, { alinhar: 'center', tracking: 2.6 });
  }
}

// ---------- arte de ranking ----------

async function desenharRanking(ctx: CanvasRenderingContext2D, f: Formato, fontes: Fontes, r: RankingArte, assinatura: string) {
  await moldura(ctx, f, fontes, 'Rankings', r.momento, assinatura);
  const g = GRADE[f];
  const fimTitulo = titulo(ctx, fontes, g.conteudo, r.titulo, '', r.legenda, f === 'story' ? 128 : 104);

  const cab = fimTitulo + (f === 'story' ? 66 : 50);
  texto(ctx, 'POS', M + 46, cab, `700 20px ${fontes.rotulo}`, COR.concreto, { alinhar: 'center', tracking: 2.8 });
  texto(ctx, 'JOGADOR', M + 186, cab, `700 20px ${fontes.rotulo}`, COR.concreto, { tracking: 2.8 });
  texto(ctx, r.unidade.toUpperCase(), L - M - 30, cab, `700 20px ${fontes.rotulo}`, COR.concreto, { alinhar: 'right', tracking: 2.8 });

  if (r.itens.length === 0) {
    texto(ctx, r.tipo === 'artilharia' ? 'Ainda sem gols registrados na súmula.' : 'Ainda sem assistências registradas na súmula.', M, cab + 80, `600 32px ${fontes.texto}`, COR.concreto);
    grao(ctx, f);
    return;
  }

  const topo = cab + 18;
  const gap = 10;
  const n = r.itens.length;
  const disponivel = g.fimConteudo - topo;
  // O líder fica 40% mais alto que os demais.
  const base = Math.min(f === 'story' ? 104 : 76, (disponivel - gap * (n - 1)) / (n + 0.4));
  const escudos = await Promise.all(r.itens.map((i) => carregarImagem(i.escudo)));
  let y = topo;
  r.itens.forEach((item, i) => {
    const lider = item.posicao === 1;
    const h = lider ? base * 1.4 : base;
    modulo(ctx, M, y, L - 2 * M, h, lider ? COR.moduloLider : COR.modulo);
    if (lider) {
      ctx.fillStyle = item.cor;
      ctx.fillRect(M, y, 10, h - 3);
    }
    const cy = y + h / 2;
    texto(ctx, String(item.posicao), M + 46, cy + h * 0.2, `900 ${Math.round(h * 0.56)}px ${fontes.numero}`, lider ? COR.douradoClaro : COR.concreto, { alinhar: 'center' });
    imagemContida(ctx, escudos[i], M + 130, cy, h * 0.62);
    texto(ctx, item.nome.toUpperCase(), M + 186, cy + h * 0.06, `${Math.round(h * (lider ? 0.4 : 0.42))}px ${fontes.titulo}`, COR.texto, { maxLargura: L - 2 * M - 186 - 160 });
    texto(ctx, item.sigla, M + 186, cy + h * 0.32, `700 ${Math.round(h * 0.22)}px ${fontes.rotulo}`, COR.concreto, { tracking: 2.6 });
    texto(ctx, String(item.valor), L - M - 30, cy + h * 0.25, `900 ${Math.round(h * 0.68)}px ${fontes.numero}`, lider ? COR.douradoClaro : COR.texto, { alinhar: 'right' });
    y += h + gap;
  });
  grao(ctx, f);
}

// ---------- componente ----------

async function desenhar(canvas: HTMLCanvasElement, tipo: TipoArte, f: Formato, props: Props, bloco: BlocoDeJogos | undefined) {
  canvas.width = L;
  canvas.height = ALTURA[f];
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const fontes = lerFontes();
  // Garante as fontes do manual carregadas antes de desenhar (o canvas não espera sozinho).
  await Promise.all(
    [`40px ${fontes.titulo}`, `900 40px ${fontes.numero}`, `700 40px ${fontes.rotulo}`, `600 40px ${fontes.rotulo}`, `600 40px ${fontes.texto}`].map((f) =>
      document.fonts.load(f).catch(() => []),
    ),
  );
  if (tipo === 'rodada') {
    if (bloco) await desenharRodada(ctx, f, fontes, bloco, props.assinatura);
  } else {
    await desenharRanking(ctx, f, fontes, tipo === 'artilharia' ? props.artilharia : props.assistencias, props.assinatura);
  }
}

function nomeArquivo(tipo: TipoArte, f: Formato, bloco?: BlocoDeJogos): string {
  const slug = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const qual = tipo === 'rodada' ? slug(bloco?.titulo ?? 'rodada') : tipo;
  return `copa-jumentus-${qual}-${f}.png`;
}

function comoBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function GeradorArtes(props: Props) {
  const { blocos, blocoInicial } = props;
  const [formato, setFormato] = useState<Formato>('feed');
  const [blocoId, setBlocoId] = useState(blocoInicial ?? blocos[0]?.id ?? '');
  const bloco = useMemo(() => blocos.find((b) => b.id === blocoId), [blocos, blocoId]);

  const artes: Array<{ tipo: TipoArte; titulo: string }> = [
    { tipo: 'rodada', titulo: bloco ? `Resultados · ${bloco.titulo}` : 'Resultados' },
    { tipo: 'artilharia', titulo: 'Artilharia' },
    { tipo: 'assistencias', titulo: 'Assistências' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <label>
          <span className="rotulo-campo">Rodada ou etapa</span>
          <select value={blocoId} onChange={(e) => setBlocoId(e.target.value)} className="campo min-w-56">
            {blocos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.titulo} · {b.jogos.filter((j) => j.encerrado).length}/{b.jogos.length} encerrados
              </option>
            ))}
          </select>
        </label>
        <div role="radiogroup" aria-label="Formato" className="flex">
          {(['feed', 'story'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={formato === f}
              onClick={() => setFormato(f)}
              className="btn-mini"
              data-ativo={formato === f || undefined}
              style={formato === f ? { background: 'var(--gradient-leonida)', color: '#06122A' } : undefined}
            >
              {f === 'feed' ? 'Feed 1080×1350' : 'Stories 1080×1920'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {artes.map((a) => (
          <CartaoArte key={a.tipo} tipo={a.tipo} titulo={a.titulo} formato={formato} props={props} bloco={bloco} />
        ))}
      </div>
    </div>
  );
}

function CartaoArte({ tipo, titulo, formato, props, bloco }: { tipo: TipoArte; titulo: string; formato: Formato; props: Props; bloco?: BlocoDeJogos }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pronto, setPronto] = useState(false);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let vivo = true;
    setPronto(false);
    void desenhar(canvas, tipo, formato, props, bloco).then(() => vivo && setPronto(true));
    return () => {
      vivo = false;
    };
  }, [tipo, formato, props, bloco]);

  useEffect(() => {
    const teste = new File([new Blob()], 'a.png', { type: 'image/png' });
    setPodeCompartilhar(typeof navigator.canShare === 'function' && navigator.canShare({ files: [teste] }));
  }, []);

  async function baixar() {
    const canvas = ref.current;
    if (!canvas) return;
    const blob = await comoBlob(canvas);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo(tipo, formato, bloco);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function compartilhar() {
    const canvas = ref.current;
    if (!canvas) return;
    const blob = await comoBlob(canvas);
    if (!blob) return;
    const arquivo = new File([blob], nomeArquivo(tipo, formato, bloco), { type: 'image/png' });
    try {
      await navigator.share({ files: [arquivo] });
    } catch {
      // Cancelado pelo usuário: nada a fazer.
    }
  }

  return (
    <section className="hud-card hud-clip modulo relative space-y-3 p-3">
      <h2 className="hud-label">{titulo}</h2>
      <canvas
        ref={ref}
        className="block w-full bg-[var(--surface1)]"
        style={{ aspectRatio: `${L} / ${ALTURA[formato]}`, opacity: pronto ? 1 : 0.4, transition: 'opacity 200ms' }}
        aria-label={`Prévia da arte: ${titulo}`}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={baixar} disabled={!pronto} className="btn-cta">
          <span>Baixar PNG</span>
        </button>
        {podeCompartilhar && (
          <button type="button" onClick={compartilhar} disabled={!pronto} className="btn-hud">
            Compartilhar
          </button>
        )}
      </div>
    </section>
  );
}

# Skill do Gemini · copa-jumentus-design

Agente que recebe a arte base montada no Canva e devolve a mesma arte com acabamento profissional (luz, brilho, textura, realismo), sem mexer em layout, logo, escudos ou textos. Também gera fundos e peças novas no padrão da Copa.

```
copa-jumentus-design/
├── SKILL.md                       instruções do agente
├── manual-de-marca.md             regras de marca
├── copa-jumentus-logo.png         brasão oficial
├── copa-jumentus-logo-brilho.png  brasão com brilho (fundos escuros)
└── escudos/                       8 escudos em PNG transparente
```

## Como instalar no Gemini

1. Gere o zip da pasta:
   ```bash
   cd docs/skill-gemini && zip -r copa-jumentus-design.zip copa-jumentus-design
   ```
2. No Gemini, apague a versão antiga da skill e envie o zip novo.

## Como manter

- `manual-de-marca.md` daqui é cópia de [`../marca/manual-de-marca.md`](../marca/manual-de-marca.md); altere os dois juntos.
- Logo e escudos são cópias em PNG de `public/imagens/`; se trocar um escudo lá, troque aqui também.

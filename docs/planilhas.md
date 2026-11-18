# Planilhas oficiais

Todas ficam no Google Sheets, com acesso restrito à comissão. Os links abaixo só abrem para quem já tem permissão.

| Planilha | Para quê | Link |
|---|---|---|
| Sorteio de Times | Inscritos (aba `INSCRITOS`), prévia do sorteio e times definidos (aba `TIMES`) | https://docs.google.com/spreadsheets/d/16urO279lXlQYD7UB0u1-nunj_8LGqK7CO_3173e9wcs |
| Uniformes | Número, nome na camisa, tamanho e posição de cada jogador, por time | https://docs.google.com/spreadsheets/d/1Jsie_5Q2GkP4t_m7rEWnDJB5MFn3Cme96X6DlQAWpeE |
| Financeiro | Custos fixos, uniformes, patrocínio e resumo por jogador | https://docs.google.com/spreadsheets/d/11p0XaR835h3l-iIukV-S0ZyJlpIkNPspoj9o433WNvU |

## Fluxo

1. **Inscritos** (aba `INSCRITOS`): `Nome`, `Apelido`, `Posição` (GOL/ZAG/MEI/ATA), `Goleiro` (sim, só para goleiro), `Estrelas` (1–6) e `Status` (`Confirmado` ou `Lista de espera`). Uma coluna `Capitão do time` antiga é ignorada: desde 18/11/2026 não há capitão fixo; cada time escolhe o seu depois do sorteio.
2. **Sistema**: baixe a aba em *Arquivo › Fazer download › CSV* e envie em **Admin › Inscrições › Importar da planilha**. Depois disso, o cadastro vive no sistema: corrija lá, não na planilha. A tela lista as pendências e só libera o sorteio quando não houver nenhuma.
3. **Depois do sorteio**: cole os elencos em `TIMES › Times Definidos` (H14:O22). Não insira linhas nessa aba, porque a planilha de uniformes lê exatamente esse intervalo via `IMPORTRANGE`.
4. **Uniformes** se preenche sozinha com os times e nomes; falta só número, nome na camisa e tamanho.

As estrelas são sensíveis: não deixe a planilha de sorteio aberta para "qualquer pessoa com o link".

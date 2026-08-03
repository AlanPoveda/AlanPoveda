# ♠ Preflop Trainer — 6-max

Treinador de **pré-flop** para 6-max (cash, 100bb). Roda 100% no navegador, sem
build e sem backend. Feito para virar um "app" na tela inicial do celular (PWA).

## O que dá pra treinar

| Modo | O que é |
|------|---------|
| **Open Raise (RFI)** | Todos deram fold pra você. Decida **Raise** ou **Fold** por posição (UTG, HJ, CO, BTN, SB). |
| **Vs Raise** | Alguém abriu antes de você. Decida **3-bet / Call / Fold** em spots como BB vs BTN, SB vs BTN, BTN vs CO, etc. |
| **Grid** | Tabela 13×13 interativa para consultar qualquer range, colorida por ação. |

- **Estatísticas** persistentes (acerto, sequência atual, recorde, nº de mãos) via `localStorage`.
- **Mini-grid** aparece depois de cada resposta mostrando o range inteiro com a sua mão destacada.
- **Atalhos de teclado** (desktop): `R`/`F` no RFI · `T`/`C`/`F` no Vs Raise · `Espaço`/`Enter` para a próxima mão.

> ⚠️ Os ranges são **de estudo, simplificados** — cada mão tem uma única ação
> "certa". Solvers reais (GTO) usam frequências mistas. Use como guia de
> fundamentos. Para ajustar os ranges, edite `ranges.js`.

## Deploy na Vercel

O app está nesta subpasta (`preflop-trainer/`). Duas formas:

**Opção A — Dashboard (recomendada)**
1. Importe o repositório na Vercel.
2. Em **Root Directory**, selecione `preflop-trainer`.
3. Framework Preset: **Other** (site estático, sem build). Deploy.

**Opção B — CLI**
```bash
cd preflop-trainer
vercel        # segue os prompts; é estático, sem build
```

## Adicionar como app no celular

- **iPhone (Safari):** abra a URL → botão Compartilhar → **Adicionar à Tela de Início**.
  Abre em tela cheia, sem barra do navegador, com o ícone do espada.
- **Android (Chrome):** aparece o aviso "Instalar app" (ou menu ⋮ → **Instalar app**).

## Estrutura

```
preflop-trainer/
├── index.html              # estrutura + meta tags PWA
├── styles.css              # tema escuro "feltro de poker", mobile-first
├── ranges.js               # dados dos ranges + parser de notação
├── app.js                  # quiz, grid, estatísticas, PWA
├── manifest.webmanifest    # manifesto PWA
├── sw.js                   # service worker (offline)
├── vercel.json             # headers (cache do SW, content-type do manifest)
└── icons/                  # ícones do app (gerados)
```

## Rodar localmente

Precisa ser servido por HTTP (o service worker não roda via `file://`):
```bash
cd preflop-trainer
python3 -m http.server 8000
# abra http://localhost:8000
```

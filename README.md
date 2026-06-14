# Sistema para Lojas

Aplicativo **desktop offline** para gestão de produtos, estoque e vendas de lojas físicas. Interface em **português (pt-BR)** ou **inglês (en)**, **tema claro ou escuro**, e fluxo pensado para o balcão: leitura de código de barras, carrinho multi-itens, históricos com filtros e dashboard analítico.

> **Idiomas:** **Português (pt-BR)** · [English](README.en.md)

---

## Prévia da aplicação

Capturas em **janela maximizada**, com dados de demonstração (`npm run seed`). Quatro combinações: português/inglês × tema escuro/claro.

### Dashboard — comparativo

| | Escuro | Claro |
|---|:---:|:---:|
| **Português** | ![Dashboard pt-BR tema escuro](docs/screenshots/pt-dark/dashboard.png) | ![Dashboard pt-BR tema claro](docs/screenshots/pt-light/dashboard.png) |
| **English** | ![Dashboard EN dark theme](docs/screenshots/en-dark/dashboard.png) | ![Dashboard EN light theme](docs/screenshots/en-light/dashboard.png) |

### Português · tema escuro

| Dashboard | Vendas |
|:---:|:---:|
| ![Dashboard](docs/screenshots/pt-dark/dashboard.png) | ![Vendas](docs/screenshots/pt-dark/vendas.png) |

| Estoque | Histórico de vendas | Histórico de estoque |
|:---:|:---:|:---:|
| ![Estoque](docs/screenshots/pt-dark/estoque.png) | ![Histórico de vendas](docs/screenshots/pt-dark/historico-vendas.png) | ![Histórico de estoque](docs/screenshots/pt-dark/historico-estoque.png) |

### Português · tema claro

| Dashboard | Vendas |
|:---:|:---:|
| ![Dashboard](docs/screenshots/pt-light/dashboard.png) | ![Vendas](docs/screenshots/pt-light/vendas.png) |

| Estoque | Histórico de vendas | Histórico de estoque |
|:---:|:---:|:---:|
| ![Estoque](docs/screenshots/pt-light/estoque.png) | ![Histórico de vendas](docs/screenshots/pt-light/historico-vendas.png) | ![Histórico de estoque](docs/screenshots/pt-light/historico-estoque.png) |

### English · dark theme

| Dashboard | Sales |
|:---:|:---:|
| ![Dashboard](docs/screenshots/en-dark/dashboard.png) | ![Sales](docs/screenshots/en-dark/vendas.png) |

| Inventory | Sales history | Stock history |
|:---:|:---:|:---:|
| ![Inventory](docs/screenshots/en-dark/estoque.png) | ![Sales history](docs/screenshots/en-dark/historico-vendas.png) | ![Stock history](docs/screenshots/en-dark/historico-estoque.png) |

### English · light theme

| Dashboard | Sales |
|:---:|:---:|
| ![Dashboard](docs/screenshots/en-light/dashboard.png) | ![Sales](docs/screenshots/en-light/vendas.png) |

| Inventory | Sales history | Stock history |
|:---:|:---:|:---:|
| ![Inventory](docs/screenshots/en-light/estoque.png) | ![Sales history](docs/screenshots/en-light/historico-vendas.png) | ![Stock history](docs/screenshots/en-light/historico-estoque.png) |

> Regenerar todas as imagens: `npm run screenshots` (build + seed + captura automatizada).
>
> **As imagens só aparecem no GitHub depois de versionadas.** Inclua `docs/screenshots/` no commit e faça push (`git add docs/screenshots README.md README.en.md` → commit → push).

---

## Funcionalidades

- **Dashboard** — KPIs do dia, gráfico de performance (dia/semana/mês/ano com intervalo De/Até), ranking de produtos, mix de pagamentos e alertas de estoque.
- **Estoque** — cadastro, reabastecimento, ajustes ±1, busca, filtros por status e paginação.
- **Vendas (PDV)** — carrinho com leitor de código de barras, sugestões por nome, desconto, formas de pagamento (Pix, Dinheiro, Débito/Crédito).
- **Históricos** — vendas e movimentações de estoque com filtros, ordenação e paginação (50 itens por página).
- **Offline** — dados persistidos localmente em SQLite, sem dependência de internet.
- **Tema claro/escuro** — alternância no header, preferência salva localmente.
- **Idiomas** — interface em português (pt-BR) ou inglês (en), com preferência persistente.

---

## Tecnologias

| Camada | Tecnologia | Papel |
|--------|------------|-------|
| Desktop | [Electron](https://www.electronjs.org/) 41 | Shell nativo, janela, IPC seguro |
| Linguagem | [TypeScript](https://www.typescriptlang.org/) 5.8 | Tipagem em main, renderer e testes |
| UI | HTML + CSS | Sem framework de UI — DOM direto, CSS modular |
| Gráficos | [Chart.js](https://www.chartjs.org/) 4 | Performance de vendas, ranking e mix de pagamentos |
| Banco | [sql.js](https://sql.js.org/) 1.14 | SQLite em arquivo local (`sistema.db`) |
| Build | `tsc` + [esbuild](https://esbuild.github.io/) | Main compilado; renderer empacotado em bundle |
| Testes | [Vitest](https://vitest.dev/) 4 + jsdom | 157 testes, cobertura de linhas 100% |

---

## Como rodar

### Pré-requisitos

- **Node.js** 18 ou superior
- **npm** 9 ou superior

### Instalação e desenvolvimento

```bash
# 1. Clonar e instalar dependências
git clone <url-do-repositorio>
cd sistema-para-lojas
npm install

# 2. (Opcional) Popular banco de demonstração
npm run seed

# 3. Modo desenvolvimento — hot reload de main, renderer e assets
npm run dev
```

### Produção local

```bash
npm run build   # compila para dist/
npm start       # build + abre o Electron
```

### Testes

```bash
npm test              # suite completa
npm run test:watch    # modo interativo
npm run test:coverage # cobertura (100% linhas/funções)
```

### Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento com watchers + Electron |
| `npm run build` | Compila main, renderer e copia HTML/CSS |
| `npm start` | Build e execução do app |
| `npm run seed` | Recria `data/sistema.db` com dados de demonstração |
| `npm run backfill-payments` | Preenche forma de pagamento em vendas antigas |
| `npm run screenshots` | Gera imagens em `docs/screenshots/{pt-dark,pt-light,en-dark,en-light}/` |

---

## Banco de dados

O SQLite fica em:

- **Desenvolvimento:** `data/sistema.db` (quando a pasta `data/` existe no projeto)
- **Produção:** `%APPDATA%/sistema/sistema.db` (Windows) — usado se não houver `data/` local

Tabelas principais: `products`, `sales`, `stock_entries`, `meta`.

O arquivo `data/` está no `.gitignore`; use `npm run seed` para criar uma base local de testes.

---

## Dados de demonstração (`npm run seed`)

O seed recria o banco com cenário realista:

- **40 produtos** (vestuário, calçados, acessórios)
- **~190 entradas de estoque** nos últimos 6 meses
- **~9.500 vendas** em 2 anos, com sazonalidade e picos em finais de semana
- **Formas de pagamento variadas** (~45% Pix, ~33% Débito/Crédito, ~22% Dinheiro)

---

## Arquitetura

```
src/
├── main.ts                 # Processo principal Electron
├── preload.ts              # Ponte segura (contextBridge → electronAPI)
├── index.html              # Layout de todas as telas (SPA)
├── styles/                 # base, layout, components, navigation, dashboard
├── database/               # conexão, seed, migrações
├── repositories/           # SQL e mapeamento row → tipo
├── services/               # regras de negócio e transações
├── ipc/                    # handlers main ↔ renderer
├── types/                  # tipos compartilhados
└── renderer/
    ├── index.ts            # bootstrap e registro de rotas
    ├── router.ts           # navegação SPA
    ├── pages/              # uma page por tela
    ├── components/         # gráficos Chart.js
    ├── state/              # estado reativo (subscribe + refresh)
    └── utils/              # formatação, filtros, ordenação
```

Fluxo de uma operação (ex.: finalizar venda):

```
Renderer (page) → electronAPI (preload) → IPC handler → Service → Repository → SQLite
```

---

## Decisões de projeto

### Electron + offline first

Lojas físicas precisam de sistema **rápido e confiável sem internet**. Electron entrega app desktop com uma base web, instalável e familiar para manutenção.

### SQLite via sql.js (arquivo local)

- Dados ficam na máquina do lojista, sem servidor externo.
- Transações SQL garantem consistência em vendas e ajustes de estoque.
- `sql.js` roda SQLite em WASM — funciona no processo Node do Electron sem binário nativo extra.

### HTML/CSS puro (sem React/Vue)

- Escopo enxuto: poucas telas, muita interação de formulário e tabela.
- Evita overhead de bundle e complexidade de estado reativo de framework.
- CSS modular (`base`, `layout`, `components`, `dashboard`) mantém o visual consistente.

### IPC com contextIsolation

O renderer **não acessa Node.js** diretamente. Toda comunicação passa por `preload.ts` + `contextBridge`, expondo uma API tipada (`window.electronAPI`). Isso segue as recomendações de segurança do Electron.

### Camadas: Repository → Service → Page

| Camada | Responsabilidade |
|--------|------------------|
| **Repository** | SQL, queries paginadas, mapeamento de linhas |
| **Service** | Validações, transações, regras (ex.: baixa de estoque no carrinho) |
| **Page (renderer)** | DOM, eventos, formatação pt-BR, feedback ao usuário |

Separação clara facilita testes unitários de cada camada sem subir a UI inteira.

### SPA com router leve

Cinco rotas alternadas por CSS (`.screen.active`). A última rota visitada é salva em `sessionStorage` e restaurada ao reabrir o app — útil quando o operador alterna entre Vendas e Estoque o dia todo.

### Paginação nas listagens grandes

Histórico de vendas, histórico de estoque e listagem de produtos usam **50 itens por página**. Evita travamentos ao renderizar milhares de linhas no DOM de uma vez.

### Dashboard analítico

- **Performance de vendas:** gráfico com granularidade Dia/Semana/Mês/Ano e filtro De/Até para análises customizadas.
- **Ranking e mix de pagamentos:** visualizações complementares no mesmo painel.
- **Alertas de estoque:** até 5 itens esgotados ou abaixo do mínimo (limiar = 5 un.), alinhados visualmente ao ranking, com scroll refinado.

### Status de estoque

| Status | Regra |
|--------|-------|
| Esgotado | quantidade = 0 |
| Estoque baixo | 1 a 5 unidades |
| Disponível | 6 ou mais |

### Formatação pt-BR

Valores monetários com vírgula (`R$ 10,50`), datas legíveis e mensagens de erro em português — alinhado ao uso real no balcão.

### Testes automatizados

Vitest cobre backend (repositories, services, IPC), renderer (pages, router, utils) e scripts. Cobertura de **100% em linhas, funções e statements** garante regressões visíveis ao evoluir o sistema.

---

## Fora do escopo (por enquanto)

- Multiusuário / login
- Emissão de NF-e
- Sincronização em nuvem
- Impressora fiscal
- Múltiplas lojas / filiais



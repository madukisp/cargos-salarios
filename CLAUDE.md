# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup & Comandos

**Instalar dependências:**
```bash
npm install
```

**Variáveis de Ambiente:**
- Criar arquivo `.env.local` com:
  ```
  VITE_SUPABASE_URL=https://[project-ref].supabase.co
  VITE_SUPABASE_ANON_KEY=[anon-key]
  ```
- Valores já estão preenchidos no projeto existente; atualizar se trocar de Supabase

**Comandos Principais:**
```bash
npm run dev    # Dev server (http://localhost:5173) — hot reload habilitado
npm run build  # Build de produção → dist/
```

> Sem linting, testes ou formatador configurados.

## Sobre o Projeto

Sistema Web de RH para gestão de Cargos & Salários, originado de design Figma exportado via Figma Make. Domínio: saúde pública (UPAs, Hospitais, UBSs) — TLP (Tabela de Lotação de Pessoal), saldo de vagas e requisições são centrais.

**Telas Principais:**

| Tela | Função | Dados |
|------|--------|-------|
| **Dashboard** | Visão geral de funcionários, vagas e cargos da unidade selecionada | Filtro por CNPJ, estatísticas, gráficos TLP vs Ativos |
| **Oris** | Visualização completa de funcionários em formato Excel com busca | Tabela `oris_funcionarios`, search em tempo real, export CSV |
| **TLP vs Ativos** | Comparação de lotação planejada vs ativos | Dados agregados por cargo |
| **Gestão de Vagas** | Gestão de vagas abertas e atribuições | Criação, atualização, exclusão de vagas |
| **Requisições** | Gerenciamento de requisições de pessoal | Status, histórico |
| **Database Demo** | Ferramenta de diagnóstico (dev) | Acesso direto aos dados |

**Tabelas Supabase:**
- `cnpj` — contratos/unidades (filtro Dashboard)
- `oris_funcionarios` — dados principais de funcionários (~16.354 registros)
- `analistas_cargos_salarios` — autenticação (5 usuários)
- Tabelas suplementares: `tlp_*`, `vagas_*`, `requisições_*` (conforme demanda)

## Arquitetura

### Estado Global & Navegação

- **SPA sem React Router** — navegação controlada por `useState` em `App.tsx`
- **Conditional Rendering** — `App` renderiza Dashboard, TlpPanel, VacancyManagement, Requisitions, ou DatabaseDemo
- **Providers** em App.tsx:
  - `ThemeProvider` — dark/light mode (classe `.dark` em `<html>`, localStorage)
  - `SidebarProvider` — estado collapsed/expanded
  - `NotificationContext` — sistema de notificações global

### Camada de Dados

**Backend:** Supabase JS Client + Edge Functions

**Cliente Supabase:**
- Inicializado em `src/lib/supabase.ts` — exporta instância reutilizável
- `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- RPC para login/logout: `login_analista()`, `change_password_analista()`

**Hooks de Dados** (`src/app/hooks/`):
- `useAuth.ts` — login, logout, changePassword (localStorage)
- `useFantasiaFilter.ts` — filtro por CNPJ (carrega contratos + filtra funcionários)
- `useDatabase.ts` — queries genéricas para TLP, funcionários ativos, etc.
- `useOrisFuncionarios.ts` — carrega tabela completa `oris_funcionarios`
- `useTlpData.ts` — dados de TLP para gráficos
- `useRequisitions.ts`, `useGestaoVagas.ts` — gestão de vagas/requisições
- `useTableInfo.ts` — metadados de tabelas (columns, tipos)
- Padrão: `useState` + `useEffect` vanilla (sem TanStack Query)

## Stack & Convenções

**Frontend:**
- Vite 6.3.5 + React 18 + TypeScript (ES2020)
- Tailwind CSS v4 via `@tailwindcss/vite` (sem tailwind.config.js)
  - `src/styles/tailwind.css` — importa tw + `@source`
  - `src/styles/theme.css` — custom properties + dark mode variant
- **Componentes:** shadcn/ui (Radix primitives) em `src/app/components/ui/` (auto-gerado, evitar editar manualmente)
- **Ícones:** lucide-react
- **Gráficos:** recharts
- **Formulários:** react-hook-form + Radix/shadcn inputs
- **Utilitários:** `cn()` (clsx + tailwind-merge) em `src/app/components/ui/utils.ts`
- **Path alias:** `@/` → `./src` (vite.config.ts)

**Backend:**
- Supabase (PostgreSQL + RLS)
- Edge Functions (se necessário para lógica complexa)
- RPC para operações seguras (login, senha, etc.)

## Estrutura de Pastas

```
src/
├── main.tsx                    # Entry point (ReactDOM.createRoot)
├── styles/                     # CSS (tailwind.css, theme.css, index.css)
├── lib/
│   └── supabase.ts            # Instância do cliente Supabase
├── app/
│   ├── App.tsx                # Root com providers e navegação por estado
│   ├── components/
│   │   ├── ui/                # shadcn/ui (auto-gerado, não editar)
│   │   ├── figma/             # Helpers do Figma Make (não editar)
│   │   ├── Dashboard.tsx      # Tela principal
│   │   ├── TlpPanel.tsx       # Gráficos TLP
│   │   ├── Oris.tsx           # Visualizar tabela funcionários
│   │   ├── VacancyManagement.tsx  # Gestão de vagas
│   │   ├── Requisitions.tsx   # Requisições
│   │   ├── Login.tsx          # Tela de login
│   │   ├── Header.tsx         # Barra superior
│   │   ├── Sidebar.tsx        # Menu lateral
│   │   └── ...                # Modais, cards, etc.
│   ├── hooks/
│   │   ├── useAuth.ts         # Login/logout/sessão
│   │   ├── useFantasiaFilter.ts  # Filtro CNPJ
│   │   ├── useDatabase.ts     # Queries genéricas
│   │   ├── useOrisFuncionarios.ts  # Carrega oris_funcionarios
│   │   ├── useTlpData.ts      # Dados TLP
│   │   ├── useGestaoVagas.ts  # Vagas
│   │   └── ...                # Outros hooks
│   └── contexts/
│       └── NotificationContext.tsx  # Notificações globais
└── utils/                      # Utilitários (auto-gerado by Figma)
```

## Autenticação

**Modelo:**
- Tabela: `analistas_cargos_salarios` (5 analistas)
- Senha padrão: `123`
- Senhas: bcrypt (validado via RPC)
- Sessão: localStorage (chave: `auth_user`)

**RPCs:**
```sql
login_analista(p_email, p_senha)
-- Retorna: {id, email, nome}
-- Valida bcrypt; retorna erro se credenciais inválidas

change_password_analista(p_email, p_senha_atual, p_senha_nova)
-- Atualiza senha; valida senha atual primeiro
```

**Componentes:**
- `Login.tsx` — tela de login (exibida quando `!isAuthenticated`)
- `Header.tsx` — dropdown com "Alterar Senha" e "Sair"
- `ChangePasswordModal.tsx` — modal para trocar senha

**Hook:**
- `useAuth()` — retorna `{user, loading, error, login, logout, changePassword, isAuthenticated}`

**Fluxo:**
1. `App.tsx` verifica `isAuthenticated` na montagem
2. Não autenticado → exibe `Login.tsx`
3. Autenticado → exibe UI principal + componentes
4. Logout limpa localStorage e retorna ao login


## Padrões de Desenvolvimento

### Buscar Dados do Supabase

```typescript
// Padrão: usar um hook customizado
const { data, loading, error } = useOrisFuncionarios();

// Dentro do hook:
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetch = async () => {
    try {
      const { data, error } = await supabase
        .from('tabela')
        .select('*')
        .eq('cnpj', selectedCnpj);
      if (error) throw error;
      setData(data);
    } finally {
      setLoading(false);
    }
  };
  fetch();
}, [selectedCnpj]);
```

### Filtrar por CNPJ Selecionado

Dashboard e outras telas filtram por CNPJ via `useFantasiaFilter()`. Ao selecionar um contrato:
```typescript
const { contratos, selectedCnpj, setSelectedCnpj } = useFantasiaFilter();
// selectedCnpj é persistido em localStorage automaticamente
```

### Adicionar Nova Coluna em Tabela

1. Criar coluna no Supabase (`ALTER TABLE ...`)
2. Atualizar tipo TypeScript se necessário
3. Adicionar coluna no `useTableInfo.ts` se metadados precisam
4. Renderizar em componente (ex: `Oris.tsx` renderiza todas as colunas automaticamente)

### Notificações

```typescript
import { useNotification } from '@/app/contexts/NotificationContext';

const { showNotification } = useNotification();
showNotification('Sucesso!', 'success');
```

## Avisos

- **`utils/supabase/info.tsx` e `src/app/components/ui/`** são auto-gerados pelo Figma Make — edições manuais podem ser sobrescritas
- **`postcss.config.mjs`** está vazio propositalmente; Tailwind v4 é configurado pelo plugin Vite
- **`vite.config.ts` `assetsInclude`** suporta SVG e CSV como raw imports — nunca adicionar `.css`, `.tsx` ou `.ts`
- **RPC `login_analista()`** valida bcrypt — necessária para login seguro
- **Senhas** devem ser sempre bcrypt; RPCs realizam validação do lado do servidor

## Regras Gerais

- Arquivos de teste: delete se não mais necessários (manter repo limpo)
- Views Supabase: sempre criar no schema `view`
- RPC para operações críticas: login, alterar senha, dados sensíveis
- localStorage para estado não-crítico: filtro CNPJ, tema, collapsed sidebar
- Hooks: lidar com loading e error states

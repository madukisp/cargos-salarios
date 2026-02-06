# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar Supabase:**
   - Copie `.env.example` para `.env.local`
   - As credenciais já estão preenchidas (projeto existente)
   - Se usar um novo projeto, atualize com suas credenciais

## Comandos

```bash
npm install   # instalar dependências
npm run dev   # dev server (Vite)
npm run build # build de produção
```

Não há linting, testes ou formatador configurados.

## Sobre o Projeto

Sistema Web de RH para gestão de Cargos & Salários, originado de um design Figma exportado via Figma Make. Domínio: saúde pública (UPAs, Hospitais, UBSs) — termos como TLP (Tabela de Lotação de Pessoal), saldo de vagas e requisições são centrais.

**Telas e Features:**

1. **Dashboard**
   - Filtro por contratos (tabela `cnpj`) com persistência em localStorage
   - Cards de estatísticas dinâmicas
   - Gráficos de TLP vs Ativos
   - Tabela de funcionários filtrados

2. **Oris** (Nova!)
   - Visualização completa da tabela `oris_funcionarios` em formato Excel
   - Búsqueda em tempo real em todos os campos
   - Export para CSV
   - Contador de registros (carrega todos os dados)
   - Columns: Todas as colunas da tabela `oris_funcionarios`

3. **Outras Telas:**
   - TLP vs Ativos
   - Gestão de Vagas
   - Requisições
   - Database Demo

**Integração com tabelas:**
- `cnpj` — contratos/unidades (filtro)
- `oris_funcionarios` — dados principais (Dashboard + Oris)
- `analistas_cargos_salarios` — autenticação

## Arquitetura

**SPA sem roteamento** — a navegação entre views é controlada por `useState('dashboard')` em `App.tsx`, sem React Router. O componente `App` renderiza condicionalmente Dashboard, TlpPanel, VacancyManagement, Requisitions ou DatabaseDemo.

**Providers (no App.tsx):**

- `ThemeProvider` — dark/light mode via classe `.dark` no `<html>`, persistido em localStorage
- `SidebarProvider` — estado collapsed/expanded da sidebar

**Backend:** Supabase JS Client (`src/lib/supabase.ts`) + Edge Function (`make-server-068aaf90`).

**Configuração Supabase:**
- `.env.local` contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Cliente inicializado em `src/lib/supabase.ts` — exporta instância `supabase` reutilizável
- Hooks em `src/app/hooks/useSupabase.ts` usam `fetchAPI()` para chamar Edge Function

**Hooks de dados** (`useSupabase.ts`): `useDashboardStats`, `useTlpData`, `useVacancies`, `useRequisitions` — todos usam `useState`/`useEffect` vanilla (sem TanStack Query).

## Stack e Convenções

- **Vite + React 18 + TypeScript** (sem tsconfig no repo — herdado do Figma Make)
- **Tailwind CSS v4** via plugin `@tailwindcss/vite` (sem tailwind.config). Configuração em:
  - `src/styles/tailwind.css` — importa tailwindcss com `source(none)` e define `@source`
  - `src/styles/theme.css` — CSS custom properties + `@theme inline` + `@layer base`
  - Dark mode usa `@custom-variant dark (&:is(.dark *))` ao invés do seletor padrão
- **UI components:** shadcn/ui (Radix primitives) em `src/app/components/ui/`
- **Ícones:** lucide-react
- **Gráficos:** recharts
- **Utilitário `cn()`** em `src/app/components/ui/utils.ts` (clsx + tailwind-merge)
- **Alias `@/`** aponta para `./src` (configurado em `vite.config.ts`)

## Estrutura de Pastas

```
src/
├── main.tsx                          # Entry point
├── styles/                           # CSS (index.css importa fonts, tailwind, theme)
├── app/
│   ├── App.tsx                       # Root com providers e navegação por estado
│   ├── components/                   # Componentes de página e layout
│   │   ├── ui/                       # shadcn/ui (auto-gerado, evitar editar manualmente)
│   │   └── figma/                    # Helpers do Figma Make
│   └── hooks/useSupabase.ts          # Hooks de dados (fetch para Edge Function)
utils/supabase/info.tsx               # Credenciais Supabase (auto-gerado)
```

## Autenticação

**Tabela:** `analistas_cargos_salarios` (5 analistas)
**Primeira Senha:** `123`
**Login Via:** RPC `login_analista(p_email, p_senha)`
**Trocar Senha Via:** RPC `change_password_analista(p_email, p_senha_atual, p_senha_nova)` *(precisa criar no Supabase)*
**Sessão:** localStorage (chave: `auth_user`)

**Componentes:**
- `Login.tsx` — tela de login (exibida quando não autenticado)
- `Header.tsx` — dropdown com "Alterar Senha" e "Sair"
- `ChangePasswordModal.tsx` — modal para trocar senha

**Hook:**
- `useAuth()` — login, logout, changePassword, isAuthenticated, user

**Fluxo:**
1. App.tsx checa `isAuthenticated` do `useAuth()`
2. Se não autenticado: exibe Login.tsx
3. Se autenticado: exibe Dashboard e componentes
4. Usuário pode trocar senha via dropdown → ChangePasswordModal
5. Logout remove sessão do localStorage

### Setup RPC change_password_analista

Para que a troca de senha funcione, é necessária a RPC `change_password_analista` no Supabase. Se não existir, criar no SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.change_password_analista(
  p_email TEXT,
  p_senha_atual TEXT,
  p_senha_nova TEXT
)
RETURNS json AS $$
BEGIN
  -- Atualizar a senha
  UPDATE public.analistas_cargos_salarios
  SET senha = p_senha_nova
  WHERE email = p_email;

  RETURN json_build_object('success', true);
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

*Nota: Ajuste conforme a estrutura real da tabela e validação de bcrypt que sua aplicação usa.*

## Cuidados

- `utils/supabase/info.tsx` e os componentes em `src/app/components/ui/` são auto-gerados pelo Figma Make. Edições manuais podem ser sobrescritas.
- O `postcss.config.mjs` está vazio propositalmente — Tailwind v4 é configurado inteiramente pelo plugin Vite.
- `vite.config.ts` inclui `assetsInclude` para SVG e CSV como raw imports. Nunca adicionar `.css`, `.tsx` ou `.ts` nessa lista.
- O Dashboard usa dados mock + dados reais de `useFuncionariosAtivos()` para contar funcionários ativos.
- RPC `login_analista()` valida bcrypt — necessária para login seguro.

## Regras

* Sempre que criar arquivos de testes delete se não for mais necessario para manter o projeto limpo
* TODAS as views criadas no supabase devem ser criadas no schema view

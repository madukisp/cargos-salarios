# Estrutura das Tabelas - Cargos & Salários

## Tabela: oris_funcionarios

Tabela principal com dados de funcionários.

**Colunas esperadas:**
- `matricula` - Matrícula do funcionário
- `nome` - Nome completo
- `cargo` - Cargo/função
- `cnpj` - CNPJ do contrato (chave estrangeira para tabela `cnpj`)
- `situacao` - Status (ex: '01-ATIVO', '02-INATIVO', etc)
- `nome_fantasia` - Nome da unidade (pode estar presente)

**Registros:** ~16.354

---

## Tabela: cnpj

Tabela de contratos/unidades utilizados como filtro no Dashboard.

**Colunas identificadas:**
- `cnpj` - Código CNPJ (identificador único do contrato)
- `nome_fantasia` OU `fantasia` OU `nome` - Nome da unidade
- `razao_social` - Razão social (opcional)

**Uso:** Filtro do Dashboard — cada contrato representa uma unidade/organização

**Como funciona o filtro:**
1. Dashboard carrega todos os contratos da tabela `cnpj`
2. Usuário seleciona um contrato
3. Dados de `oris_funcionarios` são filtrados por `cnpj`
4. Seleção é persistida em localStorage

---

## Tabela: analistas_cargos_salarios

Tabela de autenticação/usuários.

**Colunas esperadas:**
- `id` - ID único
- `email` - Email do analista
- `senha` - Senha em bcrypt
- `nome` - Nome do analista

**Registros:** 5 analistas

**Autenticação:** RPC `login_analista(p_email, p_senha)` valida bcrypt

---

## Notas Importantes

### Se o filtro não funcionar:

1. **Erro: "column cnpj.COLUNA does not existe"**
   - A tabela `cnpj` tem uma estrutura diferente do esperado
   - Verificar quais são as colunas reais em `cnpj`
   - Atualizar `useFantasiaFilter.ts` com os nomes corretos

2. **Filtro mostra nomes estranhos no dropdown**
   - Ajustar a lógica de `display_name` em `useFantasiaFilter.ts`
   - Prioritizar qual coluna usar: `nome_fantasia`, `fantasia`, `nome`, `razao_social`, etc

3. **Funcionários não filtram corretamente**
   - Verificar se `oris_funcionarios` tem coluna `cnpj`
   - Se a coluna tem outro nome, atualizar em:
     - `useFuncionariosFiltered()` em `useFantasiaFilter.ts`
     - `useFuncionariosAtivosFiltered()` em `useDatabase.ts`

### RPC necessária para trocar senha:

```sql
CREATE OR REPLACE FUNCTION public.change_password_analista(
  p_email TEXT,
  p_senha_atual TEXT,
  p_senha_nova TEXT
)
RETURNS json AS $$
BEGIN
  UPDATE public.analistas_cargos_salarios
  SET senha = p_senha_nova
  WHERE email = p_email;

  RETURN json_build_object('success', true);
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

# Análise de Estrutura de Dados de Afastamentos

## Conclusão Geral

**SIM, é totalmente possível puxar informações de afastamentos diretamente da tabela principal `oris_funcionarios`.**

A tabela contém campos dedicados para rastreamento de situações e datas, permitindo consultas diretas sem necessidade de tabelas de histórico separadas.

---

## 1. Valores Distintos de SITUACAO

A tabela `oris_funcionarios` contém **6 situações distintas**:

| Situação | Count | Descrição |
|----------|-------|-----------|
| `01-ATIVO` | 7.055 | Funcionários ativos |
| `05-AUX. DOENÇA` | 133 | Auxílio-doença |
| `21-APOSENTADORIA POR INVALIDEZ` | 14 | Aposentado por invalidez |
| `36 - AUX. MATERNIDADE INSALUBRIDA/INSS` | 86 | Auxílio maternidade (insalubre) |
| `39-AUX. MATERNIDADE-LEI 10.710/03` | 42 | Auxílio maternidade (Lei 10.710/03) |
| `99-Demitido` | 8.949 | Demitidos |
| **TOTAL AFASTADOS** | **275** | (excluindo ativos e demitidos) |

---

## 2. Estrutura de Colunas Relacionadas

### Colunas Principais de Situação
```sql
-- Coluna que armazena a situação atual
situacao VARCHAR  -- valores: 01-ATIVO, 05-AUX. DOENÇA, 21-APOSENTADORIA..., 99-Demitido

-- Coluna que armazena quando a situação começou
dt_inicio_situacao DATE  -- ex: 2026-01-28, 2025-12-07, 2024-01-08
```

### Obs: Campo `tipo_afastamento`
O campo `tipo_afastamento` **não existe** na tabela. A informação é armazenada integralmente no campo `situacao`.

### Colunas Complementares
```sql
-- Datas gerais
dt_admissao DATE         -- data de admissão
dt_rescisao DATE         -- data de demissão (se aplicável)
demitido BOOLEAN         -- indicador se foi demitido
tipo_rescisao VARCHAR    -- tipo da demissão

-- Datas de vigência de informações
dt_inicio_cargo DATE
dt_inicio_lotacao DATE
dt_inicio_sindicato DATE
```

---

## 3. Exemplos de Funcionários por Situação

### 01-ATIVO (7.055 registros)
```
1. CAROLINE SOARES GERONIMO MORAIS    | Data: 2025-07-31
2. AMAURY DE ALMEIDA SOARES           | Data: 2025-10-02
3. KARINE DE SOUZA PEREIRA            | Data: 2025-11-03
4. CICERA LOPES DA SILVA              | Data: 2025-04-01
5. DELCINA CORREA DOS SANTOS DE MORAES| Data: 2025-07-28
```

### 05-AUX. DOENÇA (133 registros)
```
1. MELQUISEDEQUE MENDES DOS SANTOS    | Data: 2025-05-20
2. LUANA LOPES DE SOUZA               | Data: 2025-12-07
3. LEILA FREITAS MARQUES              | Data: 2026-01-29
4. JESSICA NOBRE DE ATAIDE            | Data: 2016-11-12
5. SIMONE BARBOSA DE JESUS            | Data: 2025-10-22
```

### 21-APOSENTADORIA POR INVALIDEZ (14 registros)
```
1. KATIA REGINA ORNELAS DE MORAES     | Data: 2025-09-19
2. LUIZ FERNANDES DA SILVA            | Data: 2025-09-23
3. NOELI DOS REIS XAVIER OLIVEIRA     | Data: 2025-03-07
4. ANDREIA CERIBINO                   | Data: 2024-01-08
5. MARIA JOSE NEIDE DA SILVA LIRA     | Data: 2025-04-25
```

### 36 - AUX. MATERNIDADE INSALUBRIDA/INSS (86 registros)
```
1. AMANDA KARINE CARVALHO BARROS      | Data: 2026-01-28
2. LAISY ARAUJO LUZ                   | Data: 2025-07-18
3. BIANCA CHAGAS DA SILVA             | Data: 2025-09-10
4. GABRIELLA SILVA DE SOUZA           | Data: 2025-10-03
5. CAROLINA DOS SANTOS MARTZ          | Data: 2025-08-12
```

### 39-AUX. MATERNIDADE-LEI 10.710/03 (42 registros)
```
1. TAMIRES APARECIDA REIS DA SILVA    | Data: 2025-12-01
2. NATALY DE SOUZA MOREIRA            | Data: 2026-01-07
3. JESSICA LETICIA DO ROZARIO BARROS  | Data: 2025-11-04
4. TALITHA CASTRO SERAFIM             | Data: 2026-01-09
5. KETLYN CRISTINA CARMO DE AGUIAR... | Data: 2025-11-01
```

### 99-Demitido (8.949 registros)
```
1. EMILIA VIEIRA LOURENCO             | Data: 2002-10-24
2. VALTER APARECIDO DA SILVA          | Data: 2022-07-12
3. KAUANE EMELY FERREIRA              | Data: 2023-10-31
4. VERONICA MOREIRA CARA              | Data: 2018-12-23
5. MARIA DE FATIMA DA SILVA SOSSOLOTI | Data: 2006-01-31
```

---

## 4. Queries SQL Úteis para o Projeto

### 4.1 Listar todos os afastados (excluindo ativos e demitidos)
```sql
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  dt_admissao,
  dt_rescisao
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido')
ORDER BY dt_inicio_situacao DESC;
```

**Resultado:** 275 registros

### 4.2 Contar afastados por tipo
```sql
SELECT
  situacao,
  COUNT(*) as total
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido')
GROUP BY situacao
ORDER BY total DESC;
```

**Resultado esperado:**
```
36 - AUX. MATERNIDADE INSALUBRIDA/INSS  | 86
05-AUX. DOENÇA                          | 133
39-AUX. MATERNIDADE-LEI 10.710/03       | 42
21-APOSENTADORIA POR INVALIDEZ          | 14
```

### 4.3 Listar afastados com informações de cargo e empresa
```sql
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  cargo,
  centro_custo,
  nome_fantasia,
  dt_admissao
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido')
ORDER BY dt_inicio_situacao DESC;
```

### 4.4 Afastados por tipo de auxílio maternidade
```sql
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  dt_rescisao,
  cargo
FROM oris_funcionarios
WHERE situacao LIKE '%AUX. MATERNIDADE%'
ORDER BY dt_inicio_situacao DESC;
```

**Resultado:** 128 registros (86 + 42)

### 4.5 Criar uma VIEW para afastamentos (recomendado)
```sql
CREATE OR REPLACE VIEW vw_afastamentos AS
SELECT
  id,
  re,
  nome,
  situacao,
  dt_inicio_situacao,
  dt_admissao,
  dt_rescisao,
  cargo,
  centro_custo,
  nome_fantasia,
  valor_salario,
  CASE
    WHEN situacao = '05-AUX. DOENÇA' THEN 'Auxílio Doença'
    WHEN situacao = '21-APOSENTADORIA POR INVALIDEZ' THEN 'Aposentadoria por Invalidez'
    WHEN situacao LIKE '%AUX. MATERNIDADE%' THEN 'Auxílio Maternidade'
    ELSE situacao
  END as tipo_afastamento_desc
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido');
```

---

## 5. Integração com o Projeto

### Hook para Afastamentos
```typescript
// src/app/hooks/useAfastamentos.ts
export function useAfastamentos() {
  const [afastamentos, setAfastamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAfastamentos = async () => {
      const { data, error } = await supabase
        .from('oris_funcionarios')
        .select('nome, situacao, dt_inicio_situacao, cargo, nome_fantasia')
        .not('situacao', 'in', '("01-ATIVO","99-Demitido")');

      if (!error) setAfastamentos(data);
      setLoading(false);
    };

    fetchAfastamentos();
  }, []);

  return { afastamentos, loading };
}
```

### Filtro no Dashboard
```typescript
// Adicionar ao Dashboard para filtrar por tipo de afastamento
const tiposAfastamento = [
  { value: '05-AUX. DOENÇA', label: 'Auxílio Doença' },
  { value: '21-APOSENTADORIA POR INVALIDEZ', label: 'Aposentadoria' },
  { value: '36 - AUX. MATERNIDADE INSALUBRIDA/INSS', label: 'Maternidade (Insalubre)' },
  { value: '39-AUX. MATERNIDADE-LEI 10.710/03', label: 'Maternidade (Lei 10.710)' }
];
```

---

## 6. Recomendações

1. **Criar VIEW `vw_afastamentos`** no Supabase para facilitar queries (já que o REST API não suporta NOT IN bem em todos os casos)

2. **Usar a coluna `dt_inicio_situacao`** para rastrear quando o afastamento começou

3. **Considerar campo `dt_reintegracao`** para afastados que retornaram (atualmente com NULL em afastados ativos)

4. **Cuidado com demitidos** (situacao = '99-Demitido') — usar NOT IN ('01-ATIVO', '99-Demitido') para excluí-los

5. **Não existe tabela de histórico** — apenas registro da situação atual. Se precisar histórico completo, seria necessário criar tabela de auditoria separada.

---

## 7. Total de Registros por Situação (Dataset Completo)

| Status | Quantidade | Percentual |
|--------|-----------|-----------|
| Ativos | 7.055 | 44,8% |
| Demitidos | 8.949 | 55,2% |
| **Afastados** | **275** | **1,7%** |
|   └─ Aux. Doença | 133 | 0,84% |
|   └─ Maternidade (total) | 128 | 0,81% |
|   └─ Aposentadoria | 14 | 0,09% |
| **TOTAL** | **16.279** | **100%** |

---

*Análise realizada em: 2026-02-10*
*Database: Supabase (xwztnhlcafgcffozwxyg)*
*Tabela: oris_funcionarios (123 colunas)*

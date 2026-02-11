-- ============================================================================
-- QUERIES PARA GERENCIAR AFASTAMENTOS NA TABELA oris_funcionarios
-- ============================================================================
-- Database: Supabase (xwztnhlcafgcffozwxyg)
-- Tabela: oris_funcionarios (123 colunas)
-- Colunas-chave: situacao, dt_inicio_situacao
-- ============================================================================

-- QUERY 1: Listar TODOS os valores distintos de situacao
-- Resultado: 6 valores
SELECT DISTINCT situacao
FROM oris_funcionarios
ORDER BY situacao;

-- Resultado esperado:
-- 01-ATIVO
-- 05-AUX. DOENÇA
-- 21-APOSENTADORIA POR INVALIDEZ
-- 36 - AUX. MATERNIDADE INSALUBRIDA/INSS
-- 39-AUX. MATERNIDADE-LEI 10.710/03
-- 99-Demitido

-- ============================================================================

-- QUERY 2: Contagem de funcionários por SITUACAO
-- Resultado: Distribuição completa
SELECT
  situacao,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM oris_funcionarios), 2) as percentual
FROM oris_funcionarios
GROUP BY situacao
ORDER BY total DESC;

-- Resultado esperado:
-- 99-Demitido                              | 8.949 | 55.02%
-- 01-ATIVO                                 | 7.055 | 43.35%
-- 05-AUX. DOENÇA                           |   133 |  0.82%
-- 36 - AUX. MATERNIDADE INSALUBRIDA/INSS   |    86 |  0.53%
-- 39-AUX. MATERNIDADE-LEI 10.710/03        |    42 |  0.26%
-- 21-APOSENTADORIA POR INVALIDEZ           |    14 |  0.09%

-- ============================================================================

-- QUERY 3: Listar AFASTADOS (excluindo ativos e demitidos)
-- Resultado: 275 registros
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  dt_admissao,
  dt_rescisao,
  cargo,
  centro_custo,
  nome_fantasia
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido')
ORDER BY dt_inicio_situacao DESC;

-- ============================================================================

-- QUERY 4: Afastados por tipo de auxílio MATERNIDADE
-- Resultado: 128 registros (86 + 42)
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  sexo,
  dt_nascimento,
  cargo,
  valor_salario
FROM oris_funcionarios
WHERE situacao LIKE '%AUX. MATERNIDADE%'
ORDER BY dt_inicio_situacao DESC;

-- ============================================================================

-- QUERY 5: Afastados por AUXÍLIO DOENÇA
-- Resultado: 133 registros
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  dt_rescisao,
  cargo,
  centro_custo,
  valor_salario
FROM oris_funcionarios
WHERE situacao = '05-AUX. DOENÇA'
ORDER BY dt_inicio_situacao DESC;

-- ============================================================================

-- QUERY 6: Afastados por APOSENTADORIA
-- Resultado: 14 registros
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  dt_nascimento,
  idade,
  dt_admissao,
  cargo,
  valor_salario
FROM oris_funcionarios
WHERE situacao = '21-APOSENTADORIA POR INVALIDEZ'
ORDER BY dt_inicio_situacao DESC;

-- ============================================================================

-- QUERY 7: Resumo de afastamentos por EMPRESA/UNIDADE
-- Resultado: Distribuição por nome_fantasia
SELECT
  nome_fantasia,
  situacao,
  COUNT(*) as total
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido')
GROUP BY nome_fantasia, situacao
ORDER BY nome_fantasia, situacao;

-- ============================================================================

-- QUERY 8: Afastados RECENTES (últimos 90 dias)
-- Resultado: Afastamentos iniciados recentemente
SELECT
  nome,
  situacao,
  dt_inicio_situacao,
  (CURRENT_DATE - dt_inicio_situacao) as dias_afastado,
  cargo,
  nome_fantasia
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido')
  AND dt_inicio_situacao >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY dt_inicio_situacao DESC;

-- ============================================================================

-- VIEW RECOMENDADA: vw_afastamentos
-- Esta view facilita consultas e pode ser reutilizada no dashboard
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
  (CURRENT_DATE - dt_inicio_situacao) as dias_afastado,
  CASE
    WHEN situacao = '05-AUX. DOENÇA' THEN 'Auxílio Doença'
    WHEN situacao = '21-APOSENTADORIA POR INVALIDEZ' THEN 'Aposentadoria'
    WHEN situacao = '36 - AUX. MATERNIDADE INSALUBRIDA/INSS' THEN 'Maternidade (Insalubre)'
    WHEN situacao = '39-AUX. MATERNIDADE-LEI 10.710/03' THEN 'Maternidade (Lei 10.710)'
    ELSE situacao
  END as tipo_afastamento_desc
FROM oris_funcionarios
WHERE situacao NOT IN ('01-ATIVO', '99-Demitido');

-- Após criar a view, usar assim:
-- SELECT * FROM vw_afastamentos WHERE nome_fantasia = 'Hospital XYZ';

-- ============================================================================

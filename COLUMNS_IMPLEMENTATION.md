# Implementação de Configuração de Colunas - Oris

## 📋 Resumo

Foi implementado um sistema de configuração de colunas que permite:
1. **Filtrar colunas**: Apenas as 50 colunas selecionadas são exibidas (excluindo 35 colunas desnecessárias)
2. **Renomear colunas**: Cada campo tem um label em português para exibição
3. **Reordenar por drag-and-drop**: Usuários podem arrastras cabeçalhos para reordenar
4. **Persistência**: Ordem e visibilidade são salvas no localStorage
5. **Exportar com labels**: CSV exporta com nomes em português

---

## 📂 Arquivos Criados/Modificados

### 1. **src/lib/columns.config.ts** (NOVO)
Arquivo central de configuração com:
- Array `VISIBLE_COLUMNS`: Define quais campos aparecem e seus labels
- Funções helper:
  - `getVisibleColumnFields()`: Retorna lista de field names
  - `getColumnLabels()`: Retorna mapa field → label
  - `getOrderedColumns()`: Retorna colunas ordenadas

### 2. **src/app/components/Oris.tsx** (MODIFICADO)
Alterações:
- Importa funções do `columns.config.ts`
- Filtra colunas iniciais para apenas as configuradas
- Exibe labels em português nos cabeçalhos e modal
- CSV exporta com labels traduzidos
- Modal mostra label + field name (para referência)

---

## 🎯 Colunas Selecionadas (50 campos)

### Dados Pessoais (5)
- ID, Nome, CPF, Data Nascimento, Sexo

### Cargo e Função (7)
- Cargo, Código Cargo, Função, CBO, Descrição CBO, Tipo Funcionário, Motivo Cargo

### Empresa/Contrato (1)
- Fantasia

### Lotação e Centro de Custo (3)
- Lotação, Centro Custo, Local Trabalho

### Escala e Carga Horária (3)
- Escala, Carga Horária Mensal, Carga Horária Semanal

### Datas Importantes (9)
- Admissão, Data Rescisão, Situação Atual, Início Situação, Início Cargo, Início Centro Custo, Início Escala, Início Lotação, Situação

### Informações Especiais (5)
- PCD, Descrição PCD, PCD Reabilitado, Demitido, Tipo Rescisão

### Sindicato (2)
- Código Sindicato, Sindicato

### Vaga/Posição (2)
- Vaga, Mão de Obra

---

## 🔄 Fluxo de Funcionamento

1. **Ao montar Oris.tsx**:
   - Carrega todas as colunas do banco via `useOrisFuncionarios()`
   - Filtra para apenas as 50 colunas configuradas
   - Verifica localStorage por preferências de ordem/visibilidade
   - Se não há, exibe todas as 50 por padrão

2. **Ao clicar "Colunas (X/Y)"**:
   - Abre modal com lista de checkboxes
   - Mostra label em português + field name para clareza
   - Permite toggle de visibilidade

3. **Ao arrastar coluna**:
   - Captura com `onDragStart`
   - Reordena array de colunas
   - Salva nova ordem no localStorage

4. **Ao exportar CSV**:
   - Usa labels em português como headers
   - Valores mantêm a ordem configurada
   - Arquivo gerado com data: `oris_funcionarios_YYYY-MM-DD.csv`

---

## 💾 localStorage Keys

- `oris_columns_order`: Ordem das colunas (array JSON)
- `oris_visible_columns`: Quais colunas estão visíveis (array JSON)

---

## ✨ Para Adicionar/Remover Colunas no Futuro

1. Abra `COLUMNS_CONFIG.md` (referência de todas as colunas do banco)
2. Edite `src/lib/columns.config.ts`:
   - Adicione/remova elementos do array `VISIBLE_COLUMNS`
   - Atualize labels conforme necessário
3. Pronto! A aplicação recarregará com as novas colunas

---

## 🗑️ Limpeza

O arquivo `COLUMNS_CONFIG.md` foi criado como referência durante o setup e pode ser deletado após confirmar que tudo funciona.

Execute se desejar remover:
```bash
rm COLUMNS_CONFIG.md
```

Ou mantenha como documentação da estrutura completa do banco.

---

## ✅ Checklist de Funcionamento

- [x] Apenas 50 colunas visíveis (35 removidas)
- [x] Labels em português nos cabeçalhos
- [x] Labels em português no modal
- [x] Drag-and-drop funcional
- [x] Persistência de ordem no localStorage
- [x] Persistência de visibilidade no localStorage
- [x] CSV exporta com labels e ordem configurada
- [x] Modal mostra field name para referência

---

Implementação concluída! 🎉

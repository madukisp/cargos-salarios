/**
 * Configuração de colunas visíveis para a tabela Oris
 * Gerado a partir de COLUMNS_CONFIG.md
 *
 * Para adicionar/remover colunas:
 * 1. Edite COLUMNS_CONFIG.md
 * 2. Execute novamente o script de geração
 */

export interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
}

export const VISIBLE_COLUMNS: ColumnConfig[] = [
  // Dados Pessoais
  { field: 'id', label: 'ID', visible: true },
  { field: 'nome', label: 'Nome', visible: true },
  { field: 'cpf', label: 'CPF', visible: true },
  { field: 'dt_nascimento', label: 'Data Nascimento', visible: true },
  { field: 'sexo', label: 'Sexo', visible: true },

  // Cargo e Função
  { field: 'cargo', label: 'Cargo', visible: true },
  { field: 'cargo_codigo', label: 'Código Cargo', visible: true },
  { field: 'funcao', label: 'Função', visible: true },
  { field: 'cbo', label: 'CBO', visible: true },
  { field: 'descricao_cbo', label: 'Descrição CBO', visible: true },
  { field: 'tipo_funcionario', label: 'Tipo Funcionário', visible: true },
  { field: 'motivo_cargo', label: 'Motivo Cargo', visible: true },

  // Empresa/Contrato
  { field: 'nome_fantasia', label: 'Fantasia', visible: true },

  // Lotação e Centro de Custo
  { field: 'local_de_trabalho', label: 'Lotação', visible: true },
  { field: 'centro_custo', label: 'Centro Custo', visible: true },
  { field: 'unidade', label: 'Unidade', visible: false }, // Caso exista em alguma view

  // Escala e Carga Horária
  { field: 'escala', label: 'Escala', visible: true },
  { field: 'carga_horaria_mensal', label: 'Carga Horária Mensal', visible: true },
  { field: 'carga_horaria_semanal', label: 'Carga Horária Semanal', visible: true },

  // Datas Importantes
  { field: 'dt_admissao', label: 'Admissão', visible: true },
  { field: 'dt_rescisao', label: 'Data Rescisão', visible: true },
  { field: 'situacao', label: 'Situação', visible: true },
  { field: 'dt_inicio_situacao', label: 'Data da Situação', visible: true },
  { field: 'dt_inicio_cargo', label: 'Início Cargo', visible: true },
  { field: 'dt_inicio_centro_custo', label: 'Início Centro Custo', visible: true },
  { field: 'dt_inicio_escala', label: 'Início Escala', visible: true },
  { field: 'dt_inicio_lotacao', label: 'Início Lotação', visible: true },

  // Informações Especiais
  { field: 'pcd', label: 'PCD', visible: true },
  { field: 'pcd_descricao', label: 'Descrição PCD', visible: true },
  { field: 'pcd_reabilitado', label: 'PCD Reabilitado', visible: true },
  { field: 'demitido', label: 'Demitido', visible: true },
  { field: 'tipo_rescisao', label: 'Tipo Rescisão', visible: true },

  // Sindicato
  { field: 'sindicato_codigo', label: 'Código Sindicato', visible: true },
  { field: 'sindicato', label: 'Sindicato', visible: true },

  // Vaga/Posição
  { field: 'vaga', label: 'Vaga', visible: true },
  { field: 'mao_de_obra', label: 'Mão de Obra', visible: true },
];

/**
 * Obter lista de colunas visíveis (field names)
 */
export function getVisibleColumnFields(): string[] {
  return VISIBLE_COLUMNS.filter(col => col.visible).map(col => col.field);
}

/**
 * Obter mapeamento de field -> label
 */
export function getColumnLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  VISIBLE_COLUMNS.forEach(col => {
    labels[col.field] = col.label;
  });
  return labels;
}

/**
 * Ordenar dados para exibição
 */
export function getOrderedColumns(): ColumnConfig[] {
  return VISIBLE_COLUMNS.filter(col => col.visible);
}

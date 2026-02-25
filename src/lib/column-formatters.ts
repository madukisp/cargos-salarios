/**
 * Formatadores customizados para colunas da tabela Oris
 * Permite transformar valores antes de exibição
 */

type FormatterFunction = (value: any) => string;

// Mapeamento de formatadores por nome de coluna
const COLUMN_FORMATTERS: Record<string, FormatterFunction> = {
  // Booleanos
  demitido: (value) => {
    if (value === true || value === 'true' || value === 'Sim') return '❌ Demitido';
    if (value === false || value === 'false' || value === 'Não') return '✅ Ativo';
    return String(value || '-');
  },
  pcd: (value) => {
    if (value === true || value === 'true' || value === 'Sim') return 'SIM';
    if (value === false || value === 'false' || value === 'Não') return 'NÃO';
    return String(value || '-');
  },
  pcd_reabilitado: (value) => {
    if (value === true || value === 'true' || value === 'Sim') return 'SIM';
    if (value === false || value === 'false' || value === 'Não') return 'NÃO';
    return String(value || '-');
  },

  // Datas
  nascimento: (value) => formatarData(value),
  dt_nascimento: (value) => formatarData(value),
  admissao: (value) => formatarData(value),
  dt_admissao: (value) => formatarData(value),
  data_rescisao: (value) => formatarData(value),
  dt_rescisao: (value) => formatarData(value),
  data_emissao_rg: (value) => formatarData(value),
  dt_emissao_rg: (value) => formatarData(value),
  data_inicio_situacao: (value) => formatarData(value),
  dt_inicio_situacao: (value) => formatarData(value),
  data_inicio_cargo: (value) => formatarData(value),
  dt_inicio_cargo: (value) => formatarData(value),
  data_inicio_centro_custo: (value) => formatarData(value),
  dt_inicio_centro_custo: (value) => formatarData(value),
  data_inicio_escala: (value) => formatarData(value),
  dt_inicio_escala: (value) => formatarData(value),
  data_inicio_lotacao: (value) => formatarData(value),
  dt_inicio_lotacao: (value) => formatarData(value),
};

/**
 * Formatar data para formato brasileiro (DD/MM/YYYY)
 */
export function formatarData(data: any): string {
  if (!data) return '-';
  try {
    // Se a data vier no formato ISO (YYYY-MM-DD), o JS interpreta como UTC.
    // Para evitar o atraso de 1 dia em fusos horários negativos (Brasil),
    // vamos garantir que a data seja interpretada como local ou formatada diretamente.
    if (typeof data === 'string' && data.includes('-')) {
      const datePart = data.split('T')[0]; // Pega apenas YYYY-MM-DD
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        // Se o ano for o primeiro item (formato ISO)
        if (year.length === 4) {
          return `${day}/${month}/${year}`;
        }
      }
    }

    const date = new Date(data);
    // Fallback para objetos Date ou outros formatos
    if (isNaN(date.getTime())) return String(data);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return String(data);
  }
}

/**
 * Obter o valor formatado de uma coluna
 * Se não houver formatador específico, retorna o valor como string
 */
export function getFormattedValue(columnName: string, value: any): string {
  // Se o valor é null ou undefined, retornar hífen
  if (value === null || value === undefined) {
    return '-';
  }

  // Procurar por formatador específico para esta coluna
  const formatter = COLUMN_FORMATTERS[columnName];

  if (formatter) {
    return formatter(value);
  }

  // Caso padrão: converter para string
  return String(value);
}

/**
 * Verificar se uma coluna tem formatador customizado
 */
export function hasFormatter(columnName: string): boolean {
  return columnName in COLUMN_FORMATTERS;
}

/**
 * Obter lista de todas as colunas com formatadores
 */
export function getFormattedColumns(): string[] {
  return Object.keys(COLUMN_FORMATTERS);
}
/**
 * Converter data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 */
export function parseBrazilianDateToISO(dateStr: string): string | null {
  if (!dateStr || !dateStr.includes('/')) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return null;
}

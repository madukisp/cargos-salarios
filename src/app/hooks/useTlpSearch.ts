import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface TlpSearchResult {
  id: number;
  cargo: string;
  unidade: string;
  centro_custo: string;
  tlp_quantidade: number;
  ativos: number;
  afastados: number;
  saldo: number;
  carga_horaria_semanal?: string | number | null;
}

/**
 * Hook para buscar dados da TLP por cargo e unidade
 */
/**
 * Normaliza string removendo acentos e diacríticos
 */
function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function useTlpSearch(cargo: string, unidade: string) {
  const [data, setData] = useState<TlpSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargo || !unidade) {
      setData(null);
      return;
    }

    const searchTlp = async () => {
      try {
        setLoading(true);

        const normalizedCargo = normalizeText(cargo);
        const normalizedUnidade = normalizeText(unidade);

        // 1. Buscar TLP target pela tabela tlp_quadro_necessario
        // Precisamos fazer um join com oris_funcionarios para pegar o nome da unidade
        const { data: tlpTargets, error: tlpError } = await supabase
          .from('tlp_quadro_necessario')
          .select('id, cargo, centro_custo, quantidade_necessaria_ativos, carga_horaria_semanal')
          .ilike('cargo', `%${cargo.trim()}%`);

        if (tlpError) throw tlpError;

        if (!tlpTargets || tlpTargets.length === 0) {
          setData(null);
          setError(null);
          setLoading(false);
          return;
        }

        // 2. Buscar funcionários para contar ativos e afastados
        const { data: employees, error: empError } = await supabase
          .from('oris_funcionarios')
          .select('cargo, centro_custo, nome_fantasia, situacao')
          .ilike('cargo', `%${cargo.trim()}%`)
          .ilike('nome_fantasia', `%${unidade.trim()}%`)
          .neq('situacao', '99-Demitido');

        if (empError) throw empError;

        // 3. Procurar pela melhor correspondência
        // Prioriza: (1) TLP com funcionários correspondentes (2) TLP sem funcionários mas cargo/centro_custo existem
        let bestMatch: TlpSearchResult | null = null;
        let fallbackMatch: TlpSearchResult | null = null;

        for (const tlp of tlpTargets) {
          // Normalizar cargo da TLP para comparação
          const normalizedTlpCargo = normalizeText(tlp.cargo || '');

          // Filtrar funcionários que correspondem a este TLP (ignorando acentos)
          const matchingEmployees = employees?.filter(emp => {
            const empCargoNormalized = normalizeText(emp.cargo || '');
            const empFantasiaUppercase = emp.nome_fantasia?.trim().toUpperCase() || '';

            return (
              empCargoNormalized === normalizedTlpCargo &&
              emp.centro_custo?.trim() === tlp.centro_custo?.trim() &&
              empFantasiaUppercase.includes(normalizedUnidade)
            );
          }) || [];

          const ativos = matchingEmployees.filter(e =>
            e.situacao && e.situacao.toUpperCase().includes('ATIVO')
          ).length;

          const afastados = matchingEmployees.length - ativos;

          const currentMatch: TlpSearchResult = {
            id: tlp.id,
            cargo: tlp.cargo || '',
            unidade: unidade,
            centro_custo: tlp.centro_custo || '',
            tlp_quantidade: tlp.quantidade_necessaria_ativos || 0,
            ativos,
            afastados,
            saldo: ativos - (tlp.quantidade_necessaria_ativos || 0),
            carga_horaria_semanal: tlp.carga_horaria_semanal,
          };

          // Se encontrou funcionários correspondentes, usar esta como match principal
          if (matchingEmployees.length > 0) {
            bestMatch = currentMatch;
            break;
          }

          // Guardar como fallback apenas se ainda não temos um
          if (!fallbackMatch) {
            fallbackMatch = currentMatch;
          }
        }

        // Usar o match encontrado com funcionários, ou fallback se nenhum encontrado
        setData(bestMatch || fallbackMatch);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to search TLP:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    searchTlp();
  }, [cargo, unidade]);

  return { data, loading, error };
}

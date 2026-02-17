import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useCentroCustoList() {
  const [centrosCusto, setCentrosCusto] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCentrosCusto = async () => {
      try {
        setLoading(true);

        // Buscar todos os centros de custo únicos de oris_funcionarios
        const { data, error: dbError } = await supabase
          .from('oris_funcionarios')
          .select('centro_custo', { count: 'exact' })
          .neq('centro_custo', null);

        if (dbError) throw dbError;

        // Extrair centros de custo únicos e ordenar
        const uniqueCentros = Array.from(
          new Set(
            data
              ?.map(row => row.centro_custo)
              .filter(centro => centro && String(centro).trim())
              .map(centro => String(centro).trim()) || []
          )
        ).sort((a, b) => {
          // Ordena numericamente se for número, senão alfabeticamente
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.localeCompare(b);
        });

        setCentrosCusto(uniqueCentros);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao carregar centros de custo:', err);
        setError(err.message);
        setCentrosCusto([]);
      } finally {
        setLoading(false);
      }
    };

    loadCentrosCusto();
  }, []);

  // Função para filtrar centros de custo conforme digitação
  const filterCentrosCusto = (searchTerm: string): string[] => {
    if (!searchTerm.trim()) return centrosCusto;

    const normalized = searchTerm.trim().toLowerCase();
    return centrosCusto.filter(centro => centro.toLowerCase().includes(normalized));
  };

  return { centrosCusto, loading, error, filterCentrosCusto };
}

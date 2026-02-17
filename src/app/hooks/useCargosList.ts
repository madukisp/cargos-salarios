import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useCargosList() {
  const [cargos, setCargos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCargos = async () => {
      try {
        setLoading(true);

        // Buscar todos os cargos únicos de oris_funcionarios
        const { data, error: dbError } = await supabase
          .from('oris_funcionarios')
          .select('cargo', { count: 'exact' })
          .neq('cargo', null);

        if (dbError) throw dbError;

        // Extrair cargos únicos e ordenar
        const uniqueCargos = Array.from(
          new Set(
            data
              ?.map(row => row.cargo)
              .filter(cargo => cargo && cargo.trim())
              .map(cargo => cargo.toUpperCase().trim()) || []
          )
        ).sort();

        setCargos(uniqueCargos);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao carregar cargos:', err);
        setError(err.message);
        setCargos([]);
      } finally {
        setLoading(false);
      }
    };

    loadCargos();
  }, []);

  // Função para filtrar cargos conforme digitação
  const filterCargos = (searchTerm: string): string[] => {
    if (!searchTerm.trim()) return cargos;

    const normalized = searchTerm.toUpperCase().trim();
    return cargos.filter(cargo => cargo.includes(normalized));
  };

  return { cargos, loading, error, filterCargos };
}

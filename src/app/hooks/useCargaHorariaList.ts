import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useCargaHorariaList() {
  const [cargasHorarias, setCargasHorarias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCargasHorarias = async () => {
      try {
        setLoading(true);

        // Buscar todas as cargas horárias de oris_funcionarios
        const { data, error: dbError } = await supabase
          .from('oris_funcionarios')
          .select('carga_horaria_semanal', { count: 'exact' });

        if (dbError) throw dbError;

        // Extrair cargas horárias únicas, normalizar e ordenar
        const uniqueCargasSet = new Set<number>();
        data?.forEach(row => {
          if (row.carga_horaria_semanal) {
            const normalized = parseFloat(String(row.carga_horaria_semanal).replace(',', '.'));
            if (!isNaN(normalized)) {
              uniqueCargasSet.add(normalized);
            }
          }
        });

        // Converter para string formatada e ordenar numericamente
        const uniqueCargasArray = Array.from(uniqueCargasSet)
          .sort((a, b) => a - b)
          .map(carga => String(carga)); // Mantém como string para comparação consistente

        setCargasHorarias(uniqueCargasArray);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao carregar cargas horárias:', err);
        setError(err.message);
        setCargasHorarias([]);
      } finally {
        setLoading(false);
      }
    };

    loadCargasHorarias();
  }, []);

  // Função para filtrar cargas horárias conforme digitação
  const filterCargasHorarias = (searchTerm: string): string[] => {
    if (!searchTerm.trim()) return cargasHorarias;

    const normalized = searchTerm.trim().toLowerCase();
    return cargasHorarias.filter(carga => carga.toLowerCase().includes(normalized));
  };

  return { cargasHorarias, loading, error, filterCargasHorarias };
}

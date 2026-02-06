import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para explorar a estrutura da tabela cnpj
 * Use para descobrir quais colunas existem e seus valores
 */
export function useCnpjTableInfo() {
  const [samples, setSamples] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInfo() {
      try {
        setLoading(true);
        // Buscar 5 primeiros registros para analisar
        const { data, error: supabaseError } = await supabase
          .from('cnpj')
          .select('*')
          .limit(5);

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setSamples(data || []);

        // Extrair nomes das colunas do primeiro registro
        if (data && data.length > 0) {
          setColumns(Object.keys(data[0]));
        }

        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load table info:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInfo();
  }, []);

  return { samples, columns, loading, error };
}

// Log para desenvolvedor
if (typeof window !== 'undefined') {
  console.log('💡 Para debugar a tabela cnpj, use: import { useCnpjTableInfo } from "@/hooks/useTableInfo"; const { samples, columns } = useCnpjTableInfo(); console.log(columns, samples);');
}

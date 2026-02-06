import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useOrisFuncionarios() {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Primeiro, contar o total
        const { count, error: countError } = await supabase
          .from('oris_funcionarios')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          throw new Error(countError.message);
        }

        // Carregar todos os dados com paginação (1000 registros por página)
        const pageSize = 1000;
        const totalPages = Math.ceil((count || 0) / pageSize);
        const allFuncionarios: any[] = [];

        console.log(`📄 Carregando ${count} registros em ${totalPages} páginas...`);

        for (let page = 0; page < totalPages; page++) {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          console.log(`📥 Carregando página ${page + 1}/${totalPages} (registros ${from}-${to})...`);

          const { data: pageData, error: pageError } = await supabase
            .from('oris_funcionarios')
            .select('*')
            .range(from, to);

          if (pageError) {
            throw new Error(pageError.message);
          }

          if (pageData) {
            allFuncionarios.push(...pageData);
          }
        }

        setData(allFuncionarios);
        setTotalCount(count || 0);

        // Debug: log de quantos registros foram carregados
        console.log(`✅ Carregados ${allFuncionarios.length} registros de ${count || 0} total (${totalPages} páginas)`);

        // Extrair colunas do primeiro registro
        if (allFuncionarios && allFuncionarios.length > 0) {
          const cols = Object.keys(allFuncionarios[0]).sort();
          setColumns(cols);
        }

        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load oris funcionarios:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, columns, loading, error, totalCount };
}

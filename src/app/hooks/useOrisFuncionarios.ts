import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface OrisFilters {
  searchNome?: string;
  searchTerm?: string;
  statusFilter?: 'todos' | 'ativos' | 'demitidos';
  fantasias?: string[];
}

export function useOrisFuncionarios(filters: OrisFilters = {}) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const hasFilters =
          !!filters.searchNome ||
          !!filters.searchTerm ||
          (filters.statusFilter && filters.statusFilter !== 'todos') ||
          (filters.fantasias && filters.fantasias.length > 0);

        let query = supabase
          .from('oris_funcionarios')
          .select('*', { count: 'exact' });

        // Aplicar filtros
        if (filters.searchNome) {
          query = query.ilike('nome', `%${filters.searchNome}%`);
        }

        if (filters.statusFilter) {
          if (filters.statusFilter === 'ativos') {
            query = query.or('demitido.is.null,demitido.eq.false');
          } else if (filters.statusFilter === 'demitidos') {
            query = query.eq('demitido', true);
          }
        }

        if (filters.fantasias && filters.fantasias.length > 0) {
          query = query.in('nome_fantasia', filters.fantasias);
        }

        if (filters.searchTerm) {
          const term = `%${filters.searchTerm}%`;
          // Busca em colunas principais para performance
          query = query.or(`nome.ilike.${term},cargo.ilike.${term},centro_custo.ilike.${term},local_de_trabalho.ilike.${term},cpf.ilike.${term},re.ilike.${term}`);
        }

        // Ordenação e Limite
        if (!hasFilters) {
          // Padrão: 50 últimas admissões
          query = query.order('dt_admissao', { ascending: false }).limit(50);
        } else {
          // Com filtro: traz mais resultados, mas ainda limita para evitar crash
          query = query.order('dt_admissao', { ascending: false }).limit(1000);
        }

        const { data: resultData, error: resultError, count } = await query;

        if (resultError) {
          throw new Error(resultError.message);
        }

        setData(resultData || []);

        // Se houver filtros, o count é o count filtrado.
        // Se não houver filtros, o count é o total da tabela (devido ao limit 50, o count retorna o total de match que é todos)
        setTotalCount(count || 0);

        // Extrair colunas
        if (resultData && resultData.length > 0) {
          const cols = Object.keys(resultData[0]).sort();
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

    // Debounce na chamada
    const timeoutId = setTimeout(() => {
      loadData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.searchNome, filters.searchTerm, filters.statusFilter, JSON.stringify(filters.fantasias)]);

  return { data, columns, loading, error, totalCount };
}

export function useOrisFantasias() {
  const [fantasias, setFantasias] = useState<string[]>([]);

  useEffect(() => {
    async function loadFantasias() {
      // Como não existe select distinct fácil via API JS direta sem chamar função, 
      // vamos pegar apenas os nomes de fantasia únicos de uma query leve ou usar uma RPC se existisse.
      // Alternativa: Pegar todos os nomes e filtrar no JS (pode ser pesado se forem muitos registros, mas é só 1 coluna).

      const { data, error } = await supabase
        .from('oris_funcionarios')
        .select('nome_fantasia');

      if (!error && data) {
        const unique = Array.from(new Set(data.map(d => d.nome_fantasia).filter(Boolean))).sort();
        setFantasias(unique as string[]);
      }
    }
    loadFantasias();
  }, []);

  return fantasias;
}

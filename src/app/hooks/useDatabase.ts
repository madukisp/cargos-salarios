import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para consultar dados direto do Supabase
 */
export function useFuncionarios() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data, error: supabaseError } = await supabase
          .from('oris_funcionarios')
          .select('*')
          .limit(100);

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setData(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load funcionarios:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error };
}

/**
 * Hook para contar Funcionários Ativos (situacao = '01-ATIVO')
 */
export function useFuncionariosAtivos() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCount() {
      try {
        setLoading(true);
        const { count: totalCount, error: supabaseError } = await supabase
          .from('oris_funcionarios')
          .select('*', { count: 'exact', head: true })
          .eq('situacao', '01-ATIVO');

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setCount(totalCount || 0);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load funcionarios ativos count:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCount();
  }, []);

  return { count, loading, error };
}

/**
 * Hook para contar Funcionários Ativos filtrados por CNPJ
 */
export function useFuncionariosAtivosFiltered(cnpj: string) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCount() {
      try {
        setLoading(true);
        let query = supabase
          .from('oris_funcionarios')
          .select('*', { count: 'exact', head: true })
          .eq('situacao', '01-ATIVO');

        // Aplicar filtro se não for "todos"
        if (cnpj !== 'todos') {
          query = query.eq('cnpj', cnpj);
        }

        const { count: totalCount, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setCount(totalCount || 0);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load filtered funcionarios ativos count:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCount();
  }, [cnpj]);

  return { count, loading, error };
}

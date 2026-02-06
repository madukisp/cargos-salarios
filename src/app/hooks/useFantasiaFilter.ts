import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'dashboard_contrato_filter';

interface ContratoOption {
  id: string;
  cnpj: string;
  nome_fantasia: string;
  display_name: string; // Nome para exibir no dropdown
}

export function useFantasiaFilter() {
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [selectedFantasia, setSelectedFantasia] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar contrato selecionado do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSelectedFantasia(saved);
    }
  }, []);

  // Salvar contrato selecionado no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedFantasia);
  }, [selectedFantasia]);

  // Buscar todos os contratos da tabela cnpj
  useEffect(() => {
    async function loadContratos() {
      try {
        setLoading(true);
        const { data, error: supabaseError } = await supabase
          .from('oris_funcionarios')
          .select('cnpj, nome_fantasia');

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        // Remover duplicatas por CNPJ e criar opções
        const uniqueContratos = new Map<string, any>();
        (data || []).forEach((item: any) => {
          if (!item.cnpj) return;

          const currentBestName = item.nome_fantasia || item.cnpj;
          const existing = uniqueContratos.get(item.cnpj);

          // Se não existe, ou se o existente é apenas o CNPJ e o atual tem nome
          if (!existing || (existing.display_name === item.cnpj && item.nome_fantasia)) {
            uniqueContratos.set(item.cnpj, {
              cnpj: item.cnpj,
              nome_fantasia: currentBestName,
              display_name: currentBestName,
            });
          }
        });

        // Transformar em array e ordenar alfabeticamente por display_name
        const contratoOptions: ContratoOption[] = Array.from(uniqueContratos.values())
          .map((item, index) => ({
            id: `contrato-${index}`,
            cnpj: item.cnpj,
            nome_fantasia: item.nome_fantasia,
            display_name: item.display_name,
          }))
          .sort((a, b) => a.display_name.localeCompare(b.display_name));

        setContratos(contratoOptions);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load contratos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadContratos();
  }, []);

  return {
    fantasias: contratos, // mantém o mesmo nome para compatibilidade
    selectedFantasia,
    setSelectedFantasia,
    loading,
    error,
  };
}

/**
 * Hook para filtrar funcionários por CNPJ
 */
export function useFuncionariosFiltered(cnpj: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let query = supabase
          .from('oris_funcionarios')
          .select('*')
          .limit(100);

        // Aplicar filtro se não for "todos"
        if (cnpj !== 'todos') {
          query = query.eq('cnpj', cnpj);
        }

        const { data: funcionarios, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setData(funcionarios || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load filtered funcionarios:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [cnpj]);

  return { data, loading, error };
}

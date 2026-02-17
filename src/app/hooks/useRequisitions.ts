import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Requisition {
  id_solicitacao: number;
  tipo?: string;
  unidade?: string;
  cargo: string;
  quantidade?: number;
  urgencia?: 'urgente' | 'normal';
  status: 'pendente' | 'aprovado' | 'rejeitado';
  solicitante?: string;
  data_solicitacao?: string;
  justificativa?: string;
  tipo_requisicao?: string;
  cnpj?: string;
  lotacao?: string;
}

/**
 * Hook para buscar requisições de vagas da tabela solicitacoes_vaga
 */
export function useRequisitions() {
  const [data, setData] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data, error: supabaseError } = await supabase
          .from('solicitacoes_vaga')
          .select('*')
          .order('data_solicitacao', { ascending: false });

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setData(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load requisitions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error };
}

/**
 * Hook para atualizar status de uma requisição
 */
export function useUpdateRequisitionStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (requisitionId: number, newStatus: 'pendente' | 'aprovado' | 'rejeitado') => {
    try {
      setLoading(true);
      const { error: supabaseError } = await supabase
        .from('solicitacoes_vaga')
        .update({ status: newStatus })
        .eq('id_solicitacao', requisitionId);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to update requisition status:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateStatus, loading, error };
}

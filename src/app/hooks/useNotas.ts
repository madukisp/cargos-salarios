import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Nota {
  id: number;
  titulo: string;
  conteudo: string | null;
  cor: 'amarelo' | 'rosa' | 'verde' | 'azul' | 'roxo';
  prioridade: 'alta' | 'media' | 'baixa';
  resolvida: boolean;
  autor: string;
  criado_em: string;
  editado_em: string;
}

export interface CreateNotaInput {
  titulo: string;
  conteudo?: string;
  cor: 'amarelo' | 'rosa' | 'verde' | 'azul' | 'roxo';
  prioridade: 'alta' | 'media' | 'baixa';
  autor: string;
}

export interface UpdateNotaInput {
  titulo?: string;
  conteudo?: string;
  cor?: 'amarelo' | 'rosa' | 'verde' | 'azul' | 'roxo';
  prioridade?: 'alta' | 'media' | 'baixa';
  resolvida?: boolean;
}

export function useNotas() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarNotas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('notas_postit')
        .select('*')
        .order('resolvida', { ascending: true })
        .order('criado_em', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setNotas(data || []);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar notas';
      setError(errorMsg);
      console.error('Failed to load notas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const criarNota = useCallback(async (input: CreateNotaInput): Promise<Nota | null> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('notas_postit')
        .insert([
          {
            titulo: input.titulo,
            conteudo: input.conteudo || null,
            cor: input.cor,
            prioridade: input.prioridade,
            autor: input.autor,
          },
        ])
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setNotas((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Failed to create nota:', err);
      throw err;
    }
  }, []);

  const atualizarNota = useCallback(async (id: number, input: UpdateNotaInput): Promise<Nota | null> => {
    try {
      const updateData = {
        ...input,
        editado_em: new Date().toISOString(),
      };

      const { data, error: supabaseError } = await supabase
        .from('notas_postit')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setNotas((prev) =>
        prev.map((nota) => (nota.id === id ? data : nota))
      );
      return data;
    } catch (err: any) {
      console.error('Failed to update nota:', err);
      throw err;
    }
  }, []);

  const deletarNota = useCallback(async (id: number): Promise<void> => {
    try {
      const { error: supabaseError } = await supabase
        .from('notas_postit')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setNotas((prev) => prev.filter((nota) => nota.id !== id));
    } catch (err: any) {
      console.error('Failed to delete nota:', err);
      throw err;
    }
  }, []);

  const toggleResolvida = useCallback(async (id: number, resolvida: boolean): Promise<Nota | null> => {
    return atualizarNota(id, { resolvida });
  }, [atualizarNota]);

  useEffect(() => {
    carregarNotas();
  }, [carregarNotas]);

  return {
    notas,
    loading,
    error,
    carregarNotas,
    criarNota,
    atualizarNota,
    deletarNota,
    toggleResolvida,
  };
}

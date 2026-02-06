import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FetchOptions extends RequestInit {
  method?: string;
  body?: any;
}

// Fallback para Edge Function se necessário
async function fetchAPI(endpoint: string, options: FetchOptions = {}) {
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('https://')[1]?.split('.')[0];
  const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!projectId || !publicAnonKey) {
    throw new Error('Supabase credentials not configured');
  }

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-068aaf90`;
  const url = `${API_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  };

  if (options.body && typeof options.body !== 'string') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export function useDashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await fetchAPI('/dashboard/stats');
        setStats(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return { stats, loading, error };
}

export function useTlpData() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchAPI('/tlp');
        setData(result);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load TLP data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const refresh = async () => {
    try {
      const result = await fetchAPI('/tlp');
      setData(result);
    } catch (err: any) {
      console.error('Failed to refresh TLP data:', err);
    }
  };

  return { data, loading, error, refresh };
}

export function useVacancies() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVacancies();
  }, []);

  async function loadVacancies() {
    try {
      setLoading(true);
      const data = await fetchAPI('/vacancies');
      setVacancies(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load vacancies:', err);
    } finally {
      setLoading(false);
    }
  }

  const createVacancy = async (vacancy: any) => {
    try {
      await fetchAPI('/vacancies', {
        method: 'POST',
        body: vacancy,
      });
      await loadVacancies();
    } catch (err: any) {
      console.error('Failed to create vacancy:', err);
      throw err;
    }
  };

  const updateVacancy = async (id: string, updates: any) => {
    try {
      await fetchAPI(`/vacancies/${id}`, {
        method: 'PUT',
        body: updates,
      });
      await loadVacancies();
    } catch (err: any) {
      console.error('Failed to update vacancy:', err);
      throw err;
    }
  };

  return { vacancies, loading, error, createVacancy, updateVacancy, refresh: loadVacancies };
}

export function useRequisitions() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequisitions();
  }, []);

  async function loadRequisitions() {
    try {
      setLoading(true);
      const data = await fetchAPI('/requisitions');
      setRequisitions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load requisitions:', err);
    } finally {
      setLoading(false);
    }
  }

  const createRequisition = async (requisition: any) => {
    try {
      await fetchAPI('/requisitions', {
        method: 'POST',
        body: requisition,
      });
      await loadRequisitions();
    } catch (err: any) {
      console.error('Failed to create requisition:', err);
      throw err;
    }
  };

  const updateRequisition = async (id: string, updates: any) => {
    try {
      await fetchAPI(`/requisitions/${id}`, {
        method: 'PUT',
        body: updates,
      });
      await loadRequisitions();
    } catch (err: any) {
      console.error('Failed to update requisition:', err);
      throw err;
    }
  };

  const approveRequisition = async (id: string) => {
    const requisition = requisitions.find(r => r.id === id);
    if (requisition) {
      await updateRequisition(id, { ...requisition, status: 'aprovado' });
    }
  };

  const rejectRequisition = async (id: string) => {
    const requisition = requisitions.find(r => r.id === id);
    if (requisition) {
      await updateRequisition(id, { ...requisition, status: 'rejeitado' });
    }
  };

  return { 
    requisitions, 
    loading, 
    error, 
    createRequisition, 
    updateRequisition,
    approveRequisition,
    rejectRequisition,
    refresh: loadRequisitions 
  };
}

// Initialize database with sample data
export async function initializeDatabase() {
  try {
    await fetchAPI('/init-data', { method: 'POST' });
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

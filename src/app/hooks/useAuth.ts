import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  nome?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'auth_user';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Recuperar sessão ao montar
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      try {
        setAuthState({
          user: JSON.parse(storedUser),
          loading: false,
          error: null,
        });
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
        setAuthState({
          user: null,
          loading: false,
          error: null,
        });
      }
    } else {
      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
    }
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      // Chamar RPC de login
      let { data, error: rpcError } = await supabase.rpc('login_analista', {
        p_email: email,
        p_senha: senha,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Credenciais inválidas');
      }

      let userData;
      if (Array.isArray(data)) {
        userData = data[0];
      } else {
        userData = data;
      }

      if (!userData || !userData.id) {
        throw new Error('Credenciais inválidas');
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setAuthState({
        user,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer login';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!authState.user?.email) {
        throw new Error('Usuário não autenticado');
      }

      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      // Verificar senha atual
      const { error: verifyError } = await supabase.rpc('login_analista', {
        p_email: authState.user.email,
        p_senha: currentPassword,
      });

      if (verifyError) {
        throw new Error('Senha atual inválida');
      }

      const { error: changeError } = await supabase.rpc('change_password_analista', {
        p_email: authState.user.email,
        p_senha_atual: currentPassword,
        p_senha_nova: newPassword,
      });

      if (changeError) {
        throw new Error(changeError.message);
      }

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: null,
      }));

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao alterar senha';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState({
      user: null,
      loading: false,
      error: null,
    });
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    changePassword,
    isAuthenticated: !!authState.user,
  };
}

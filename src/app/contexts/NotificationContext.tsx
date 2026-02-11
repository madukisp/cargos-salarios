import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  tipo: 'demissao' | 'afastamento';
  titulo: string;
  mensagem: string;
  funcionario: string;
  cargo: string;
  data: string;
  timestamp: number;
}

interface NotificationContextType {
  notificacoes: Notification[];
  totalNaoLidas: number;
  adicionarNotificacao: (notif: Omit<Notification, 'id' | 'timestamp'>) => void;
  marcarComoLida: (id: string) => void;
  limparNotificacoes: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notification[]>([]);
  const [notificacoesLidas, setNotificacoesLidas] = useState<Set<string>>(new Set());

  const totalNaoLidas = notificacoes.filter(n => !notificacoesLidas.has(n.id)).length;

  const adicionarNotificacao = useCallback((notif: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const novaNotif: Notification = {
      ...notif,
      id,
      timestamp: Date.now(),
    };

    setNotificacoes(prev => [novaNotif, ...prev].slice(0, 50)); // Manter últimas 50

    // Auto-limpar notificação após 8 segundos
    setTimeout(() => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, 8000);
  }, []);

  const marcarComoLida = useCallback((id: string) => {
    setNotificacoesLidas(prev => new Set([...prev, id]));
  }, []);

  const limparNotificacoes = useCallback(() => {
    setNotificacoes([]);
    setNotificacoesLidas(new Set());
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notificacoes,
        totalNaoLidas,
        adicionarNotificacao,
        marcarComoLida,
        limparNotificacoes,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
}

import { useState } from 'react';
import { X, Trash2, RotateCcw } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { obterCoresPorTipo, obterUltimasVagas } from '../services/notificationService';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VagaDebug {
  id_evento: number;
  nome: string;
  tipo: 'demissao' | 'afastamento';
  cargo: string;
  centro_custo: string;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notificacoes, marcarComoLida, limparNotificacoes } = useNotifications();
  const [notificacoesLidas, setNotificacoesLidas] = useState<Set<string>>(new Set());
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [ultimasVagas, setUltimasVagas] = useState<VagaDebug[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  if (!isOpen) return null;

  const handleMarcarComoLida = (id: string) => {
    marcarComoLida(id);
    setNotificacoesLidas(prev => new Set([...prev, id]));
  };

  const ordenadasPorData = [...notificacoes].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-16 right-6 w-96 max-h-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Notificações
            {notificacoes.length > 0 && (
              <span className="ml-2 inline-block bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {notificacoes.length}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {mostrarHistorico ? (
            // Modo Histórico
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {ultimasVagas.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm">Nenhuma vaga detectada ainda</p>
                </div>
              ) : (
                ultimasVagas.map((vaga) => {
                  const cores = obterCoresPorTipo(vaga.tipo);
                  return (
                    <div
                      key={`${vaga.tipo}-${vaga.id_evento}`}
                      className={`p-3 ${cores.bg} border-l-4 ${cores.border}`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="text-2xl">
                          {vaga.tipo === 'demissao' ? '🔴' : '🟡'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${cores.text}`}>
                            {vaga.tipo === 'demissao' ? 'Demissão' : 'Afastamento'}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                            <span className="font-medium">{vaga.nome}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {vaga.cargo && <span>{vaga.cargo}</span>}
                            {vaga.cargo && vaga.centro_custo && <span> • </span>}
                            {vaga.centro_custo && <span>{vaga.centro_custo}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">Nenhuma notificação no momento</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {ordenadasPorData.map(notif => {
                const cores = obterCoresPorTipo(notif.tipo);
                const jáLida = notificacoesLidas.has(notif.id);

                return (
                  <div
                    key={notif.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      jáLida
                        ? 'bg-slate-50 dark:bg-slate-900/30'
                        : `${cores.bg} border-l-4 ${cores.border}`
                    }`}
                    onClick={() => handleMarcarComoLida(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${cores.text}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          <span className="font-medium">{notif.funcionario}</span>
                          {notif.cargo && (
                            <span className="text-slate-500 dark:text-slate-400">
                              {' '}• {notif.cargo}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {notif.data}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2">
          {notificacoes.length > 0 && (
            <button
              onClick={() => {
                limparNotificacoes();
                setNotificacoesLidas(new Set());
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpar notificações
            </button>
          )}
          <button
            onClick={async () => {
              if (!mostrarHistorico) {
                setCarregandoHistorico(true);
                const vagas = await obterUltimasVagas(5);
                setUltimasVagas(vagas);
                setCarregandoHistorico(false);
              }
              setMostrarHistorico(!mostrarHistorico);
            }}
            disabled={carregandoHistorico}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
            title="Ver últimas 5 vagas detectadas para teste"
          >
            <RotateCcw className={`w-4 h-4 ${carregandoHistorico ? 'animate-spin' : ''}`} />
            {carregandoHistorico ? 'Carregando...' : mostrarHistorico ? 'Ocultar Histórico' : 'Ver Histórico de Teste'}
          </button>
        </div>
      </div>
    </>
  );
}

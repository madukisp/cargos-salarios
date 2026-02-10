import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Calendar,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  AlertCircle,
  Briefcase,
  Trash2,
  X,
} from 'lucide-react';
import { useAgendaAnalistas } from '@/app/hooks/useAgendaAnalistas';
import { formatarData } from '@/lib/column-formatters';
import { AnalistaComVagas, VagaAtribuida } from '@/app/services/agendaAnalistasService';
import { VagaDetalhesModal } from './VagaDetalhesModal';

const FILTROS_STORAGE_KEY = 'agenda_analistas_filtros';

interface FiltrosSalvos {
  analista?: string;
  status?: string;
  busca?: string;
}

const carregarFiltros = (): FiltrosSalvos | null => {
  try {
    const saved = localStorage.getItem(FILTROS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const salvarFiltros = (filtros: FiltrosSalvos) => {
  try {
    localStorage.setItem(FILTROS_STORAGE_KEY, JSON.stringify(filtros));
  } catch {
    // Ignora erro
  }
};

function getStatusBadge(diasEmAberto: number) {
  if (diasEmAberto > 30) {
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '🔴 Crítico', valor: 'critico' };
  } else if (diasEmAberto >= 15) {
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: '🟡 Atenção', valor: 'atencao' };
  } else {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: '🟢 Normal', valor: 'normal' };
  }
}

export function AgendaAnalistas() {
  const {
    analistas,
    loading,
    error,
    carregarDados,
    removerVaga,
    totalAnalistas,
    totalVagas,
    totalVagasEmAberto,
    totalVagasCriticas,
  } = useAgendaAnalistas();

  // Filtros salvos
  const filtrosSalvos = useMemo(() => carregarFiltros(), []);

  // Estados
  const [buscaAnalista, setBuscaAnalista] = useState<string>(filtrosSalvos?.analista ?? '');
  const [statusFiltro, setStatusFiltro] = useState<string>(filtrosSalvos?.status ?? 'todos');
  const [busca, setBusca] = useState<string>(filtrosSalvos?.busca ?? '');
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [vagaSelecionada, setVagaSelecionada] = useState<(VagaAtribuida & { nomeAnalista: string; cargoAnalista: string }) | null>(null);

  const handleSalvarFiltros = (filtros: FiltrosSalvos) => {
    salvarFiltros(filtros);
  };

  const toggleExpandir = (id: number) => {
    const novoExpandidos = new Set(expandidos);
    if (novoExpandidos.has(id)) {
      novoExpandidos.delete(id);
    } else {
      novoExpandidos.add(id);
    }
    setExpandidos(novoExpandidos);
  };

  const handleRemoverVaga = async (idEvento: number, idAnalista: number) => {
    const key = `${idAnalista}-${idEvento}`;
    setRemovendo(key);
    try {
      await removerVaga(idEvento, idAnalista);
    } finally {
      setRemovendo(null);
    }
  };

  // Filtrar analistas
  const analistasFiltrados = useMemo(() => {
    let result = analistas;

    // Filtro por nome do analista
    if (buscaAnalista.trim()) {
      result = result.filter(a =>
        a.nome.toLowerCase().includes(buscaAnalista.toLowerCase())
      );
    }

    // Filtro por status das vagas
    if (statusFiltro !== 'todos') {
      result = result.map(a => ({
        ...a,
        vagas: a.vagas.filter(v => {
          const statusVaga = getStatusBadge(v.dias_em_aberto).valor;
          return statusVaga === statusFiltro;
        }),
      }));
      result = result.filter(a => a.vagas.length > 0);
    }

    // Filtro por texto (busca em vagas)
    if (busca.trim()) {
      result = result.map(a => ({
        ...a,
        vagas: a.vagas.filter(v =>
          v.nome_funcionario.toLowerCase().includes(busca.toLowerCase()) ||
          v.cargo_vaga.toLowerCase().includes(busca.toLowerCase()) ||
          v.lotacao.toLowerCase().includes(busca.toLowerCase())
        ),
      }));
      result = result.filter(a => a.vagas.length > 0);
    }

    return result;
  }, [analistas, buscaAnalista, statusFiltro, busca]);

  // Atualizar filtros salvos quando mudam
  const handleBuscaAnalistaChange = (valor: string) => {
    setBuscaAnalista(valor);
    handleSalvarFiltros({ analista: valor, status: statusFiltro, busca });
  };

  const handleStatusFiltroChange = (valor: string) => {
    setStatusFiltro(valor);
    handleSalvarFiltros({ analista: buscaAnalista, status: valor, busca });
  };

  const handleBuscaChange = (valor: string) => {
    setBusca(valor);
    handleSalvarFiltros({ analista: buscaAnalista, status: statusFiltro, busca: valor });
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-300">Erro ao carregar agenda</h3>
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={carregarDados}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Agenda dos Analistas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Acompanhamento de vagas por analista
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Analistas</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {totalAnalistas}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Vagas Total</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {totalVagas}
                </p>
              </div>
              <Briefcase className="w-12 h-12 text-slate-200 dark:text-slate-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Em Aberto</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {totalVagasEmAberto}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-amber-200 dark:text-amber-900" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Críticas</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {totalVagasCriticas}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-200 dark:text-red-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por Analista */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Analista
              </label>
              <Input
                placeholder="Buscar analista..."
                value={buscaAnalista}
                onChange={(e) => handleBuscaAnalistaChange(e.target.value)}
                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            </div>

            {/* Filtro por Status */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status da Vaga
              </label>
              <Select value={statusFiltro} onValueChange={handleStatusFiltroChange}>
                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="critico">🔴 Crítico (&gt;30 dias)</SelectItem>
                  <SelectItem value="atencao">🟡 Atenção (15-30 dias)</SelectItem>
                  <SelectItem value="normal">🟢 Normal (&lt;15 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Busca em Vagas */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Buscar vaga
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Nome, cargo, lotação..."
                  value={busca}
                  onChange={(e) => handleBuscaChange(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      ) : analistasFiltrados.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Nenhum resultado
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {analistas.length === 0
                ? 'Nenhum analista com vagas atribuídas'
                : 'Nenhum analista corresponde aos filtros selecionados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {analistasFiltrados.map((analista) => (
            <Card
              key={analista.id}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Header do Analista */}
              <div
                onClick={() => toggleExpandir(analista.id)}
                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  <button className="text-slate-400 dark:text-slate-500">
                    {expandidos.has(analista.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      👤 {analista.nome}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {analista.cargo}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                      {analista.totalVagas} vaga{analista.totalVagas !== 1 ? 's' : ''}
                    </Badge>
                    {analista.vagasCriticas > 0 && (
                      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                        {analista.vagasCriticas} crítica{analista.vagasCriticas !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Conteúdo Expansível */}
              {expandidos.has(analista.id) && (
                <CardContent className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                  {analista.vagas.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                      Nenhuma vaga corresponde aos filtros
                    </p>
                  ) : (
                    analista.vagas.map((vaga) => {
                      const statusBadge = getStatusBadge(vaga.dias_em_aberto);
                      const key = `${analista.id}-${vaga.id_evento}`;
                      const isRemoving = removendo === key;

                      return (
                        <div
                          key={vaga.id_evento}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700/50"
                          onClick={() => setVagaSelecionada({ ...vaga, nomeAnalista: analista.nome, cargoAnalista: analista.cargo })}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                    {vaga.nome_funcionario}
                                  </h4>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {vaga.cargo_vaga}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600">
                                      📍 {vaga.lotacao}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${statusBadge.bg} ${statusBadge.text} border-0`}
                                    >
                                      {statusBadge.label} • {vaga.dias_em_aberto}d
                                    </Badge>
                                    {vaga.vaga_preenchida && (
                                      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700">
                                        ✓ Preenchida
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                    Atribuída em: {formatarData(vaga.data_atribuicao)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoverVaga(vaga.id_evento, analista.id)}
                              disabled={isRemoving}
                              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Remover atribuição"
                            >
                              {isRemoving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {vagaSelecionada && (
        <VagaDetalhesModal
          vaga={vagaSelecionada}
          onClose={() => setVagaSelecionada(null)}
        />
      )}
    </div>
  );
}

import { Search, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, Loader2, Users, Calendar, AlertCircle, TrendingUp, UserX, UserCheck, ChevronsUpDown, Check, UserPlus, Archive, ArchiveRestore, Trash2, Copy, SearchX, Undo2, X, Pencil } from 'lucide-react';
import { Badge } from './ui/badge';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useGestaoVagas } from '@/app/hooks/useGestaoVagas';
import { useFantasiaFilter } from '@/app/hooks/useFantasiaFilter';
import { buscarFuncionarioPorCpf, buscarFuncionarioPorNome, buscarSugestoesSubstitutos, excluirVagaMovimentacao, salvarResposta, VagaDerivada } from '@/app/services/demissoesService';
import { buscarRegistrosBIByNome, normBI } from '@/app/services/baseBiService';
import { FuncionarioProfile } from './FuncionarioProfile';
import { useTlpData } from '@/app/hooks/useTlpData';
import { StatusBadge } from './StatusBadge';
import { formatarData, parseBrazilianDateToISO } from '@/lib/column-formatters';
import { AtribuirVagaModal } from './AtribuirVagaModal';
import { NovaVagaMovimentacaoModal } from './NovaVagaMovimentacaoModal';
import { BiTooltipCard } from './BiTooltipCard';

const FILTROS_STORAGE_KEY = 'vacancy_management_filtros';

const CONTRATOS_SP = [
  'SBCD - PAI ZN',
  'SBCD - CORPORATIVO',
  'SBCD - AME CRI ZN',
  'SBCD - REDE ASSIST. NORTE-SP'
];

interface FiltrosSalvos {
  abaSelecionada?: string;
  lotacao?: string;
  ordenacao?: string;
  busca?: string;
  apenasContratosSP?: boolean;
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

export function VacancyManagement() {
  // Hook Supabase
  const {
    demissoesPendentes,
    demissoesRespondidas,
    vagasPendentesEfetivacao,
    afastamentosPendentes,
    vagasEmAberto: vagasEmAbertoFromHook,
    vagasNaoEncontradas: vagasNaoEncontradasFromHook,
    respostas,
    vagasDerivadas = {} as Record<number, VagaDerivada[]>,
    lotacoes: lotacoesFromHook,
    loading,
    error,
    carregarDados,
    responder,
    efetivar,
    vagasArquivadas,
    arquivar,
    marcarNaoEncontrada,
  } = useGestaoVagas() as any;

  const { data: tlpData, updateTlp, loadData: loadTlpData } = useTlpData();
  const [updatingTlp, setUpdatingTlp] = useState<string | null>(null);
  const [erroFechamento, setErroFechamento] = useState<number | null>(null);
  const [erroSalvar, setErroSalvar] = useState<Record<number, string>>({});

  const {
    fantasias,
    selectedFantasia,
    setSelectedFantasia,
  } = useFantasiaFilter();

  // Filtros salvos
  const filtrosSalvos = useMemo(() => carregarFiltros(), []);

  // Estados
  const [abaSelecionada, setAbaSelecionada] = useState<string>(() => {
    const aba = filtrosSalvos?.abaSelecionada;
    // Aba 'busca' só existe com busca ativa — não restaurar ela
    return (!aba || aba === 'busca') ? 'pendentes' : aba;
  });
  const [lotacao, setLotacao] = useState<string>(filtrosSalvos?.lotacao ?? 'TODAS');
  const [ordenacao, setOrdenacao] = useState<string>(
    filtrosSalvos?.ordenacao ?? 'data_evento.desc'
  );
  // Não restaurar busca do localStorage para evitar estado inconsistente
  const [busca, setBusca] = useState<string>('');
  const [apenasContratosSP, setApenasContratosSP] = useState<boolean>(
    filtrosSalvos?.apenasContratosSP ?? false
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [respondendo, setRespondendo] = useState<{ [key: number]: boolean }>({});
  const [formData, setFormData] = useState<{ [key: number]: any }>({});

  // Perfil do Colaborador
  const [selectedProfileFunc, setSelectedProfileFunc] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Atribuição de Vaga
  const [selectedVagaForAtribuicao, setSelectedVagaForAtribuicao] = useState<any | null>(null);
  const [modalMovimentacaoOpen, setModalMovimentacaoOpen] = useState(false);

  const handleAtribuirVaga = (vaga: any) => {
    setSelectedVagaForAtribuicao(vaga);
  };

  // Filtros de tempo — apenas 2025 em diante
  const years = ['2025', '2026'];
  const months = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ];
  const [selectedYear, setSelectedYear] = useState<string>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('TODOS');

  // Inicializar o formData com respostas existentes
  useEffect(() => {
    const newFormData = { ...formData };
    let changed = false;
    Object.keys(respostas).forEach(id => {
      const idNum = Number(id);
      if (!newFormData[idNum]) {
        newFormData[idNum] = { ...respostas[idNum] };
        changed = true;
      }
    });
    if (changed) setFormData(newFormData);
  }, [respostas]);

  // Função auxiliar para atualizar formData com segurança
  const updateFormDataMap = (idEvento: number, updates: any) => {
    setFormData((prev) => ({
      ...prev,
      [idEvento]: { ...(prev[idEvento] || {}), ...updates },
    }));
  };

  // Salvar filtros (exceto busca, que não deve persistir entre sessões)
  useEffect(() => {
    salvarFiltros({
      abaSelecionada: abaSelecionada === 'busca' ? 'pendentes' : abaSelecionada,
      lotacao,
      ordenacao,
      busca: '',
      apenasContratosSP,
    });
  }, [abaSelecionada, lotacao, ordenacao, busca, apenasContratosSP]);

  // Carregar dados ao montar e quando filtros mudarem
  useEffect(() => {
    carregarDados(lotacao === 'TODAS' ? undefined : lotacao, selectedFantasia);
  }, [lotacao, selectedFantasia, carregarDados]);

  // Carregar TLP ao montar
  useEffect(() => {
    loadTlpData();
  }, [loadTlpData]);

  // Usar lotações do hook quando carregarem
  const lotacoes = lotacoesFromHook;

  // Aplicar filtro de data — filtra dados de 2025 em diante
  // Usa data_abertura_vaga se existir (na resposta ou no objeto), senão usa data_evento
  const applyDateFilter = useCallback((data: any[]) => {
    return data.filter((item) => {
      const dataReferencia = item.data_abertura_vaga
        || respostas[item.id_evento]?.data_abertura_vaga
        || item.data_evento;

      if (!dataReferencia) return false;

      const eventDate = new Date(dataReferencia);
      const year = String(eventDate.getFullYear());
      const month = String(eventDate.getMonth() + 1);

      // Filtro obrigatório: apenas 2025 em diante
      const year2025OrLater = parseInt(year) >= 2025;
      if (!year2025OrLater) return false;

      // Filtros opcionais: ano e mês selecionados
      const matchYear = selectedYear === 'TODOS' || year === selectedYear;
      const matchMonth = selectedMonth === 'TODOS' || month === selectedMonth;

      return matchYear && matchMonth;
    });
  }, [selectedYear, selectedMonth, respostas]);

  // Filtrar dados
  const filtrarVagas = useCallback(
    (vagas: any[], tlpData: any[] | null, fantasias: any[] | null) => {
      if (!vagas || !Array.isArray(vagas)) return [];
      return vagas.filter((vaga) => {
        if (!vaga) return false;
        const matchLotacao = lotacao === 'TODAS' || vaga.lotacao === lotacao;

        // Busca por texto em nome, cargo, lotação
        let matchBusca = true;
        if (busca.trim()) {
          const buscaLower = busca.toLowerCase();
          if (/^\d+$/.test(busca)) {
            const numeroBusca = parseInt(busca, 10);
            matchBusca = vaga.id_evento === numeroBusca;
          } else {
            // Senão, buscar por texto em nome, cargo, lotação
            matchBusca =
              (vaga.cargo?.toLowerCase() || '').includes(buscaLower) ||
              (vaga.nome?.toLowerCase() || '').includes(buscaLower) ||
              (vaga.lotacao?.toLowerCase() || '').includes(buscaLower) ||
              (vaga.centro_custo?.toLowerCase() || '').includes(buscaLower) ||
              (vaga.quem_saiu?.toLowerCase() || '').includes(buscaLower);
          }
        }

        // Filtrar por contrato selecionado
        const matchContrato = selectedFantasia === 'todos' || vaga.cnpj === selectedFantasia;

        // Replicar a lógica de nomeContrato aqui
        let nomeContratoAtual: string | null = null;
        const tlpEntry = tlpData?.find(t =>
          t.cargo.toLowerCase().trim() === vaga.cargo?.toLowerCase().trim() &&
          (t.centro_custo.toLowerCase().trim() === vaga.lotacao?.toLowerCase().trim() ||
            t.unidade.toLowerCase().trim() === vaga.lotacao?.toLowerCase().trim())
        );

        if (tlpEntry?.unidade) {
          nomeContratoAtual = tlpEntry.unidade;
        } else if (vaga.cnpj && fantasias) {
          const f = (fantasias as any[]).find(item => item.cnpj === vaga.cnpj);
          if (f) nomeContratoAtual = f.display_name || f.nome_fantasia;
        }

        const matchContratosSP = apenasContratosSP
          ? (nomeContratoAtual && CONTRATOS_SP.includes(nomeContratoAtual)) || false
          : true;

        return matchLotacao && matchBusca && matchContrato && matchContratosSP;
      });
    },
    [lotacao, busca, apenasContratosSP, selectedFantasia, CONTRATOS_SP, tlpData, fantasias]
  );

  // Ordenação genérica
  const ordenarVagas = useCallback((data: any[]) => {
    if (ordenacao === 'data_evento.desc') {
      data.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());
    } else if (ordenacao === 'data_evento.asc') {
      data.sort((a, b) => new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime());
    } else if (ordenacao === 'cargo.asc') {
      data.sort((a, b) => (a.cargo || '').localeCompare(b.cargo || ''));
    } else if (ordenacao === 'nome.asc') {
      data.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }
    return data;
  }, [ordenacao]);

  // Dados filtrados
  const pendentes = useMemo(() => applyDateFilter(ordenarVagas(filtrarVagas(demissoesPendentes, tlpData, fantasias))), [filtrarVagas, ordenarVagas, demissoesPendentes, tlpData, fantasias, applyDateFilter]);
  const respondidas = useMemo(() => applyDateFilter(ordenarVagas(filtrarVagas(demissoesRespondidas, tlpData, fantasias))), [filtrarVagas, ordenarVagas, demissoesRespondidas, tlpData, fantasias, applyDateFilter]);
  const pendentesEf = useMemo(() => applyDateFilter(ordenarVagas(filtrarVagas(vagasPendentesEfetivacao, tlpData, fantasias))), [filtrarVagas, ordenarVagas, vagasPendentesEfetivacao, tlpData, fantasias, applyDateFilter]);
  const afastamentos = useMemo(() => applyDateFilter(ordenarVagas(filtrarVagas(afastamentosPendentes, tlpData, fantasias))), [filtrarVagas, ordenarVagas, afastamentosPendentes, tlpData, fantasias, applyDateFilter]);

  // Filtrar vagasEmAberto com busca, contrato, filtro SP e filtro de data
  const vagasEmAberto = useMemo(() => {
    const normalize = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return vagasEmAbertoFromHook.filter((vaga: any) => {
      // Busca por texto
      let matchBusca = true;
      if (busca.trim()) {
        if (/^\d+$/.test(busca)) {
          const numeroBusca = parseInt(busca, 10);
          matchBusca = vaga.id_evento === numeroBusca;
        } else {
          // Senão, buscar por texto normalizado
          const termoBusca = normalize(busca);
          matchBusca =
            normalize(vaga.cargo_saiu || '').includes(termoBusca) ||
            normalize(vaga.quem_saiu || '').includes(termoBusca) ||
            normalize(vaga.centro_custo || '').includes(termoBusca);
        }
      }
      const matchContrato = selectedFantasia === 'todos' || vaga.cnpj === selectedFantasia;
      let nomeContratoAtual: string | null = null;
      if (vaga.cnpj && fantasias) {
        const f = (fantasias as any[]).find(item => item.cnpj === vaga.cnpj);
        if (f) nomeContratoAtual = f.display_name || f.nome_fantasia;
      }
      const matchContratosSP = apenasContratosSP
        ? (nomeContratoAtual && CONTRATOS_SP.includes(nomeContratoAtual)) || false
        : true;
      // Filtro de data: usa a mesma data exibida no card
      let matchData = true;
      if (selectedYear !== 'TODOS' || selectedMonth !== 'TODOS') {
        const dataRef = vaga.data_abertura_vaga || vaga.data_evento;
        if (!dataRef) {
          matchData = false;
        } else {
          const date = new Date(dataRef);
          const yearStr = String(date.getFullYear());
          const monthStr = String(date.getMonth() + 1);
          matchData =
            (selectedYear === 'TODOS' || yearStr === selectedYear) &&
            (selectedMonth === 'TODOS' || monthStr === selectedMonth);
        }
      }
      return matchBusca && matchContrato && matchContratosSP && matchData;
    });
  }, [vagasEmAbertoFromHook, busca, selectedFantasia, apenasContratosSP, fantasias, CONTRATOS_SP, selectedYear, selectedMonth]);

  // Vagas efetivamente preenchidas
  const vagasFechadas = useMemo(() => {
    return respondidas.filter((vaga: any) => {
      const resp = respostas[vaga.id_evento];
      return resp?.vaga_preenchida === 'SIM';
    });
  }, [respondidas, respostas]);

  // Respondidos onde não houve abertura de vaga (abriu_vaga=false ou null) - NÃO preenchida
  const vagasSemAbertura = useMemo(() => {
    return respondidas.filter((vaga: any) => {
      const resp = respostas[vaga.id_evento];
      const abriuVaga = resp?.abriu_vaga === true;
      const vagaPreenchida = resp?.vaga_preenchida === 'SIM';
      return !abriuVaga && !vagaPreenchida;
    });
  }, [respondidas, respostas]);

  // Respondidos que abriram vaga mas ainda não foram preenchidos → "Vagas em Aberto"
  // Exclui os que já aparecem em vagasEmAberto (view) para evitar duplicação
  const afastamentosEmAberto = useMemo(() => {
    const idsNaView = new Set(vagasEmAberto.map((v: any) => v.id_evento));
    return respondidas.filter((v: any) => {
      const resp = respostas[v.id_evento];
      return resp?.abriu_vaga === true && resp?.vaga_preenchida !== 'SIM' && !idsNaView.has(v.id_evento);
    });
  }, [respondidas, respostas, vagasEmAberto]);

  const arquivadasFiltradas = useMemo(
    () => applyDateFilter(ordenarVagas(filtrarVagas(vagasArquivadas, tlpData, fantasias))),
    [filtrarVagas, ordenarVagas, vagasArquivadas, tlpData, fantasias, applyDateFilter]
  );

  const naoEncontradasFiltradas = useMemo(
    () => applyDateFilter(ordenarVagas(filtrarVagas(vagasNaoEncontradasFromHook, tlpData, fantasias))),
    [filtrarVagas, ordenarVagas, vagasNaoEncontradasFromHook, tlpData, fantasias, applyDateFilter]
  );

  // Verificar se há busca ativa
  const temBuscaAtiva = busca.trim().length > 0;

  // Agregar todos os resultados quando há busca
  const todosResultadosBusca = useMemo(() => {
    if (!temBuscaAtiva) return [];
    return [...pendentes, ...afastamentos, ...pendentesEf, ...vagasEmAberto, ...afastamentosEmAberto, ...vagasFechadas, ...arquivadasFiltradas, ...naoEncontradasFiltradas];
  }, [temBuscaAtiva, pendentes, afastamentos, pendentesEf, vagasEmAberto, afastamentosEmAberto, vagasFechadas, arquivadasFiltradas]);



  const handleResponder = async (idEvento: number, tipoOrigem: 'DEMISSAO' | 'AFASTAMENTO') => {
    let dados = formData[idEvento] || {};
    // Se tem data de abertura, abriu_vaga deve ser true (data implica abertura)
    if (dados.data_abertura_vaga && !dados.abriu_vaga) {
      dados = { ...dados, abriu_vaga: true };
      updateFormDataMap(idEvento, { abriu_vaga: true });
    }
    if (dados.abriu_vaga === undefined || dados.abriu_vaga === null) {
      setErroSalvar(prev => ({ ...prev, [idEvento]: 'Informe se a vaga foi aberta para substituição antes de salvar.' }));
      return;
    }
    if (dados.abriu_vaga === true && !dados.data_abertura_vaga) {
      setErroFechamento(idEvento);
      return;
    }
    if (dados.vaga_preenchida === 'SIM' && !dados.data_fechamento_vaga) {
      setErroFechamento(idEvento);
      return;
    }
    if (dados.data_abertura_vaga && dados.data_fechamento_vaga) {
      if (new Date(dados.data_fechamento_vaga) < new Date(dados.data_abertura_vaga)) {
        setErroSalvar(prev => ({ ...prev, [idEvento]: 'A data de fechamento não pode ser anterior à data de abertura da vaga.' }));
        return;
      }
    }
    setErroFechamento(null);
    setErroSalvar(prev => { const n = { ...prev }; delete n[idEvento]; return n; });
    setRespondendo((prev) => ({ ...prev, [idEvento]: true }));
    try {
      await responder(idEvento, tipoOrigem, dados);
      setExpandedId(null);
      // Resetar filtro de data para garantir que a vaga salva apareça na aba correta
      setSelectedYear('TODOS');
      setSelectedMonth('TODOS');
      // Navegar para a aba correta após salvar
      if (dados.pendente_efetivacao === true) {
        // Se está com pendente de efetivação, fica em pendentes_ef
        setAbaSelecionada('pendentes_ef');
      } else if (dados.vaga_preenchida === 'SIM') {
        setAbaSelecionada('fechadas');
      } else if (dados.abriu_vaga === true && dados.vaga_preenchida !== 'SIM') {
        setAbaSelecionada('respondidas');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.';
      setErroSalvar(prev => ({ ...prev, [idEvento]: msg }));
      console.error('Erro ao salvar resposta:', err);
    } finally {
      setRespondendo((prev) => ({ ...prev, [idEvento]: false }));
    }
  };

  const handleEfetivar = async (idEvento: number, tipo: 'DEMISSAO' | 'AFASTAMENTO') => {
    setRespondendo((prev) => ({ ...prev, [idEvento]: true }));
    try {
      await efetivar(idEvento, tipo);
      setExpandedId(null);
    } catch (err) {
      console.error('Erro ao efetivar:', err);
    } finally {
      setRespondendo((prev) => ({ ...prev, [idEvento]: false }));
    }
  };

  const handleUpdateTlpValue = async (cargo: string, lotacao: string, id: number | undefined, newValue: number) => {
    const key = `${cargo}-${lotacao}`;
    try {
      setUpdatingTlp(key);
      await updateTlp(id, cargo, lotacao, newValue);
    } catch (err) {
      console.error('Erro ao atualizar TLP:', err);
      alert('Erro ao atualizar o quadro necessário no banco.');
    } finally {
      setUpdatingTlp(null);
    }
  };

  const handleArquivar = async (idEvento: number, tipo: 'DEMISSAO' | 'AFASTAMENTO', status: boolean) => {
    try {
      await arquivar(idEvento, tipo, status);
      setExpandedId(null);
    } catch (err) {
      console.error('Erro ao arquivar:', err);
    }
  };

  const handleMarcarNaoEncontrada = async (idEvento: number, tipo: 'DEMISSAO' | 'AFASTAMENTO', status: boolean, observacao?: string) => {
    try {
      await marcarNaoEncontrada(idEvento, tipo, status, observacao);
    } catch (err) {
      console.error('Erro ao marcar vaga:', err);
    }
  };

  const handleExcluirMovimentacao = async (id: number) => {
    try {
      await excluirVagaMovimentacao(id);
      await carregarDados(lotacao === 'TODAS' ? undefined : lotacao, selectedFantasia);
    } catch (err) {
      console.error('Erro ao excluir vaga de movimentação:', err);
    }
  };

  const handleEditarEvento = async (
    idEvento: number,
    tipoOrigem: 'DEMISSAO' | 'AFASTAMENTO',
    dados: { data_abertura_vaga?: string; data_fechamento_vaga?: string; nome_candidato?: string; id_evento_mae?: number | null }
  ) => {
    const respostaAtual = respostas[idEvento] || {};
    await salvarResposta(idEvento, tipoOrigem, {
      ...respostaAtual,
      ...dados,
      abriu_vaga: respostaAtual.abriu_vaga ?? true,
    });
    await carregarDados(lotacao === 'TODAS' ? undefined : lotacao, selectedFantasia);
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Gestão de Vagas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Acompanhamento e controle de respostas pendentes
          </p>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Demissões</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendentes.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-indigo-50/50 dark:bg-indigo-900/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Afastamentos</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{afastamentos.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Efetivação</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendentesEf.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Crítico (+30d)</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {[...pendentes, ...afastamentos].filter(v => (v.dias_em_aberto || 0) > 30).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Contrato */}
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Empresa / Contrato</Label>
              <Select value={selectedFantasia} onValueChange={setSelectedFantasia}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Contratos</SelectItem>
                  {fantasias
                    .filter((f: any) => !apenasContratosSP || CONTRATOS_SP.some(sp => f.display_name?.includes(sp) || f.nome_fantasia?.includes(sp)))
                    .map((f: any) => (
                      <SelectItem key={f.cnpj} value={f.cnpj}>
                        {f.display_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Busca */}
            <div className="md:col-span-1 lg:col-span-1">
              <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block flex items-center gap-1">
                <Search className="w-3 h-3" /> Buscar Vaga ou Funcionário
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                <Input
                  type="text"
                  placeholder="Ex: ID 10234, Resposta 1154, João Silva, Médico..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 pr-10 h-10 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {busca && (
                  <button
                    onClick={() => setBusca('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lotação */}
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Unidade / Lotação</Label>
              <Select value={lotacao} onValueChange={setLotacao}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lotacoes.map((l: any) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ano */}
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Anos</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mês */}
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Meses</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ordenação */}
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Ordenar por</Label>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data_evento.desc">Mais Recentes</SelectItem>
                  <SelectItem value="data_evento.asc">Mais Antigos</SelectItem>
                  <SelectItem value="cargo.asc">Alfabética (Cargo)</SelectItem>
                  <SelectItem value="nome.asc">Alfabética (Nome)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-4">
            <Checkbox
              id="contratos-sp"
              checked={apenasContratosSP}
              onCheckedChange={(checked) => setApenasContratosSP(checked as boolean)}
            />
            <Label htmlFor="contratos-sp" className="text-sm cursor-pointer font-medium text-blue-600 dark:text-blue-400">
              Exibir apenas contratos de SP (ZN/Norte)
            </Label>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setModalMovimentacaoOpen(true)}
              className="inline-flex items-center gap-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-4 py-2.5 leading-5"
            >
              <UserPlus size={16} />
              Abrir Vaga de Movimentação
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white/50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-slate-600 dark:text-slate-400 font-medium">Carregando eventos...</span>
        </div>
      ) : (
        <>
          {/* Abas */}
          <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
            <TabsList className="flex w-full overflow-x-auto justify-start border-b border-slate-200 dark:border-slate-800 bg-transparent rounded-none h-auto p-0 gap-6 mb-8">
              {temBuscaAtiva && (
                <TabsTrigger
                  value="busca"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold"
                >
                  🔍 Resultados ({todosResultadosBusca.length})
                </TabsTrigger>
              )}
              <TabsTrigger
                value="pendentes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold"
              >
                Demissões Pendentes ({pendentes.length})
              </TabsTrigger>
              <TabsTrigger
                value="afastamentos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold"
              >
                Afastamentos ({afastamentos.length})
              </TabsTrigger>
              <TabsTrigger
                value="respondidas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold"
              >
                Vagas em Aberto ({vagasEmAberto.length + afastamentosEmAberto.length})
              </TabsTrigger>
              <TabsTrigger
                value="pendentes_ef"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold"
              >
                Pendente Efetivação ({pendentesEf.length})
              </TabsTrigger>
              <TabsTrigger
                value="fechadas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold"
              >
                Vagas Fechadas ({vagasFechadas.length + vagasSemAbertura.length})
              </TabsTrigger>
              <TabsTrigger
                value="arquivadas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold flex items-center gap-2"
              >
                <Archive size={14} /> Canceladas ({arquivadasFiltradas.length})
              </TabsTrigger>

              <TabsTrigger
                value="nao_encontradas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold flex items-center gap-2"
              >
                <SearchX size={14} /> Não Encontradas ({naoEncontradasFiltradas.length})
              </TabsTrigger>

            </TabsList>

            <TabsContent value="pendentes" className="space-y-3 mt-0 focusVisible:outline-none">
              {pendentes.length === 0 ? (
                <EmptyState icon={Users} title="Nenhuma demissão pendente" description="Não há registros de demissões que aguardam resposta nesta unidade ou filtro." />
              ) : (
                pendentes.map((vaga) => (
                  <VagaCard
                    key={vaga.id_evento}
                    vaga={vaga}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    abaSelecionada={abaSelecionada}
                    respostas={respostas}
                    formData={formData}
                    updateFormDataMap={updateFormDataMap}
                    tlpData={tlpData}
                    fantasias={fantasias}
                    loadingProfile={loadingProfile}
                    setLoadingProfile={setLoadingProfile}
                    setSelectedProfileFunc={setSelectedProfileFunc}
                    handleResponder={handleResponder}
                    handleEfetivar={handleEfetivar}
                    respondendo={respondendo}
                    handleUpdateTlpValue={handleUpdateTlpValue}
                    updatingTlp={updatingTlp}
                    onAtribuir={handleAtribuirVaga}
                    onArquivar={handleArquivar}
                    onMarcarNaoEncontrada={handleMarcarNaoEncontrada}
                    onEditarEvento={handleEditarEvento}
                    vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                    erroFechamento={erroFechamento}
                    setErroFechamento={setErroFechamento}
                    erroSalvar={erroSalvar}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="afastamentos" className="space-y-3 mt-0 focusVisible:outline-none">
              {afastamentos.length === 0 ? (
                <EmptyState icon={Clock} title="Nenhum afastamento pendente" description="Não há registros de afastamentos que aguardam resposta nesta unidade ou filtro." />
              ) : (
                afastamentos.map((vaga) => (
                  <VagaCard
                    key={vaga.id_evento}
                    vaga={vaga}
                    mostrarSituacao={true}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    abaSelecionada={abaSelecionada}
                    respostas={respostas}
                    formData={formData}
                    updateFormDataMap={updateFormDataMap}
                    tlpData={tlpData}
                    fantasias={fantasias}
                    loadingProfile={loadingProfile}
                    setLoadingProfile={setLoadingProfile}
                    setSelectedProfileFunc={setSelectedProfileFunc}
                    handleResponder={handleResponder}
                    handleEfetivar={handleEfetivar}
                    respondendo={respondendo}
                    handleUpdateTlpValue={handleUpdateTlpValue}
                    updatingTlp={updatingTlp}
                    onAtribuir={handleAtribuirVaga}
                    onArquivar={handleArquivar}
                    onMarcarNaoEncontrada={handleMarcarNaoEncontrada}
                    onEditarEvento={handleEditarEvento}
                    vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                    erroFechamento={erroFechamento}
                    setErroFechamento={setErroFechamento}
                    erroSalvar={erroSalvar}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pendentes_ef" className="space-y-3 mt-0 focusVisible:outline-none">
              {pendentesEf.length === 0 ? (
                <EmptyState icon={AlertCircle} title="Sem pendências de efetivação" description="Vagas marcadas como 'Pendente efetivação' aparecerão aqui." />
              ) : (
                pendentesEf.map((vaga) => (
                  <VagaCard
                    key={vaga.id_evento}
                    vaga={vaga}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    abaSelecionada={abaSelecionada}
                    respostas={respostas}
                    formData={formData}
                    updateFormDataMap={updateFormDataMap}
                    tlpData={tlpData}
                    fantasias={fantasias}
                    loadingProfile={loadingProfile}
                    setLoadingProfile={setLoadingProfile}
                    setSelectedProfileFunc={setSelectedProfileFunc}
                    handleResponder={handleResponder}
                    handleEfetivar={handleEfetivar}
                    respondendo={respondendo}
                    handleUpdateTlpValue={handleUpdateTlpValue}
                    updatingTlp={updatingTlp}
                    onAtribuir={handleAtribuirVaga}
                    onArquivar={handleArquivar}
                    onEditarEvento={handleEditarEvento}
                    vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                    erroFechamento={erroFechamento}
                    setErroFechamento={setErroFechamento}
                    erroSalvar={erroSalvar}
                  />
                ))
              )}
            </TabsContent>

            {temBuscaAtiva && (
              <TabsContent value="busca" className="space-y-3 mt-0 focusVisible:outline-none">
                {todosResultadosBusca.length === 0 ? (
                  <EmptyState icon={Search} title="Nenhum resultado encontrado" description={`Nenhuma vaga contém "${busca}" em nome, cargo ou lotação.`} />
                ) : (
                  <div className="space-y-4">
                    {/* Agrupar resultados por status */}
                    {pendentes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 px-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          Demissões Pendentes ({pendentes.length})
                        </h4>
                        {pendentes.map((vaga) => (
                          <VagaCard
                            key={vaga.id_evento}
                            vaga={vaga}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            abaSelecionada="pendentes"
                            respostas={respostas}
                            formData={formData}
                            updateFormDataMap={updateFormDataMap}
                            tlpData={tlpData}
                            fantasias={fantasias}
                            loadingProfile={loadingProfile}
                            setLoadingProfile={setLoadingProfile}
                            setSelectedProfileFunc={setSelectedProfileFunc}
                            handleResponder={handleResponder}
                            handleEfetivar={handleEfetivar}
                            respondendo={respondendo}
                            handleUpdateTlpValue={handleUpdateTlpValue}
                            updatingTlp={updatingTlp}
                            onAtribuir={handleAtribuirVaga}
                            onArquivar={handleArquivar}
                            onEditarEvento={handleEditarEvento}
                            vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                            erroFechamento={erroFechamento}
                            setErroFechamento={setErroFechamento}
                            erroSalvar={erroSalvar}
                          />
                        ))}
                      </div>
                    )}

                    {afastamentos.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 px-2">
                          <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                          Afastamentos ({afastamentos.length})
                        </h4>
                        {afastamentos.map((vaga) => (
                          <VagaCard
                            key={vaga.id_evento}
                            vaga={vaga}
                            mostrarSituacao={true}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            abaSelecionada="afastamentos"
                            respostas={respostas}
                            formData={formData}
                            updateFormDataMap={updateFormDataMap}
                            tlpData={tlpData}
                            fantasias={fantasias}
                            loadingProfile={loadingProfile}
                            setLoadingProfile={setLoadingProfile}
                            setSelectedProfileFunc={setSelectedProfileFunc}
                            handleResponder={handleResponder}
                            handleEfetivar={handleEfetivar}
                            respondendo={respondendo}
                            handleUpdateTlpValue={handleUpdateTlpValue}
                            updatingTlp={updatingTlp}
                            onAtribuir={handleAtribuirVaga}
                            onArquivar={handleArquivar}
                            onEditarEvento={handleEditarEvento}
                            vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                            erroFechamento={erroFechamento}
                            setErroFechamento={setErroFechamento}
                            erroSalvar={erroSalvar}
                          />
                        ))}
                      </div>
                    )}

                    {pendentesEf.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 px-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                          Efetivação Pendente ({pendentesEf.length})
                        </h4>
                        {pendentesEf.map((vaga) => (
                          <VagaCard
                            key={vaga.id_evento}
                            vaga={vaga}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            abaSelecionada="pendentes_ef"
                            respostas={respostas}
                            formData={formData}
                            updateFormDataMap={updateFormDataMap}
                            tlpData={tlpData}
                            fantasias={fantasias}
                            loadingProfile={loadingProfile}
                            setLoadingProfile={setLoadingProfile}
                            setSelectedProfileFunc={setSelectedProfileFunc}
                            handleResponder={handleResponder}
                            handleEfetivar={handleEfetivar}
                            respondendo={respondendo}
                            handleUpdateTlpValue={handleUpdateTlpValue}
                            updatingTlp={updatingTlp}
                            onAtribuir={handleAtribuirVaga}
                            onArquivar={handleArquivar}
                            onEditarEvento={handleEditarEvento}
                            vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                            erroFechamento={erroFechamento}
                            setErroFechamento={setErroFechamento}
                            erroSalvar={erroSalvar}
                          />
                        ))}
                      </div>
                    )}

                    {vagasEmAberto.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 px-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          Vagas em Aberto ({vagasEmAberto.length})
                        </h4>
                        {vagasEmAberto.map((vaga: any) => {
                          const isMovimentacao = (vaga as any)._source === 'MOVIMENTACAO';
                          const vagaFormatada = {
                            ...vaga,
                            cargo: vaga.cargo_saiu || 'Cargo não informado',
                            nome: vaga.quem_saiu || 'Sem nome',
                            lotacao: vaga.centro_custo || '-',
                            status_evento: 'RESPONDIDO' as const,
                            situacao_origem: isMovimentacao
                              ? ((vaga as any).situacao_atual ?? 'Movimentação')
                              : ((vaga as any).situacao_atual ?? '99-Demitido'),
                          };
                          return (
                            <VagaCard
                              key={vaga.id_evento}
                              vaga={vagaFormatada}
                              expandedId={expandedId}
                              setExpandedId={setExpandedId}
                              abaSelecionada="respondidas"
                              respostas={respostas}
                              formData={formData}
                              updateFormDataMap={updateFormDataMap}
                              tlpData={tlpData}
                              fantasias={fantasias}
                              loadingProfile={loadingProfile}
                              setLoadingProfile={setLoadingProfile}
                              setSelectedProfileFunc={setSelectedProfileFunc}
                              handleResponder={handleResponder}
                              handleEfetivar={handleEfetivar}
                              respondendo={respondendo}
                              handleUpdateTlpValue={handleUpdateTlpValue}
                              updatingTlp={updatingTlp}
                              onAtribuir={handleAtribuirVaga}
                              onArquivar={handleArquivar}
                              onEditarEvento={handleEditarEvento}
                              vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                              erroFechamento={erroFechamento}
                              setErroFechamento={setErroFechamento}
                              erroSalvar={erroSalvar}
                            />
                          );
                        })}
                      </div>
                    )}

                    {vagasFechadas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 px-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          Vagas Fechadas ({vagasFechadas.length})
                        </h4>
                        {vagasFechadas.map((vaga) => (
                          <VagaCard
                            key={vaga.id_evento}
                            vaga={vaga}
                            mostrarSubstituto={true}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            abaSelecionada="fechadas"
                            respostas={respostas}
                            formData={formData}
                            updateFormDataMap={updateFormDataMap}
                            tlpData={tlpData}
                            fantasias={fantasias}
                            loadingProfile={loadingProfile}
                            setLoadingProfile={setLoadingProfile}
                            setSelectedProfileFunc={setSelectedProfileFunc}
                            handleResponder={handleResponder}
                            handleEfetivar={handleEfetivar}
                            respondendo={respondendo}
                            handleUpdateTlpValue={handleUpdateTlpValue}
                            updatingTlp={updatingTlp}
                            onAtribuir={handleAtribuirVaga}
                            onArquivar={handleArquivar}
                            onEditarEvento={handleEditarEvento}
                            vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                            erroFechamento={erroFechamento}
                            setErroFechamento={setErroFechamento}
                            erroSalvar={erroSalvar}
                          />
                        ))}
                      </div>
                    )}

                    {arquivadasFiltradas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 px-2">
                          <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                          Canceladas ({arquivadasFiltradas.length})
                        </h4>
                        {arquivadasFiltradas.map((vaga) => (
                          <VagaCard
                            key={vaga.id_evento}
                            vaga={vaga}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            abaSelecionada="arquivadas"
                            respostas={respostas}
                            formData={formData}
                            updateFormDataMap={updateFormDataMap}
                            tlpData={tlpData}
                            fantasias={fantasias}
                            loadingProfile={loadingProfile}
                            setLoadingProfile={setLoadingProfile}
                            setSelectedProfileFunc={setSelectedProfileFunc}
                            handleResponder={handleResponder}
                            handleEfetivar={handleEfetivar}
                            respondendo={respondendo}
                            handleUpdateTlpValue={handleUpdateTlpValue}
                            updatingTlp={updatingTlp}
                            onAtribuir={handleAtribuirVaga}
                            onArquivar={handleArquivar}
                            isArquivada={true}
                            onEditarEvento={handleEditarEvento}
                            vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                            erroFechamento={erroFechamento}
                            setErroFechamento={setErroFechamento}
                            erroSalvar={erroSalvar}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="respondidas" className="space-y-3 mt-0 focusVisible:outline-none">
              {vagasEmAberto.length === 0 && afastamentosEmAberto.length === 0 ? (
                <EmptyState icon={TrendingUp} title="Nenhuma vaga em aberto" description="Eventos que geraram vagas e ainda não foram preenchidas aparecerão aqui." />
              ) : (
                <>
                  {vagasEmAberto.map((vaga: any) => {
                    const isMovimentacao = (vaga as any)._source === 'MOVIMENTACAO';
                    // Mapear VagaEmAberto para formato esperado por VagaCard
                    const vagaFormatada = {
                      ...vaga,
                      cargo: vaga.cargo_saiu || 'Cargo não informado',
                      nome: vaga.quem_saiu || 'Sem nome',
                      lotacao: vaga.centro_custo || '-',
                      status_evento: 'RESPONDIDO' as const,
                      situacao_origem: isMovimentacao
                        ? ((vaga as any).situacao_atual ?? 'Movimentação')
                        : ((vaga as any).situacao_atual ?? '99-Demitido'), // Usar situação real do banco
                    };
                    return (
                      <div key={`${(vaga as any)._source === 'MOVIMENTACAO' ? 'mov' : 'ev'}-${vaga.id_evento}`} className="relative">
                        {isMovimentacao && (
                          <button
                            type="button"
                            onClick={() => handleExcluirMovimentacao(vaga.id_evento)}
                            title="Excluir vaga de movimentação"
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <VagaCard
                          vaga={vagaFormatada}
                          expandedId={expandedId}
                          setExpandedId={setExpandedId}
                          abaSelecionada={abaSelecionada}
                          respostas={respostas}
                          formData={formData}
                          updateFormDataMap={updateFormDataMap}
                          tlpData={tlpData}
                          fantasias={fantasias}
                          loadingProfile={loadingProfile}
                          setLoadingProfile={setLoadingProfile}
                          setSelectedProfileFunc={setSelectedProfileFunc}
                          handleResponder={handleResponder}
                          handleEfetivar={handleEfetivar}
                          respondendo={respondendo}
                          handleUpdateTlpValue={handleUpdateTlpValue}
                          updatingTlp={updatingTlp}
                          onAtribuir={handleAtribuirVaga}
                          onArquivar={handleArquivar}
                          onEditarEvento={handleEditarEvento}
                          vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                          erroFechamento={erroFechamento}
                          setErroFechamento={setErroFechamento}
                          erroSalvar={erroSalvar}
                        />
                      </div>
                    );
                  })}
                  {afastamentosEmAberto.map((vaga) => (
                    <VagaCard
                      key={`afas-${vaga.id_evento}`}
                      vaga={vaga}
                      mostrarSituacao={true}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      abaSelecionada={abaSelecionada}
                      respostas={respostas}
                      formData={formData}
                      updateFormDataMap={updateFormDataMap}
                      tlpData={tlpData}
                      fantasias={fantasias}
                      loadingProfile={loadingProfile}
                      setLoadingProfile={setLoadingProfile}
                      setSelectedProfileFunc={setSelectedProfileFunc}
                      handleResponder={handleResponder}
                      handleEfetivar={handleEfetivar}
                      respondendo={respondendo}
                      handleUpdateTlpValue={handleUpdateTlpValue}
                      updatingTlp={updatingTlp}
                      onAtribuir={handleAtribuirVaga}
                      onArquivar={handleArquivar}
                      onEditarEvento={handleEditarEvento}
                      vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                      erroFechamento={erroFechamento}
                      setErroFechamento={setErroFechamento}
                      erroSalvar={erroSalvar}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="fechadas" className="space-y-4 mt-0 focusVisible:outline-none">
              {vagasFechadas.length === 0 && vagasSemAbertura.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Nenhuma vaga encerrada" description="Vagas preenchidas ou respondidas sem necessidade de abertura aparecerão aqui." />
              ) : (
                <>
                  {vagasFechadas.length > 0 && (
                    <div className="space-y-3">
                      {vagasSemAbertura.length > 0 && (
                        <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2 px-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                          Vaga Preenchida ({vagasFechadas.length})
                        </h4>
                      )}
                      {vagasFechadas.map((vaga) => (
                        <VagaCard
                          key={vaga.id_evento}
                          vaga={vaga}
                          mostrarSubstituto={true}
                          expandedId={expandedId}
                          setExpandedId={setExpandedId}
                          abaSelecionada={abaSelecionada}
                          respostas={respostas}
                          formData={formData}
                          updateFormDataMap={updateFormDataMap}
                          tlpData={tlpData}
                          fantasias={fantasias}
                          loadingProfile={loadingProfile}
                          setLoadingProfile={setLoadingProfile}
                          setSelectedProfileFunc={setSelectedProfileFunc}
                          handleResponder={handleResponder}
                          handleEfetivar={handleEfetivar}
                          respondendo={respondendo}
                          handleUpdateTlpValue={handleUpdateTlpValue}
                          updatingTlp={updatingTlp}
                          onAtribuir={handleAtribuirVaga}
                          onArquivar={handleArquivar}
                          onEditarEvento={handleEditarEvento}
                          vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                          erroFechamento={erroFechamento}
                          setErroFechamento={setErroFechamento}
                          erroSalvar={erroSalvar}
                        />
                      ))}
                    </div>
                  )}
                  {vagasSemAbertura.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2 px-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                        Sem Abertura de Vaga ({vagasSemAbertura.length})
                      </h4>
                      {vagasSemAbertura.map((vaga) => (
                        <VagaCard
                          key={vaga.id_evento}
                          vaga={vaga}
                          expandedId={expandedId}
                          setExpandedId={setExpandedId}
                          abaSelecionada={abaSelecionada}
                          respostas={respostas}
                          formData={formData}
                          updateFormDataMap={updateFormDataMap}
                          tlpData={tlpData}
                          fantasias={fantasias}
                          loadingProfile={loadingProfile}
                          setLoadingProfile={setLoadingProfile}
                          setSelectedProfileFunc={setSelectedProfileFunc}
                          handleResponder={handleResponder}
                          handleEfetivar={handleEfetivar}
                          respondendo={respondendo}
                          handleUpdateTlpValue={handleUpdateTlpValue}
                          updatingTlp={updatingTlp}
                          onAtribuir={handleAtribuirVaga}
                          onArquivar={handleArquivar}
                          onEditarEvento={handleEditarEvento}
                          vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                          erroFechamento={erroFechamento}
                          setErroFechamento={setErroFechamento}
                          erroSalvar={erroSalvar}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="arquivadas" className="space-y-3 mt-0 focusVisible:outline-none">
              {arquivadasFiltradas.length === 0 ? (
                <EmptyState icon={Archive} title="Nenhuma vaga cancelada" description="Vagas canceladas aparecerão aqui." />
              ) : (
                arquivadasFiltradas.map((vaga) => (
                  <VagaCard
                    key={vaga.id_evento}
                    vaga={vaga}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    abaSelecionada={abaSelecionada}
                    respostas={respostas}
                    formData={formData}
                    updateFormDataMap={updateFormDataMap}
                    tlpData={tlpData}
                    fantasias={fantasias}
                    loadingProfile={loadingProfile}
                    setLoadingProfile={setLoadingProfile}
                    setSelectedProfileFunc={setSelectedProfileFunc}
                    handleResponder={handleResponder}
                    handleEfetivar={handleEfetivar}
                    respondendo={respondendo}
                    handleUpdateTlpValue={handleUpdateTlpValue}
                    updatingTlp={updatingTlp}
                    onAtribuir={handleAtribuirVaga}
                    onArquivar={handleArquivar}
                    isArquivada={true}
                    onEditarEvento={handleEditarEvento}
                    vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                    erroFechamento={erroFechamento}
                    setErroFechamento={setErroFechamento}
                    erroSalvar={erroSalvar}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="nao_encontradas" className="space-y-3 mt-0 focusVisible:outline-none">
              {naoEncontradasFiltradas.length === 0 ? (
                <EmptyState icon={SearchX} title="Nenhuma vaga não encontrada" description="Vagas sinalizadas como 'não encontradas' aparecerão aqui para análise de outro analista." />
              ) : (
                <>
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-2 text-sm text-orange-800 dark:text-orange-300">
                    <SearchX className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Estas vagas foram sinalizadas como <strong>não encontradas</strong> por um analista. Outro analista deve investigar e encontrar os dados corretos, ou devolver a vaga para a fila original.</span>
                  </div>
                  {naoEncontradasFiltradas.map((vaga) => (
                    <VagaCard
                      key={vaga.id_evento}
                      vaga={vaga}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      abaSelecionada={abaSelecionada}
                      respostas={respostas}
                      formData={formData}
                      updateFormDataMap={updateFormDataMap}
                      tlpData={tlpData}
                      fantasias={fantasias}
                      loadingProfile={loadingProfile}
                      setLoadingProfile={setLoadingProfile}
                      setSelectedProfileFunc={setSelectedProfileFunc}
                      handleResponder={handleResponder}
                      handleEfetivar={handleEfetivar}
                      respondendo={respondendo}
                      handleUpdateTlpValue={handleUpdateTlpValue}
                      updatingTlp={updatingTlp}
                      onAtribuir={handleAtribuirVaga}
                      onArquivar={handleArquivar}
                      onMarcarNaoEncontrada={handleMarcarNaoEncontrada}
                      isNaoEncontrada={true}
                      onEditarEvento={handleEditarEvento}
                      vagasDerivadas={vagasDerivadas[vaga.id_evento] ?? []}
                      erroFechamento={erroFechamento}
                      setErroFechamento={setErroFechamento}
                      erroSalvar={erroSalvar}
                    />
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Perfil do Colaborador Modal */}
      {selectedProfileFunc && (
        <FuncionarioProfile
          funcionario={selectedProfileFunc}
          onClose={() => setSelectedProfileFunc(null)}
        />
      )}

      {/* Modal de Atribuição */}
      <AtribuirVagaModal
        open={!!selectedVagaForAtribuicao}
        onOpenChange={(open) => !open && setSelectedVagaForAtribuicao(null)}
        vaga={selectedVagaForAtribuicao ? {
          id_evento: selectedVagaForAtribuicao.id_evento,
          quem_saiu: selectedVagaForAtribuicao.nome,
          cargo_saiu: selectedVagaForAtribuicao.cargo,
          dias_em_aberto: selectedVagaForAtribuicao.dias_em_aberto || 0,
          cnpj: selectedVagaForAtribuicao.cnpj,
          // Extra fields for event creation
          _id_funcionario: selectedVagaForAtribuicao._id_funcionario,
          _needs_creation: selectedVagaForAtribuicao._needs_creation,
          data_evento: selectedVagaForAtribuicao.data_evento,
          situacao_origem: selectedVagaForAtribuicao.situacao_origem,
          nome: selectedVagaForAtribuicao.nome,
          cargo: selectedVagaForAtribuicao.cargo,
          lotacao: selectedVagaForAtribuicao.lotacao
        } : null}
      />

      {/* Modal Nova Vaga de Movimentação */}
      <NovaVagaMovimentacaoModal
        open={modalMovimentacaoOpen}
        onOpenChange={setModalMovimentacaoOpen}
        fantasias={apenasContratosSP
          ? fantasias.filter(f => CONTRATOS_SP.some(sp => f.display_name?.includes(sp) || f.nome_fantasia?.includes(sp)))
          : fantasias}
        onSaved={() => carregarDados(lotacao === 'TODAS' ? undefined : lotacao, selectedFantasia)}
        onAtribuir={handleAtribuirVaga}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-all">
      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs text-center leading-relaxed">
        {description}
      </p>
    </div>
  );
}


function FuncionarioCombobox({
  value,
  onChange,
  onSelectFull,
  cargoAlvo,
  lotacaoAlvo,
  nomeFantasiaAlvo,
  cnpjAlvo
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectFull?: (func: { nome: string; dt_admissao?: string | null }) => void;
  cargoAlvo?: string;
  lotacaoAlvo?: string;
  nomeFantasiaAlvo?: string;
  cnpjAlvo?: string;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isOpen) {
        setLoading(true);
        const results = await buscarSugestoesSubstitutos(value || '', nomeFantasiaAlvo);
        setSuggestions(results);
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [value, isOpen, nomeFantasiaAlvo]);

  return (
    <div ref={wrapperRef} className="relative w-full space-y-3">
      {/* Campo de Busca Principal */}
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pr-10"
          placeholder="Nome do novo funcionário..."
        />
        <div className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none flex items-center justify-center">
          <ChevronsUpDown className="h-4 w-4" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-2 text-sm text-slate-500 text-center">Nenhum funcionário encontrado.</div>
          ) : (
            <div className="py-1">
              {suggestions.slice().sort((a, b) => {
                // Scoring system conforme especificação:
                // Cargo + Lotação + Contrato = 10.000 (máxima)
                // Cargo + Contrato = 5.000
                // Cargo + Lotação = 3.000 (alterado de 8000 pra ficar conforme tabela, mas mantém alta prioridade visualmente)
                // Apenas Cargo = 1.000
                // Apenas Contrato (sem cargo) = +100
                // Apenas Lotação (sem cargo) = +50
                const removerQualificadores = (cargo: string) => {
                  return cargo
                    .toLowerCase()
                    .trim()
                    .replace(/\s+(lider|substituto|interino|coordenador|gerente|supervisor|chefe|assistente|auxiliar|tecnico|aux\.|técnico)\b/gi, '')
                    .trim();
                };

                const getScore = (item: any) => {
                  let score = 0;
                  const cargoAlvoClean = removerQualificadores(cargoAlvo || '');
                  const itemCargoClean = removerQualificadores(item.cargo || '');
                  const cargoMatch = cargoAlvoClean && itemCargoClean && cargoAlvoClean === itemCargoClean;

                  const lotacaoLower = lotacaoAlvo?.toLowerCase().trim() || '';
                  const itemCentroLower = item.centro_custo ? item.centro_custo.toLowerCase().trim() : '';
                  const itemLocalTrabalhoLower = item.local_de_trabalho ? item.local_de_trabalho.toLowerCase().trim() : '';
                  const lotacaoMatch = lotacaoLower && (itemCentroLower === lotacaoLower || itemLocalTrabalhoLower === lotacaoLower);

                  // Comparação por CNPJ (Contrato)
                  const cnpjAlvoClean = cnpjAlvo?.replace(/\D/g, '') || '';
                  const itemCnpjClean = (item.cnpj_empresa || item.cnpj)?.replace(/\D/g, '') || '';
                  const cnpjMatch = cnpjAlvoClean && itemCnpjClean && cnpjAlvoClean === itemCnpjClean;

                  // Fallback para nome fantasia se CNPJ falhar ou não existir
                  const fantasiaAlvoLower = nomeFantasiaAlvo?.toLowerCase().trim() || '';
                  const itemFantasiaLower = item.nome_fantasia ? item.nome_fantasia.toLowerCase().trim() : '';
                  const fantasiaMatch = fantasiaAlvoLower && itemFantasiaLower === fantasiaAlvoLower;

                  const contratoMatch = cnpjMatch || fantasiaMatch;

                  // Aplicar scoring conforme tabela
                  if (cargoMatch) {
                    if (lotacaoMatch && contratoMatch) {
                      score = 10000; // Perfeito: cargo + lotação + contrato
                    } else if (lotacaoMatch) {
                      score = 8000; // PRIORIDADE: Cargo + Lotação (mesmo cargo e local)
                    } else if (contratoMatch) {
                      score = 5000; // Cargo + Contrato
                    } else {
                      score = 1000; // Apenas cargo
                    }
                  } else {
                    // Se cargo não bate
                    if (contratoMatch) score += 100;
                    if (lotacaoMatch) score += 50;
                  }


                  return score;
                };
                return getScore(b) - getScore(a);
              }).slice(0, 50).map((s) => {
                const removerQualificadoresDisplay = (cargo: string) => {
                  return cargo
                    .toLowerCase()
                    .trim()
                    .replace(/\s+(lider|substituto|interino|coordenador|gerente|supervisor|chefe|assistente|auxiliar|tecnico|aux\.|técnico)\b/gi, '')
                    .trim();
                };
                const cargoMatch = cargoAlvo && s.cargo && removerQualificadoresDisplay(cargoAlvo) === removerQualificadoresDisplay(s.cargo);

                const lotacaoMatch = lotacaoAlvo && (
                  (s.centro_custo && s.centro_custo.toLowerCase().trim() === lotacaoAlvo.toLowerCase().trim()) ||
                  (s.local_de_trabalho && s.local_de_trabalho.toLowerCase().trim() === lotacaoAlvo.toLowerCase().trim())
                );

                const cnpjAlvoClean = cnpjAlvo?.replace(/\D/g, '') || '';
                const itemCnpjClean = (s.cnpj_empresa || s.cnpj)?.replace(/\D/g, '') || '';
                const cnpjMatch = cnpjAlvoClean && itemCnpjClean && cnpjAlvoClean === itemCnpjClean;
                const fantasiaMatch = nomeFantasiaAlvo && s.nome_fantasia && nomeFantasiaAlvo.toLowerCase().trim() === s.nome_fantasia.toLowerCase().trim();
                const contratoMatch = cnpjMatch || fantasiaMatch;

                // Recomendado se Cargo bate + (Lotação OU Contrato)
                const isRecommended = cargoMatch && (lotacaoMatch || contratoMatch);

                return (
                  <div
                    key={s.id}
                    className={`px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex flex-col gap-0.5 ${isRecommended ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}
                    onClick={() => {
                      onChange(s.nome);
                      if (onSelectFull) onSelectFull({ nome: s.nome, dt_admissao: s.dt_admissao ?? null });
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.nome}</span>
                      {isRecommended && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200 flex gap-1 items-center">
                          <Check className="h-2 w-2" /> Recomendado
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 items-center">
                      <span className={cargoMatch ? "font-semibold text-slate-700 dark:text-slate-300" : ""}>{s.cargo}</span>
                      <span className="text-slate-300">•</span>
                      <span className={lotacaoMatch ? "font-semibold text-slate-700 dark:text-slate-300" : ""}>{s.local_de_trabalho || s.centro_custo || 'Sem lotação'}</span>
                      {(s.nome_fantasia || contratoMatch) && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className={`uppercase text-[10px] px-1.5 rounded ${contratoMatch ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {s.nome_fantasia || 'Contrato'}
                          </span>
                        </>
                      )}
                      {s.dt_admissao && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">
                            Admissão: {formatarData(s.dt_admissao)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function calculateDaysOpen(dataEvento: string): number {
  if (!dataEvento) return 0;
  try {
    const eventDate = new Date(dataEvento + 'T00:00:00'); // Ensure UTC for consistent calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set today to start of day for consistent comparison

    // Calculate difference in milliseconds
    const diffTime = Math.abs(today.getTime() - eventDate.getTime());
    // Convert to days, rounding up to include the current day
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (e) {
    console.error("Error calculating days open:", e);
    return 0;
  }
}
function getSlaStatus(dias: number) {
  if (dias > 30) return { icon: AlertTriangle, color: 'text-red-600', label: 'Crítico' };
  if (dias > 15) return { icon: Clock, color: 'text-amber-600', label: 'Atenção' };
  return { icon: CheckCircle, color: 'text-green-600', label: 'Normal' };
}

function VagaCard({
  vaga,
  mostrarSubstituto = false,
  mostrarSituacao = false,
  expandedId,
  setExpandedId,
  abaSelecionada,
  respostas,
  formData,
  updateFormDataMap,
  tlpData,
  fantasias,
  loadingProfile,
  setLoadingProfile,
  setSelectedProfileFunc,
  handleResponder,
  handleEfetivar,
  respondendo,
  handleUpdateTlpValue,
  updatingTlp,
  onAtribuir,
  onArquivar,
  onMarcarNaoEncontrada,
  onEditarEvento,
  isArquivada,
  isNaoEncontrada,
  erroFechamento,
  setErroFechamento,
  erroSalvar,
  vagasDerivadas = [],
}: {
  vaga: any;
  mostrarSubstituto?: boolean;
  mostrarSituacao?: boolean;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  abaSelecionada: string;
  respostas: any;
  formData: any;
  updateFormDataMap: (idEvento: number, updates: any) => void;
  tlpData: any[] | null;
  fantasias: any[] | null;
  loadingProfile: boolean;
  setLoadingProfile: (loading: boolean) => void;
  setSelectedProfileFunc: (func: any) => void;
  handleResponder: (idEvento: number, tipoOrigem: 'DEMISSAO' | 'AFASTAMENTO') => Promise<void>;
  handleEfetivar: (idEvento: number, tipo: 'DEMISSAO' | 'AFASTAMENTO') => Promise<void>;
  respondendo: { [key: number]: boolean };
  handleUpdateTlpValue: (cargo: string, lotacao: string, id: number | undefined, newValue: number) => Promise<void>;
  updatingTlp: string | null;
  onAtribuir?: (vaga: any) => void;
  onArquivar?: (id: number, tipo: 'DEMISSAO' | 'AFASTAMENTO', status: boolean) => Promise<void>;
  onMarcarNaoEncontrada?: (id: number, tipo: 'DEMISSAO' | 'AFASTAMENTO', status: boolean, observacao?: string) => Promise<void>;
  onEditarEvento?: (idEvento: number, tipoOrigem: 'DEMISSAO' | 'AFASTAMENTO', dados: { data_abertura_vaga?: string; data_fechamento_vaga?: string; nome_candidato?: string; id_evento_mae?: number | null }) => Promise<void>;
  isArquivada?: boolean;
  vagasDerivadas?: VagaDerivada[];
  isNaoEncontrada?: boolean;
  erroFechamento: number | null;
  setErroFechamento: (id: number | null) => void;
  erroSalvar?: Record<number, string>;
}) {
  if (!vaga || !vaga.id_evento) return null;

  const displayDiasEmAberto = isArquivada
    ? (vaga.dias_em_aberto || 0)
    : (vaga.dias_em_aberto > 0 ? vaga.dias_em_aberto : calculateDaysOpen(vaga.data_evento));
  const isExpanded = expandedId === vaga.id_evento;
  const sla = getSlaStatus(displayDiasEmAberto || 0);
  const SlaIcon = sla.icon;
  const tipoOrigem = vaga.situacao_origem === '99-Demitido' ? 'DEMISSAO' : 'AFASTAMENTO';
  const isPendenteEf = abaSelecionada === 'pendentes_ef';
  const [obsNaoEncontrada, setObsNaoEncontrada] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editDataAbertura, setEditDataAbertura] = useState('');
  const [editDataFechamento, setEditDataFechamento] = useState('');
  const [editNomeCandidato, setEditNomeCandidato] = useState('');
  const [editIdEventoMae, setEditIdEventoMae] = useState<string>('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Limpa erro ao expandir/recolher
  useEffect(() => {
    if (isExpanded && erroFechamento === vaga.id_evento) {
      setErroFechamento(null);
    }
  }, [isExpanded, vaga.id_evento, erroFechamento, setErroFechamento]);

  const idNum = Number(vaga.id_evento);
  const currentResp = respostas[idNum] || {};
  const currentForm = formData[idNum] || {};

  // Log para diagnosticar preenchimento
  useEffect(() => {
    if (isExpanded) {
      console.log(`[VagaCard Debug] ID: ${idNum}`, {
        nome: vaga.nome,
        form: currentForm,
        resp: currentResp,
        abriuVaga: currentForm.abriu_vaga ?? currentResp.abriu_vaga,
        dataAbertura: currentForm.data_abertura_vaga ?? currentResp.data_abertura_vaga
      });
    }
  }, [isExpanded, idNum, currentForm, currentResp, vaga.nome]);

  // Função para copiar texto com feedback visual
  const copyWithFeedback = (text: string, fieldId: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiado(fieldId);
      setTimeout(() => setCopiado(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Fun helper to get value with priority: formData > respostas > default
  // Typed as any to allow flexibility with keys
  const getVal = (key: string, defaultVal: any = null) => {
    if (currentForm[key] !== undefined && currentForm[key] !== null) return currentForm[key];
    if (currentResp[key] !== undefined && currentResp[key] !== null) return currentResp[key];
    return defaultVal;
  };

  const abriuVaga = getVal('abriu_vaga');
  const naoPertenceUnidade = getVal('nao_pertence_unidade') === true;
  const dataAbertura = getVal('data_abertura_vaga', '');
  const dataFechamento = getVal('data_fechamento_vaga', '');

  // Para vagas fechadas/pendentes efetivação: dias entre abertura e fechamento
  const isFechadaOuPendenteEf = abaSelecionada === 'fechadas' || abaSelecionada === 'pendentes_ef';
  const diasParaFechar: number | null = (() => {
    if (!isFechadaOuPendenteEf || !dataFechamento) return null;
    const dataInicio = (vaga as any).data_abertura_vaga || dataAbertura || vaga.data_evento;
    if (!dataInicio) return null;
    return Math.max(0, Math.floor(
      (new Date(dataFechamento + 'T00:00:00').getTime() - new Date(dataInicio + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24)
    ));
  })();

  // Detectar data de abertura suspeita
  // dataAberturaDisplay unifica o campo direto do objeto (view) com a resposta salva
  const dataAberturaDisplay: string | null = (vaga as any).data_abertura_vaga || dataAbertura || null;
  // Inconsistente: abertura ANTES da situação com diferença > 60 dias
  // (até 60 dias é tolerável — aviso prévio, adiantamento de vaga, etc.)
  const diffAberturaVsSituacao = dataAberturaDisplay && vaga.data_evento
    ? Math.floor(
      (new Date(vaga.data_evento + 'T00:00:00').getTime() -
        new Date(dataAberturaDisplay + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
    )
    : 0;
  const dataInconsistente = !isArquivada && diffAberturaVsSituacao > 60;
  // Suspeito: mais de 365 dias em aberto sem data de abertura (pode indicar erro de ano)
  const diasSuspeitos = !isArquivada && !dataAberturaDisplay && displayDiasEmAberto > 365;
  const alertaDataSuspeita = dataInconsistente || diasSuspeitos;

  // Para Vagas em Aberto: contar da data de abertura até hoje (não da data da situação)
  const diasEmAbertoExibir = abaSelecionada === 'respondidas' && dataAberturaDisplay
    ? calculateDaysOpen(dataAberturaDisplay)
    : displayDiasEmAberto;
  const vagaPreenchida = getVal('vaga_preenchida', 'NAO'); // Default 'NAO' for Select
  // Check both keys for candidate name just in case
  // Campo de busca usa apenas o que foi digitado agora (currentForm), não carrega valor anterior
  const nomeCandidato = currentForm.nome_candidato || '';
  const observacao = getVal('observacao', '');
  const pendenteEfetivacao = getVal('pendente_efetivacao', false);

  const nomeSubstitutoDisplay = currentResp.nome_candidato || currentForm.nome_candidato || currentForm.nome_substituto || '';

  // Hover Base BI
  const [biHoverNome, setBiHoverNome] = useState<string | null>(null);
  const [biHoverData, setBiHoverData] = useState<{ rows: Record<string, any>[]; headers: string[] } | null>(null);
  const [biHoverPos, setBiHoverPos] = useState<{ top: number; left: number } | null>(null);
  const biHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBiMouseEnter = (e: React.MouseEvent, nome: string) => {
    if (biHoverTimer.current) clearTimeout(biHoverTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = { top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 360) };
    if (biHoverNome === nome) { setBiHoverPos(pos); return; }
    setBiHoverNome(nome);
    buscarRegistrosBIByNome(nome).then(d => { setBiHoverData(d); setBiHoverPos(pos); });
  };

  const handleBiMouseLeave = () => {
    biHoverTimer.current = setTimeout(() => { setBiHoverData(null); setBiHoverNome(null); setBiHoverPos(null); }, 150);
  };

  // Determinar status da vaga
  const getStatusBadge = () => {
    if (isNaoEncontrada) {
      return {
        label: 'Não Encontrada',
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      };
    }
    if (abaSelecionada === 'pendentes_ef') {
      return {
        label: 'Efetivação Pendente',
        color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      };
    }
    if (abaSelecionada === 'fechadas') {
      return {
        label: 'Vaga Fechada',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      };
    }
    if (abaSelecionada === 'respondidas') {
      return {
        label: 'Em Aberto',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      };
    }
    if (abaSelecionada === 'afastamentos') {
      return {
        label: 'Afastamento',
        color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
      };
    }
    if (abaSelecionada === 'arquivadas') {
      return {
        label: 'Cancelada',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      };
    }
    return {
      label: 'Demissão Pendente',
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
  };

  // Encontrar dados TLP correspondentes e Nome do Contrato
  const tlpEntry = useMemo(() => {
    if (!tlpData || tlpData.length === 0) {
      console.log('[TLP Debug] tlpData vazio ou null', { tlpDataLen: tlpData?.length });
      return null;
    }
    const found = tlpData.find(t =>
      t.cargo.toLowerCase().trim() === vaga.cargo?.toLowerCase().trim() &&
      (t.centro_custo.toLowerCase().trim() === vaga.lotacao?.toLowerCase().trim() ||
        t.unidade.toLowerCase().trim() === vaga.lotacao?.toLowerCase().trim())
    );
    if (!found) {
      console.log('[TLP Debug] Nenhum match para:', {
        cargo: vaga.cargo,
        lotacao: vaga.lotacao,
        exemplos: tlpData.slice(0, 3).map(t => ({ cargo: t.cargo, centro_custo: t.centro_custo, unidade: t.unidade }))
      });
    }
    return found ?? null;
  }, [vaga.cargo, vaga.lotacao, tlpData]);

  const nomeContrato = useMemo(() => {
    // Prioridade 1: Unidade vinda da TLP (que é o nome do contrato)
    if (tlpEntry?.unidade) return tlpEntry.unidade;

    // Prioridade 2: Buscar na lista de fantasias pelo CNPJ do evento
    if (vaga.cnpj && fantasias) {
      const f = (fantasias as any[]).find(item => item.cnpj === vaga.cnpj);
      if (f) return f.display_name || f.nome_fantasia;
    }

    return null;
  }, [tlpEntry, vaga.cnpj, fantasias]);

  const handleVerPerfilClicado = async (e: React.MouseEvent) => {
    e.stopPropagation();

    setLoadingProfile(true);
    try {
      let func = null;

      // Tenta por CPF se existir
      if ((vaga as any).cpf) {
        func = await buscarFuncionarioPorCpf((vaga as any).cpf);
      }

      // Fallback por Nome (mais comum nesta view)
      if (!func && vaga.nome) {
        func = await buscarFuncionarioPorNome(vaga.nome);
      }

      if (func) {
        setSelectedProfileFunc(func);
      } else {
        alert('Colaborador não encontrado na base de dados do Oris.');
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      alert('Erro ao carregar perfil do colaborador.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Efeito para pré-preencher dados de vagas de movimentação manual
  useEffect(() => {
    const isMovimentacao = (vaga as any)._source === 'MOVIMENTACAO';
    if (isMovimentacao && !formData[vaga.id_evento]?.data_abertura_vaga) {
      updateFormDataMap(vaga.id_evento, {
        abriu_vaga: true,
        data_abertura_vaga: (vaga as any).data_abertura_vaga
      });
    }
  }, [vaga.id_evento, (vaga as any)._source, (vaga as any).data_abertura_vaga, formData, updateFormDataMap]);

  // Efeito para pré-preencher dados da Base BI (Data Abertura)
  useEffect(() => {
    const idNum = Number(vaga.id_evento);
    const formVal = formData[idNum]?.data_abertura_vaga;
    const respVal = currentResp?.data_abertura_vaga;

    const shouldPreFill = isExpanded && vaga.nome && !formVal && !respVal;

    if (shouldPreFill) {
      console.log(`[BI Pre-fill] Attempting for ${vaga.nome} (ID: ${idNum})`);
      buscarRegistrosBIByNome(vaga.nome).then(d => {
        if (d && d.rows.length > 0) {
          // Procurar a primeira linha que tenha uma data de abertura válida
          const colAbertura = d.headers.find(h => normBI(h).includes(normBI('ABERTURA')));

          if (!colAbertura) {
            console.warn(`[BI Pre-fill] Column "ABERTURA" not found in headers:`, d.headers);
            return;
          }

          let isoDate: string | null = null;
          let valorEncontrado = '';
          let nomeSubstituto = '';

          const colSubstituto = d.headers.find(h => normBI(h).includes(normBI('SUBSTITUIDO POR')));

          for (const row of d.rows) {
            // Data Abertura
            const valor = String(row[colAbertura] ?? '').trim();
            if (!isoDate && valor) {
              const parsed = parseBrazilianDateToISO(valor);
              if (parsed) {
                isoDate = parsed;
                valorEncontrado = valor;
              }
            }

            // Substituto
            if (colSubstituto && !nomeSubstituto) {
              const sub = String(row[colSubstituto] ?? '').trim();
              if (sub && sub !== '-' && sub !== '—') {
                nomeSubstituto = sub;
              }
            }

            if (isoDate && nomeSubstituto) break;
          }

          if (isoDate || nomeSubstituto) {
            const updates: any = {};
            if (isoDate) {
              console.log(`[BI Pre-fill] Data found: "${valorEncontrado}" -> ISO: "${isoDate}"`);
              updates.data_abertura_vaga = isoDate;
              updates.abriu_vaga = true;
            }
            if (nomeSubstituto) {
              console.log(`[BI Pre-fill] Substitute found: "${nomeSubstituto}"`);
              updates.nome_candidato = nomeSubstituto;
              updates.vaga_preenchida = 'SIM';
            }

            updateFormDataMap(idNum, updates);
          } else {
            console.log(`[BI Pre-fill] No valid info found in ${d.rows.length} rows for ${vaga.nome}`);
          }
        } else {
          console.log(`[BI Pre-fill] No rows found in BI for ${vaga.nome}`);
        }
      });
    }
  }, [isExpanded, vaga.nome, vaga.id_evento, currentResp?.data_abertura_vaga, updateFormDataMap]); // Removido formData do array de dependências para evitar loops


  return (
    <>
      {biHoverData && biHoverPos && (
        <BiTooltipCard
          rows={biHoverData.rows}
          headers={biHoverData.headers}
          style={{ position: 'fixed', top: biHoverPos.top, left: biHoverPos.left, zIndex: 10000 }}
          onMouseEnter={() => { if (biHoverTimer.current) clearTimeout(biHoverTimer.current); }}
          onMouseLeave={() => { biHoverTimer.current = setTimeout(() => { setBiHoverData(null); setBiHoverNome(null); setBiHoverPos(null); }, 150); }}
        />
      )}
      <Card
        key={vaga.id_evento}
        className={`mb-3 overflow-hidden border-slate-200 dark:border-slate-800 transition-all hover:shadow-md ${erroFechamento === vaga.id_evento
          ? 'ring-2 ring-red-500 border-red-500 shadow-lg shadow-red-100 dark:shadow-red-900/20'
          : isNaoEncontrada
            ? 'border-l-4 border-l-orange-500'
            : alertaDataSuspeita
              ? 'border-l-4 border-l-yellow-400'
              : isPendenteEf
                ? 'border-l-4 border-l-amber-500'
                : ''
          }`}
      >
        <div
          className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
          onClick={() => setExpandedId(isExpanded ? null : vaga.id_evento)}
          onMouseEnter={(e) => vaga.nome && handleBiMouseEnter(e, vaga.nome)}
          onMouseLeave={handleBiMouseLeave}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-1 p-2 rounded-lg ${tipoOrigem === 'DEMISSAO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{vaga.cargo || 'Cargo não informado'}</h3>
                <Badge variant="outline" className="text-[10px] h-5 uppercase">
                  {vaga.lotacao || 'Unidade'}
                </Badge>
                {nomeContrato && (
                  <Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none uppercase">
                    {nomeContrato}
                  </Badge>
                )}
                <Badge className={`text-[10px] h-5 uppercase font-semibold border-none ${getStatusBadge().color}`}>
                  {getStatusBadge().label}
                </Badge>
                {(() => {
                  const isMovimentacao = (vaga as any)._source === 'MOVIMENTACAO';
                  const tipoMov = (vaga as any).tipo_movimentacao as string | undefined;
                  const MOTIVO_LABEL: Record<string, string> = {
                    ENQUADRAMENTO: 'Enquadramento',
                    ALTERACAO_NOMENCLATURA: 'Alt. Nomenclatura',
                    PROMOCAO: 'Promoção',
                    AUMENTO_CARGA_HORARIA: 'Aumento CH',
                    REDUCAO_CARGA_HORARIA: 'Redução CH',
                    MERITO: 'Mérito',
                    CORRECAO_SALARIO: 'Correção Salário',
                  };
                  const label = isMovimentacao
                    ? (tipoMov ? MOTIVO_LABEL[tipoMov] ?? tipoMov : 'Movimentação')
                    : tipoOrigem === 'DEMISSAO' ? 'Demissão' : 'Afastamento';
                  const color = isMovimentacao
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : tipoOrigem === 'DEMISSAO'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
                  return (
                    <Badge className={`text-[10px] h-5 uppercase font-semibold border-none ${color}`}>
                      {label}
                    </Badge>
                  );
                })()}
                <SlaIcon className={`w-4 h-4 ${sla.color}`} />
                {respostas[vaga.id_evento]?.nome_analista && (
                  <Badge className="text-[10px] h-5 font-medium border-none bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                    <UserCheck size={10} />
                    {respostas[vaga.id_evento]?.nome_analista}
                  </Badge>
                )}
                {alertaDataSuspeita && (
                  <Badge className="text-[10px] h-5 font-semibold border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {dataInconsistente ? 'Abertura anterior à situação' : `${displayDiasEmAberto}d em aberto`}
                  </Badge>
                )}
              </div>
              {mostrarSubstituto ? (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                    <UserX className="w-4 h-4 mr-1" />
                    <span>{vaga.nome || 'Sem nome'}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyWithFeedback(vaga.nome || '', 'nome-saiu');
                      }}
                      title="Copiar nome"
                      className="ml-0.5 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                      type="button"
                    >
                      {copiado === 'nome-saiu' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  {nomeSubstitutoDisplay && (
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <UserCheck className="w-4 h-4 mr-1" />
                      <span>{nomeSubstitutoDisplay}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyWithFeedback(nomeSubstitutoDisplay || '', 'nome-sub');
                        }}
                        title="Copiar nome"
                        className="ml-0.5 p-0.5 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
                        type="button"
                      >
                        {copiado === 'nome-sub' ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center text-left flex-wrap gap-x-1.5">
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer transition-colors inline-flex items-center gap-0.5"
                      onClick={handleVerPerfilClicado}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleVerPerfilClicado(e as any);
                        }
                      }}
                    >
                      {vaga.nome || 'Sem nome'}
                      {loadingProfile && <Loader2 className="w-3 h-3 animate-spin" />}
                    </span>
                    {vaga.data_evento && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                        · {tipoOrigem === 'DEMISSAO' ? 'Dem.' : 'Afas.'} {formatarData(vaga.data_evento)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyWithFeedback(vaga.nome || '', 'nome-default');
                      }}
                      title="Copiar nome"
                      className="ml-0.5 p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                      type="button"
                    >
                      {copiado === 'nome-default' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  </div>
                  {mostrarSituacao && vaga.situacao_origem && (
                    <div className={`text-xs ${vaga.situacao_origem === '01-ATIVO' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                      {vaga.situacao_origem}
                    </div>
                  )}
                  {tipoOrigem === 'DEMISSAO' && vaga.tipo_rescisao && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {vaga.tipo_rescisao}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span className="text-slate-400">Situação:</span>
                  {formatarData(vaga.data_evento)}
                </span>
                {dataAberturaDisplay && (
                  <span className={`flex items-center gap-1 ${dataInconsistente ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}`}>
                    <Calendar size={12} className={dataInconsistente ? 'text-yellow-500' : 'text-blue-400'} />
                    <span className="text-slate-400">Abertura:</span>
                    {formatarData(dataAberturaDisplay)}
                    {dataInconsistente && <AlertTriangle size={10} className="text-yellow-500" />}
                  </span>
                )}
                {(abaSelecionada === 'pendentes_ef' || abaSelecionada === 'fechadas') && dataFechamento && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle size={12} />
                    <span className="text-slate-400">Fechamento:</span>
                    {formatarData(dataFechamento)}
                  </span>
                )}
                {diasParaFechar !== null ? (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock size={12} />
                    {diasParaFechar} dias para fechar
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 ${alertaDataSuspeita ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}`}>
                    <Clock size={12} className={alertaDataSuspeita ? 'text-yellow-500' : ''} />
                    {diasEmAbertoExibir} dias em aberto
                    {alertaDataSuspeita && <AlertTriangle size={10} className="text-yellow-500" />}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>

        {isExpanded && (
          <CardContent className="border-t border-slate-200 dark:border-slate-700 pt-6">

            {/* Vagas Derivadas (cadeia de substituição) */}
            {vagasDerivadas.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <h4 className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                  <Users size={13} /> Cadeia de Substituição ({vagasDerivadas.length})
                </h4>
                <div className="space-y-2">
                  {vagasDerivadas.map((derivada) => (
                    <div key={derivada.id_evento} className="flex items-start justify-between gap-3 p-2.5 bg-white dark:bg-slate-800 rounded border border-amber-100 dark:border-amber-800 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                          {derivada.nome_quem_saiu || `Evento #${derivada.id_evento}`}
                        </p>
                        {derivada.cargo_quem_saiu && (
                          <p className="text-slate-500 dark:text-slate-400 truncate">{derivada.cargo_quem_saiu}</p>
                        )}
                        {derivada.data_evento && (
                          <p className="text-slate-400 mt-0.5">{derivada.tipo_origem === 'DEMISSAO' ? 'Demissão' : 'Afastamento'}: {formatarData(derivada.data_evento)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {derivada.nome_candidato ? (
                          <p className="text-blue-600 dark:text-blue-400 font-medium">
                            Sub: {derivada.nome_candidato}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">Sem substituto</p>
                        )}
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${derivada.vaga_preenchida === 'SIM' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'}`}>
                          {derivada.vaga_preenchida === 'SIM' ? 'Fechada' : 'Em aberto'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Informações */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                  <AlertCircle size={14} /> Detalhes do Evento
                </h4>
                <div className={`grid gap-4 text-sm ${currentResp?.id_resposta ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Situação</span>
                    <span className={`font-medium ${vaga.situacao_origem === '99-Demitido' ? 'text-red-600' : vaga.situacao_origem === '01-ATIVO' ? 'text-green-600' : ''}`}>{vaga.situacao_origem}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Dias em aberto</span>
                    <span className={`font-medium ${sla.color}`}>{diasEmAbertoExibir} dias</span>
                  </div>
                  {currentResp?.id_resposta && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <span className="text-blue-600 dark:text-blue-400 block text-[10px] uppercase font-bold mb-1">ID Resposta</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-blue-700 dark:text-blue-300">
                        #{currentResp.id_resposta}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyWithFeedback(String(currentResp.id_resposta), 'id-resposta');
                          }}
                          className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                          title="Copiar ID"
                          type="button"
                        >
                          {copiado === 'id-resposta' ? (
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Carga Horária Semanal</span>
                    <span className="font-medium">{vaga.carga_horaria_semanal ? `${vaga.carga_horaria_semanal} hs` : '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Escala</span>
                    <span className="font-medium">{vaga.escala || '-'}</span>
                  </div>
                </div>

                {/* TLP Info */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2 mb-3">
                    <TrendingUp size={14} /> Quadro Necessário (TLP)
                  </h4>
                  {tlpEntry ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Status do Quadro</span>
                        <StatusBadge status={tlpEntry.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ideal</p>
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              className={`w-12 text-center text-lg font-bold border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-600 focus:outline-none bg-transparent text-slate-900 dark:text-slate-100 ${updatingTlp === `${vaga.cargo}-${vaga.lotacao}` ? 'opacity-50' : ''}`}
                              defaultValue={tlpEntry.tlp}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val !== tlpEntry.tlp) {
                                  handleUpdateTlpValue(vaga.cargo, vaga.lotacao, tlpEntry.id, val);
                                } else {
                                  e.currentTarget.value = tlpEntry.tlp.toString();
                                }
                              }}
                              disabled={updatingTlp === `${vaga.cargo}-${vaga.lotacao}`}
                            />
                            {updatingTlp === `${vaga.cargo}-${vaga.lotacao}` && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Real</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{tlpEntry.ativos}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Saldo</p>
                          <p className={`text-lg font-bold ${tlpEntry.saldo < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {tlpEntry.saldo > 0 ? `+${tlpEntry.saldo}` : tlpEntry.saldo}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic text-center">
                        * Real considera ativos + afastados
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center border border-dashed border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 italic">Dados TLP não mapeados para esta unidade.</p>
                    </div>
                  )}
                </div>

                {isPendenteEf && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                      Esta vaga foi marcada como "Pendente de Efetivação". Confirme quando o novo funcionário já estiver trabalhando.
                    </p>
                  </div>
                )}
              </div>

              {/* Formulário de resposta */}
              <div className="space-y-4">
                {/* Painel de edição rápida */}
                {onEditarEvento && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-400">Editar Resposta</h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!modoEdicao) {
                            setEditDataAbertura(currentResp.data_abertura_vaga || '');
                            setEditDataFechamento(currentResp.data_fechamento_vaga || '');
                            setEditNomeCandidato(currentResp.nome_candidato || '');
                            setEditIdEventoMae(currentResp.id_evento_mae != null ? String(currentResp.id_evento_mae) : '');
                          }
                          setModoEdicao(v => !v);
                          setErroEdicao(null);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${modoEdicao ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                      >
                        <Pencil size={12} />
                        {modoEdicao ? 'Cancelar edição' : 'Editar'}
                      </button>
                    </div>
                    {modoEdicao && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Data de abertura</label>
                            <input
                              type="date"
                              className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 dark:text-slate-200"
                              value={editDataAbertura}
                              onChange={(e) => setEditDataAbertura(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Data de fechamento</label>
                            <input
                              type="date"
                              className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 dark:text-slate-200"
                              value={editDataFechamento}
                              onChange={(e) => setEditDataFechamento(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Nome do substituto</label>
                          <FuncionarioCombobox
                            value={editNomeCandidato}
                            onChange={(val) => setEditNomeCandidato(val)}
                            cargoAlvo={vaga.cargo}
                            lotacaoAlvo={vaga.lotacao}
                            nomeFantasiaAlvo={nomeContrato || undefined}
                            cnpjAlvo={vaga.cnpj}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            ID Vaga Mãe <span className="font-normal text-slate-400 normal-case">(opcional — encadear com afastamento anterior)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Ex: 10162"
                            className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 dark:text-slate-200"
                            value={editIdEventoMae}
                            onChange={(e) => setEditIdEventoMae(e.target.value)}
                          />
                        </div>
                        {erroEdicao && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> {erroEdicao}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={salvandoEdicao}
                          onClick={async () => {
                            setSalvandoEdicao(true);
                            setErroEdicao(null);
                            const idMaeNum = editIdEventoMae.trim() ? parseInt(editIdEventoMae, 10) : null;
                            try {
                              await onEditarEvento(vaga.id_evento, tipoOrigem, {
                                data_abertura_vaga: editDataAbertura || undefined,
                                data_fechamento_vaga: editDataFechamento || undefined,
                                nome_candidato: editNomeCandidato || undefined,
                                id_evento_mae: isNaN(idMaeNum as number) ? null : idMaeNum,
                              });
                              setModoEdicao(false);
                            } catch (err: any) {
                              setErroEdicao(err?.message || 'Erro ao salvar');
                            } finally {
                              setSalvandoEdicao(false);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
                        >
                          {salvandoEdicao && <Loader2 size={12} className="animate-spin" />}
                          {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Abriu vaga para substituição?</Label>
                    <RadioGroup
                      value={naoPertenceUnidade ? 'pertence' : (abriuVaga === true ? 'sim' : abriuVaga === false ? 'nao' : '')}
                      onValueChange={(value) => {
                        let updates: any = {};
                        if (value === 'sim') {
                          updates = { abriu_vaga: true, nao_pertence_unidade: false };
                        } else if (value === 'nao') {
                          updates = { abriu_vaga: false, nao_pertence_unidade: false };
                        } else if (value === 'pertence') {
                          updates = { abriu_vaga: false, nao_pertence_unidade: true };
                        }
                        updateFormDataMap(vaga.id_evento, updates);
                      }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="sim" id={`sim-${vaga.id_evento}`} />
                        <Label htmlFor={`sim-${vaga.id_evento}`} className="cursor-pointer">
                          SIM
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="nao" id={`nao-${vaga.id_evento}`} />
                        <Label htmlFor={`nao-${vaga.id_evento}`} className="cursor-pointer">
                          NÃO
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pertence" id={`pertence-${vaga.id_evento}`} />
                        <Label htmlFor={`pertence-${vaga.id_evento}`} className="cursor-pointer">
                          Não pertence à unidade
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`data-${vaga.id_evento}`} className="text-sm">
                        Data Abertura{abriuVaga === true && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        type="date"
                        id={`data-${vaga.id_evento}`}
                        className={`mt-1 ${abriuVaga === true && !dataAbertura ? 'border-red-400 focus:border-red-500' : ''}`}
                        value={dataAbertura}
                        onChange={(e) => {
                          const updates: any = { data_abertura_vaga: e.target.value };
                          if (e.target.value) updates.abriu_vaga = true;
                          updateFormDataMap(vaga.id_evento, updates);
                        }}
                      />
                      {abriuVaga === true && !dataAbertura && (
                        <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`preench-${vaga.id_evento}`} className="text-sm">
                        Vaga Preenchida?
                      </Label>
                      <Select
                        value={vagaPreenchida}
                        onValueChange={(value) =>
                          updateFormDataMap(vaga.id_evento, { vaga_preenchida: value as 'SIM' | 'NAO' })
                        }
                      >
                        <SelectTrigger id={`preench-${vaga.id_evento}`} className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SIM">SIM</SelectItem>
                          <SelectItem value="NAO">NÃO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {vagaPreenchida === 'SIM' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`fechamento-${vaga.id_evento}`} className="text-sm">
                          Data Fechamento <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="date"
                          id={`fechamento-${vaga.id_evento}`}
                          className={`mt-1 ${!dataFechamento ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`}
                          value={dataFechamento}
                          onChange={(e) => updateFormDataMap(vaga.id_evento, { data_fechamento_vaga: e.target.value })}
                        />
                        {formData[vaga.id_evento]?._substitutoAdmissao && (
                          <button
                            type="button"
                            onClick={() => updateFormDataMap(vaga.id_evento, { data_fechamento_vaga: formData[vaga.id_evento]._substitutoAdmissao })}
                            className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <Calendar size={12} />
                            Admissão do substituto: <strong>{formatarData(formData[vaga.id_evento]._substitutoAdmissao)}</strong>
                          </button>
                        )}
                        {!dataFechamento && (
                          <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>
                        )}
                        {dataFechamento && dataAbertura && (() => {
                          const diasEntreAberturaEFechamento = Math.floor(
                            (new Date(dataFechamento + 'T00:00:00').getTime() - new Date(dataAbertura + 'T00:00:00').getTime()) /
                            (1000 * 60 * 60 * 24)
                          );
                          return diasEntreAberturaEFechamento > 180 ? (
                            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                              <span>
                                O intervalo entre abertura e fechamento é de <strong>{diasEntreAberturaEFechamento} dias</strong>. Confirme se o fechamento realmente ocorreu em {new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}.
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div>
                        <Label htmlFor={`substituto-${vaga.id_evento}`} className="text-sm mb-2 block">
                          Nome do Substituto
                        </Label>
                        <div className="relative">
                          <FuncionarioCombobox
                            value={nomeCandidato}
                            onChange={(val) => updateFormDataMap(vaga.id_evento, { nome_candidato: val })}
                            onSelectFull={(func) => updateFormDataMap(vaga.id_evento, { nome_candidato: func.nome, _substitutoAdmissao: func.dt_admissao ?? null })}
                            cargoAlvo={vaga.cargo}
                            lotacaoAlvo={vaga.lotacao}
                            nomeFantasiaAlvo={nomeContrato || undefined}
                            cnpjAlvo={vaga.cnpj}
                          />
                          {nomeCandidato && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                copyWithFeedback(nomeCandidato, 'nome-candidato');
                              }}
                              title="Copiar nome do substituto"
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                              type="button"
                            >
                              {copiado === 'nome-candidato' ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`obs-${vaga.id_evento}`} className="text-sm">
                      Observações
                    </Label>
                    <textarea
                      id={`obs-${vaga.id_evento}`}
                      className="w-full mt-1 p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 dark:text-slate-200"
                      rows={2}
                      placeholder="Adicione observações..."
                      value={observacao}
                      onChange={(e) => updateFormDataMap(vaga.id_evento, { observacao: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`efetiv-${vaga.id_evento}`}
                      checked={pendenteEfetivacao === true}
                      onCheckedChange={(checked) =>
                        updateFormDataMap(vaga.id_evento, { pendente_efetivacao: checked === true })
                      }
                    />
                    <Label htmlFor={`efetiv-${vaga.id_evento}`} className="text-sm cursor-pointer">
                      Pendente efetivação
                    </Label>
                  </div>
                </div>

                {/* Seção Não Encontrada */}
                {onMarcarNaoEncontrada && (isNaoEncontrada ? (
                  <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1">
                      <SearchX size={13} /> Esta vaga foi sinalizada como não encontrada.
                    </p>
                    {respostas[vaga.id_evento]?.observacao_nao_encontrada && (
                      <p className="text-xs text-orange-700 dark:text-orange-400 italic">
                        Obs.: {respostas[vaga.id_evento].observacao_nao_encontrada}
                      </p>
                    )}
                    <button
                      onClick={() => onMarcarNaoEncontrada(vaga.id_evento, tipoOrigem, false)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium transition-colors"
                      type="button"
                    >
                      <Undo2 size={13} /> Devolver para fila original
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <SearchX size={13} /> Não conseguiu encontrar esta vaga?
                    </p>
                    <textarea
                      className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 dark:text-slate-200 resize-none"
                      rows={2}
                      placeholder="Descreva o que foi tentado (opcional)..."
                      value={obsNaoEncontrada}
                      onChange={(e) => setObsNaoEncontrada(e.target.value)}
                    />
                    <button
                      onClick={() => onMarcarNaoEncontrada(vaga.id_evento, tipoOrigem, true, obsNaoEncontrada || undefined)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors"
                      type="button"
                    >
                      <SearchX size={13} /> Sinalizar como Não Encontrada
                    </button>
                  </div>
                ))}

                <div className="flex gap-3">
                  {/* Botão Arquivar/Desarquivar */}
                  {onArquivar && !isNaoEncontrada && (
                    <button
                      onClick={() => onArquivar(vaga.id_evento, tipoOrigem, !isArquivada)}
                      className={`px-4 py-2 ${isArquivada ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-600 hover:bg-slate-700'} text-white rounded font-medium text-sm transition-colors flex items-center gap-2 shadow-sm`}
                      title={isArquivada ? "Reabrir Vaga" : "Cancelar Vaga"}
                    >
                      {isArquivada ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      {isArquivada ? 'Reabrir' : 'Cancelar'}
                    </button>
                  )}

                  {/* Botão Salvar Resposta (MAIOR) */}
                  {isNaoEncontrada ? null : isPendenteEf ? (
                    <button
                      onClick={() => handleEfetivar(vaga.id_evento, tipoOrigem)}
                      disabled={respondendo[vaga.id_evento]}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      {respondendo[vaga.id_evento] && <Loader2 className="w-4 h-4 animate-spin" />}
                      {respondendo[vaga.id_evento] ? 'Confirmando...' : 'Confirmar Contratação'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResponder(vaga.id_evento, tipoOrigem)}
                      disabled={respondendo[vaga.id_evento]}
                      className={`flex-1 px-4 py-2 disabled:opacity-50 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors ${abaSelecionada === 'fechadas' ? 'bg-slate-500 hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'}`}
                    >
                      {respondendo[vaga.id_evento] && <Loader2 className="w-4 h-4 animate-spin" />}
                      {respondendo[vaga.id_evento] ? 'Salvando...' : abaSelecionada === 'fechadas' ? 'Atualizar Fechamento' : 'Salvar Resposta'}
                    </button>
                  )}

                  {erroFechamento === vaga.id_evento && (
                    <p className="w-full text-xs text-red-600 font-medium text-center">
                      Informe a data de fechamento da vaga antes de salvar.
                    </p>
                  )}

                  {erroSalvar?.[vaga.id_evento] && (
                    <p className="w-full text-xs text-red-600 font-medium text-center flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Erro ao salvar: {erroSalvar[vaga.id_evento]}
                    </p>
                  )}

                  {abaSelecionada === 'respondidas' && (
                    <button
                      onClick={() => handleResponder(vaga.id_evento, tipoOrigem)}
                      disabled={respondendo[vaga.id_evento]}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded font-medium text-sm transition-colors"
                    >
                      Atualizar
                    </button>
                  )}

                  {/* Botão Atribuir */}
                  {onAtribuir && !isNaoEncontrada && (
                    <button
                      onClick={() => onAtribuir(vaga)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
                      title="Atribuir Vaga a Analista"
                    >
                      <UserPlus size={16} />
                      Atribuir
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )
        }
      </Card>
    </>
  );
}

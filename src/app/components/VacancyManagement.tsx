import { Search, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, Loader2, Users, Calendar, AlertCircle, TrendingUp, UserX, UserCheck, ChevronsUpDown, Check, UserPlus, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
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
import { buscarFuncionarioPorCpf, buscarFuncionarioPorNome, buscarSugestoesSubstitutos, excluirVagaMovimentacao } from '@/app/services/demissoesService';
import { FuncionarioProfile } from './FuncionarioProfile';
import { useTlpData } from '@/app/hooks/useTlpData';
import { StatusBadge } from './StatusBadge';
import { formatarData } from '@/lib/column-formatters';
import { AtribuirVagaModal } from './AtribuirVagaModal';
import { NovaVagaMovimentacaoModal } from './NovaVagaMovimentacaoModal';

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
    respostas,
    lotacoes: lotacoesFromHook,
    loading,
    error,
    carregarDados,
    responder,
    efetivar,
    vagasArquivadas,
    arquivar,
  } = useGestaoVagas();

  const { data: tlpData, updateTlp } = useTlpData();
  const [updatingTlp, setUpdatingTlp] = useState<string | null>(null);

  const {
    fantasias,
    selectedFantasia,
    setSelectedFantasia,
  } = useFantasiaFilter();

  // Filtros salvos
  const filtrosSalvos = useMemo(() => carregarFiltros(), []);

  // Estados
  const [abaSelecionada, setAbaSelecionada] = useState<string>(
    filtrosSalvos?.abaSelecionada ?? 'pendentes'
  );
  const [lotacao, setLotacao] = useState<string>(filtrosSalvos?.lotacao ?? 'TODAS');
  const [ordenacao, setOrdenacao] = useState<string>(
    filtrosSalvos?.ordenacao ?? 'data_evento.desc'
  );
  const [busca, setBusca] = useState<string>(filtrosSalvos?.busca ?? '');
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

  // Filtros de tempo
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
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

  // Salvar filtros
  useEffect(() => {
    salvarFiltros({
      abaSelecionada,
      lotacao,
      ordenacao,
      busca,
      apenasContratosSP,
    });
  }, [abaSelecionada, lotacao, ordenacao, busca, apenasContratosSP]);

  // Usar lotações do hook quando carregarem
  const lotacoes = lotacoesFromHook;

  // Aplicar filtro de data
  // Usa data_abertura_vaga se existir (na resposta ou no objeto), senão usa data_evento
  const applyDateFilter = useCallback((data: any[]) => {
    if (selectedYear === 'TODOS' && selectedMonth === 'TODOS') {
      return data;
    }

    return data.filter((item) => {
      const dataReferencia = item.data_abertura_vaga
        || respostas[item.id_evento]?.data_abertura_vaga
        || item.data_evento;

      if (!dataReferencia) return false;

      const eventDate = new Date(dataReferencia);
      const year = String(eventDate.getFullYear());
      const month = String(eventDate.getMonth() + 1);

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
        const matchBusca =
          (vaga.cargo?.toLowerCase() || '').includes(busca.toLowerCase()) ||
          (vaga.nome?.toLowerCase() || '').includes(busca.toLowerCase());

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

  // Filtrar vagasEmAberto com busca, contrato e filtro SP (campos têm nomes diferentes)
  const vagasEmAberto = useMemo(() => {
    const normalize = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const termoBusca = normalize(busca);
    return vagasEmAbertoFromHook.filter((vaga) => {
      const matchBusca = !busca.trim() ||
        normalize(vaga.cargo_saiu || '').includes(termoBusca) ||
        normalize(vaga.quem_saiu || '').includes(termoBusca) ||
        normalize(vaga.centro_custo || '').includes(termoBusca);
      const matchContrato = selectedFantasia === 'todos' || vaga.cnpj === selectedFantasia;
      let nomeContratoAtual: string | null = null;
      if (vaga.cnpj && fantasias) {
        const f = (fantasias as any[]).find(item => item.cnpj === vaga.cnpj);
        if (f) nomeContratoAtual = f.display_name || f.nome_fantasia;
      }
      const matchContratosSP = apenasContratosSP
        ? (nomeContratoAtual && CONTRATOS_SP.includes(nomeContratoAtual)) || false
        : true;
      return matchBusca && matchContrato && matchContratosSP;
    });
  }, [vagasEmAbertoFromHook, busca, selectedFantasia, apenasContratosSP, fantasias, CONTRATOS_SP]);

  const vagasFechadas = useMemo(() => {
    const fechadas = respondidas.filter((vaga) => respostas[vaga.id_evento]?.vaga_preenchida === 'SIM');
    return fechadas;
  }, [respondidas, respostas]);

  // Afastamentos respondidos que abriram vaga mas ainda não foram preenchidos → "Vagas em Aberto"
  const afastamentosEmAberto = useMemo(() => {
    return respondidas.filter((v) => {
      if (v.situacao_origem === '99-Demitido') return false;
      const resp = respostas[v.id_evento];
      return resp?.abriu_vaga === true && resp?.vaga_preenchida !== 'SIM';
    });
  }, [respondidas, respostas]);

  // Verificar se há busca ativa
  const temBuscaAtiva = busca.trim().length > 0;

  // Agregar todos os resultados quando há busca
  const todosResultadosBusca = useMemo(() => {
    if (!temBuscaAtiva) return [];
    return [...pendentes, ...afastamentos, ...pendentesEf, ...vagasEmAberto, ...afastamentosEmAberto, ...vagasFechadas, ...vagasArquivadas];
  }, [temBuscaAtiva, pendentes, afastamentos, pendentesEf, vagasEmAberto, afastamentosEmAberto, vagasFechadas, vagasArquivadas]);



  const handleResponder = async (idEvento: number, tipoOrigem: 'DEMISSAO' | 'AFASTAMENTO') => {
    setRespondendo((prev) => ({ ...prev, [idEvento]: true }));
    try {
      const dados = formData[idEvento] || {};
      await responder(idEvento, tipoOrigem, dados);
      setExpandedId(null);
    } catch (err) {
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

  const handleExcluirMovimentacao = async (id: number) => {
    try {
      await excluirVagaMovimentacao(id);
      await carregarDados(lotacao === 'TODAS' ? undefined : lotacao, selectedFantasia);
    } catch (err) {
      console.error('Erro ao excluir vaga de movimentação:', err);
    }
  };



  // Recarregar dados quando lotação ou contrato mudar
  useEffect(() => {
    carregarDados(lotacao === 'TODAS' ? undefined : lotacao, selectedFantasia);
  }, [lotacao, selectedFantasia, carregarDados]);

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
                    .filter(f => !apenasContratosSP || CONTRATOS_SP.some(sp => f.display_name?.includes(sp) || f.nome_fantasia?.includes(sp)))
                    .map((f) => (
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
                <Search className="w-3 h-3" /> Buscar Funcionário
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                <Input
                  type="text"
                  placeholder="Ex: João Silva, Médico, UTI..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 h-10 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
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
                  {lotacoes.map((l) => (
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
                Vagas Fechadas ({vagasFechadas.length})
              </TabsTrigger>
              <TabsTrigger
                value="arquivadas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-4 text-sm font-semibold flex items-center gap-2"
              >
                <Archive size={14} /> Arquivadas ({vagasArquivadas.length})
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
                        {vagasEmAberto.map((vaga) => (
                          <VagaCard
                            key={vaga.id_evento}
                            vaga={vaga}
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
                          />
                        ))}
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
                  {vagasEmAberto.map((vaga) => {
                    // Mapear VagaEmAberto para formato esperado por VagaCard
                    const vagaFormatada = {
                      ...vaga,
                      cargo: vaga.cargo_saiu || 'Cargo não informado',
                      nome: vaga.quem_saiu || 'Sem nome',
                      lotacao: vaga.centro_custo || '-',
                      status_evento: 'RESPONDIDO' as const,
                      situacao_origem: '99-Demitido', // itens da view são sempre demissões
                    };
                    const isMovimentacao = (vaga as any)._source === 'MOVIMENTACAO';
                    return (
                      <div key={vaga.id_evento} className="relative">
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
                    />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="fechadas" className="space-y-3 mt-0 focusVisible:outline-none">
              {vagasFechadas.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Nenhuma vaga fechada" description="Vagas que foram preenchidas aparecerão aqui." />
              ) : (
                vagasFechadas.map((vaga) => (
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
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="arquivadas" className="space-y-3 mt-0 focusVisible:outline-none">
              {vagasArquivadas.length === 0 ? (
                <EmptyState icon={Archive} title="Nenhuma vaga arquivada" description="Vagas arquivadas aparecerão aqui." />
              ) : (
                vagasArquivadas.map((vaga) => (
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
                  />
                ))
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
  cargoAlvo,
  lotacaoAlvo,
  nomeFantasiaAlvo,
  cnpjAlvo
}: {
  value: string;
  onChange: (value: string) => void;
  cargoAlvo?: string;
  lotacaoAlvo?: string;
  nomeFantasiaAlvo?: string;
  cnpjAlvo?: string;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(true); // Sempre aberto por padrão
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

                  // Debug: Log para verificar scoring
                  if (score >= 3000) {
                    console.log(`[SCORE ${score}] ${item.nome}`, {
                      cargo: `"${itemCargoClean}" vs "${cargoAlvoClean}" = ${cargoMatch}`,
                      lotacao: `"${itemLocalTrabalhoLower || itemCentroLower}" vs "${lotacaoLower}" = ${lotacaoMatch}`,
                      cnpj: `"${itemCnpjClean}" vs "${cnpjAlvoClean}" = ${cnpjMatch}`,
                      fantasia: `"${itemFantasiaLower}" vs "${fantasiaAlvoLower}" = ${fantasiaMatch}`,
                      contratoMatch
                    });
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
  isArquivada
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
  isArquivada?: boolean;
}) {
  if (!vaga || !vaga.id_evento) return null;

  const displayDiasEmAberto = vaga.dias_em_aberto > 0 ? vaga.dias_em_aberto : calculateDaysOpen(vaga.data_evento);
  const isExpanded = expandedId === vaga.id_evento;
  const sla = getSlaStatus(displayDiasEmAberto || 0);
  const SlaIcon = sla.icon;
  const tipoOrigem = vaga.situacao_origem === '99-Demitido' ? 'DEMISSAO' : 'AFASTAMENTO';
  const isPendenteEf = abaSelecionada === 'pendentes_ef';

  const currentResp = respostas[vaga.id_evento] || {};
  const currentForm = formData[vaga.id_evento] || {};

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
  const dataInconsistente = diffAberturaVsSituacao > 60;
  // Suspeito: mais de 365 dias em aberto sem data de abertura (pode indicar erro de ano)
  const diasSuspeitos = !dataAberturaDisplay && displayDiasEmAberto > 365;
  const alertaDataSuspeita = dataInconsistente || diasSuspeitos;
  const vagaPreenchida = getVal('vaga_preenchida', 'NAO'); // Default 'NAO' for Select
  // Check both keys for candidate name just in case
  // Campo de busca usa apenas o que foi digitado agora (currentForm), não carrega valor anterior
  const nomeCandidato = currentForm.nome_candidato || '';
  const observacao = getVal('observacao', '');
  const pendenteEfetivacao = getVal('pendente_efetivacao', false);

  const nomeSubstitutoDisplay = currentResp.nome_candidato || currentForm.nome_candidato || currentForm.nome_substituto || '';

  // Determinar status da vaga
  const getStatusBadge = () => {
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
        label: 'Arquivada',
        color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
      };
    }
    return {
      label: 'Demissão Pendente',
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
  };

  // Encontrar dados TLP correspondentes e Nome do Contrato
  const tlpEntry = useMemo(() => {
    if (!tlpData) return null;
    return tlpData.find(t =>
      t.cargo.toLowerCase().trim() === vaga.cargo?.toLowerCase().trim() &&
      (t.centro_custo.toLowerCase().trim() === vaga.lotacao?.toLowerCase().trim() ||
        t.unidade.toLowerCase().trim() === vaga.lotacao?.toLowerCase().trim())
    );
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



  return (
    <Card key={vaga.id_evento} className={`mb-3 overflow-hidden border-slate-200 dark:border-slate-800 transition-all hover:shadow-md ${alertaDataSuspeita ? 'border-l-4 border-l-yellow-400' : isPendenteEf ? 'border-l-4 border-l-amber-500' : ''}`}>
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
        onClick={() => setExpandedId(isExpanded ? null : vaga.id_evento)}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-1 p-2 rounded-lg ${tipoOrigem === 'DEMISSAO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            <Users size={18} />
          </div>
          <div onClick={(e) => e.stopPropagation()}>
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
              {abaSelecionada === 'respondidas' && (() => {
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
              {alertaDataSuspeita && (
                <Badge className="text-[10px] h-5 font-semibold border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  {dataInconsistente ? 'Abertura anterior à situação' : `${displayDiasEmAberto}d em aberto`}
                </Badge>
              )}
            </div>
            {mostrarSubstituto ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <UserX className="w-4 h-4" />
                  {vaga.nome || 'Sem nome'}
                </div>
                {nomeSubstitutoDisplay && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <UserCheck className="w-4 h-4" />
                    {nomeSubstitutoDisplay}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <span
                  role="button"
                  tabIndex={0}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer transition-colors flex items-center gap-1 text-left"
                  onClick={handleVerPerfilClicado}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleVerPerfilClicado(e as any);
                    }
                  }}
                >
                  {vaga.nome || 'Sem nome'}
                  {loadingProfile && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                </span>
                {mostrarSituacao && vaga.situacao_origem && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
              <span className={`flex items-center gap-1 ${alertaDataSuspeita ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}`}>
                <Clock size={12} className={alertaDataSuspeita ? 'text-yellow-500' : ''} />
                {displayDiasEmAberto} dias
                {alertaDataSuspeita && <AlertTriangle size={10} className="text-yellow-500" />}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
        <CardContent className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Informações */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                <AlertCircle size={14} /> Detalhes do Evento
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Situação</span>
                  <span className={`font-medium ${vaga.situacao_origem === '99-Demitido' ? 'text-red-600' : ''}`}>{vaga.situacao_origem}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Dias em aberto</span>
                  <span className={`font-medium ${sla.color}`}>{displayDiasEmAberto} dias</span>
                </div>
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
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Abriu vaga para substituição?</Label>
                  <RadioGroup
                    value={naoPertenceUnidade ? 'pertence' : (abriuVaga === true ? 'sim' : 'nao')}
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
                      Data Abertura
                    </Label>
                    <Input
                      type="date"
                      id={`data-${vaga.id_evento}`}
                      className="mt-1"
                      value={dataAbertura}
                      onChange={(e) => updateFormDataMap(vaga.id_evento, { data_abertura_vaga: e.target.value })}
                    />
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
                        Data Fechamento
                      </Label>
                      <Input
                        type="date"
                        id={`fechamento-${vaga.id_evento}`}
                        className={`mt-1 ${
                          dataFechamento &&
                          Math.floor((new Date().getTime() - new Date(dataFechamento + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) > 30
                            ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                            : ''
                        }`}
                        value={dataFechamento}
                        onChange={(e) => updateFormDataMap(vaga.id_evento, { data_fechamento_vaga: e.target.value })}
                      />
                      {dataFechamento && (() => {
                        const diasPassados = Math.floor(
                          (new Date().getTime() - new Date(dataFechamento + 'T00:00:00').getTime()) /
                          (1000 * 60 * 60 * 24)
                        );
                        return diasPassados > 30 ? (
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span>
                              Esta data é de <strong>{diasPassados} dias atrás</strong>. Confirme se o fechamento realmente ocorreu em {new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}.
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div>
                      <Label htmlFor={`substituto-${vaga.id_evento}`} className="text-sm">
                        Nome do Substituto
                      </Label>
                      <FuncionarioCombobox
                        value={nomeCandidato}
                        onChange={(val) => updateFormDataMap(vaga.id_evento, { nome_candidato: val })}
                        cargoAlvo={vaga.cargo}
                        lotacaoAlvo={vaga.lotacao}
                        nomeFantasiaAlvo={nomeContrato || undefined}
                        cnpjAlvo={vaga.cnpj}
                      />
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

              <div className="flex gap-3">
                {/* Botão Arquivar/Desarquivar */}
                {onArquivar && (
                  <button
                    onClick={() => onArquivar(vaga.id_evento, tipoOrigem, !isArquivada)}
                    className={`px-4 py-2 ${isArquivada ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-600 hover:bg-slate-700'} text-white rounded font-medium text-sm transition-colors flex items-center gap-2 shadow-sm`}
                    title={isArquivada ? "Desarquivar Vaga" : "Arquivar Vaga"}
                  >
                    {isArquivada ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    {isArquivada ? 'Desarquivar' : 'Arquivar'}
                  </button>
                )}

                {/* Botão Salvar Resposta (MAIOR) */}
                {isPendenteEf ? (
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    {respondendo[vaga.id_evento] && <Loader2 className="w-4 h-4 animate-spin" />}
                    {respondendo[vaga.id_evento] ? 'Salvando...' : 'Salvar Resposta'}
                  </button>
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
                {onAtribuir && (
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
    </Card >
  );
}

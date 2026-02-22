import { Users, Briefcase, AlertCircle, Clock, Filter, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';
import { useGestaoVagas } from '../hooks/useGestaoVagas';
import { useFuncionariosAtivosFiltered } from '../hooks/useDatabase';
import { useFantasiaFilter, useFuncionariosFiltered } from '../hooks/useFantasiaFilter';
import { formatarData } from '@/lib/column-formatters';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { FuncionarioProfile } from './FuncionarioProfile';
import { buscarFuncionarioPorCpf, buscarFuncionarioPorNome } from '@/app/services/demissoesService';

export function Dashboard() {
  const { fantasias, selectedFantasia, setSelectedFantasia, loading: loadingFantasias } = useFantasiaFilter();
  const { count: funcionariosAtivos, loading: loadingAtivos } = useFuncionariosAtivosFiltered(selectedFantasia);
  useFuncionariosFiltered(selectedFantasia);

  const {
    demissoesRespondidas,
    vagasPendentesEfetivacao,
    vagasEmAberto,
    loading: loadingVagas,
    carregarDados,
  } = useGestaoVagas();

  const [selectedProfileFunc, setSelectedProfileFunc] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i)); // Current year and past 4 years
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

  // Load data for vagas abertas initially and when selectedFantasia changes
  useEffect(() => {
    carregarDados(undefined, selectedFantasia);
  }, [selectedFantasia, carregarDados]);

  const handleVerPerfilClicado = async (vaga: any) => {
    setLoadingProfile(true);
    try {
      let func = null;

      // Tenta por CPF se existir (assuming vaga.cpf exists and is correct)
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

  const applyDateFilter = useCallback((data: any[]) => {
    if (selectedYear === 'TODOS' && selectedMonth === 'TODOS') {
      return data;
    }

    return data.filter((item) => {
      if (!item.data_evento) return false;

      // Parse manual para evitar problemas de fuso horário (YYYY-MM-DD)
      const dataStr = String(item.data_evento).split('T')[0];
      const [year, month] = dataStr.split('-');

      const matchYear = selectedYear === 'TODOS' || year === selectedYear;
      const matchMonth = selectedMonth === 'TODOS' || String(parseInt(month)) === selectedMonth;

      return matchYear && matchMonth;
    });
  }, [selectedYear, selectedMonth]);

  const filteredDemissoesRespondidas = useMemo(() => applyDateFilter(demissoesRespondidas), [demissoesRespondidas, applyDateFilter]);
  const filteredVagasPendentesEfetivacao = useMemo(() => applyDateFilter(vagasPendentesEfetivacao), [vagasPendentesEfetivacao, applyDateFilter]);

  const stats = [
    {
      title: 'Total TLP',
      value: '1.245', // Static for now, as dynamic calculation is complex
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Funcionários Ativos',
      value: loadingAtivos ? '...' : String(funcionariosAtivos),
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Saldo de Vagas',
      value: '-47', // Static for now, as dynamic calculation is complex
      icon: Briefcase,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      trend: { value: '-3% vs mês anterior', isPositive: false },
    },
    {
      title: 'Vagas Abertas',
      value: loadingVagas ? '...' : String(vagasEmAberto.length),
      icon: AlertCircle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  const unitData = [
    { name: 'UPA Central', tlp: 180, ativos: 175, saldo: -5 },
    { name: 'Hospital Geral', tlp: 450, ativos: 435, saldo: -15 },
    { name: 'UBS Norte', tlp: 95, ativos: 98, saldo: 3 },
    { name: 'UBS Sul', tlp: 88, ativos: 85, saldo: -3 },
    { name: 'Centro Especial', tlp: 220, ativos: 210, saldo: -10 },
    { name: 'Administrativo', tlp: 212, ativos: 195, saldo: -17 },
  ];

  const vacancyStatus = [
    { name: 'Abertas', value: vagasEmAberto.length, color: '#3b82f6' },
    { name: 'Em Processo', value: filteredVagasPendentesEfetivacao.length, color: '#0ea5e9' },
    { name: 'Preenchidas (30d)', value: 42, color: '#10b981' }, // "Preenchidas (30d)" might need a different data source, keep static for now
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Visão geral do quadro de funcionários</p>
        </div>

        {/* Contrato Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <select
            value={selectedFantasia}
            onChange={(e) => setSelectedFantasia(e.target.value)}
            disabled={loadingFantasias}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Ver Todos</option>
            {fantasias.map((contrato) => (
              <option key={contrato.id} value={contrato.cnpj}>
                {contrato.display_name}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="TODOS">Todos os Anos</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="TODOS">Todos os Meses</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Saldo por Unidade</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={unitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="tlp" fill="#93c5fd" name="TLP" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ativos" fill="#60a5fa" name="Ativos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Status das Vagas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vacancyStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {vacancyStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {vacancyStatus.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vagas Abertas */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Vagas Abertas {selectedFantasia !== 'todos' && `- ${fantasias.find(c => c.cnpj === selectedFantasia)?.display_name || selectedFantasia}`}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {loadingVagas ? 'Carregando...' : `Total: ${vagasEmAberto.length} registros`}
          </p>
        </div>
        <div className="overflow-x-auto">
          {loadingVagas ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-slate-600 dark:text-slate-400">Carregando vagas abertas...</span>
            </div>
          ) : vagasEmAberto.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pessoa que Saiu</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Centro de Custo</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Data Abertura</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dias em Aberto</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {vagasEmAberto.slice(0, 20).map((vaga: any, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{vaga.cargo_saiu || '-'}</td>
                    <td className="px-6 py-4">
                      <button
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                        onClick={() => handleVerPerfilClicado(vaga)}
                        disabled={loadingProfile}
                      >
                        {vaga.quem_saiu || '-'}
                        {loadingProfile && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{vaga.centro_custo || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{formatarData(vaga.data_abertura_vaga || vaga.data_evento)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4" />
                        <span className={vaga.dias_em_aberto > 30 ? 'text-red-600 dark:text-red-400 font-medium' :
                          (vaga.dias_em_aberto > 15 ? 'text-amber-600 dark:text-amber-400 font-medium' : '')}>
                          {vaga.dias_em_aberto} dias
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-slate-600 dark:text-slate-400">Nenhuma vaga aberta encontrada para esta unidade ou filtro.</p>
            </div>
          )}
        </div>
        {vagasEmAberto.length > 20 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando 20 de {vagasEmAberto.length} registros
            </p>
          </div>
        )}
      </div>

      {/* Recent Vacancies */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Vagas Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dias em Aberto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredVagasPendentesEfetivacao.map((vacancy, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{vacancy.cargo}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{vacancy.unidade}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{vacancy.motivo}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Clock className="w-4 h-4" />
                      <span className={vacancy.dias > 20 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{vacancy.dias} dias</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={vacancy.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Perfil do Colaborador Modal */}
      {selectedProfileFunc && (
        <FuncionarioProfile
          funcionario={selectedProfileFunc}
          onClose={() => setSelectedProfileFunc(null)}
        />
      )}
    </div>
  );
}

function calculateDaysOpen(dataEvento: string): number {
  if (!dataEvento) return 0;
  try {
    // Parse manual YYYY-MM-DD para garantir data local 00:00
    const dataStr = dataEvento.split('T')[0];
    const [year, month, day] = dataStr.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - eventDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (e) {
    console.error("Error calculating days open:", e);
    return 0;
  }
}

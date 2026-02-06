import { Users, Briefcase, TrendingUp, AlertCircle, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';

export function Dashboard() {
  const stats = [
    {
      title: 'Total TLP',
      value: '1.245',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Funcionários Ativos',
      value: '1.198',
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Saldo de Vagas',
      value: '-47',
      icon: Briefcase,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      trend: { value: '-3% vs mês anterior', isPositive: false },
    },
    {
      title: 'Vagas Abertas',
      value: '68',
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
    { name: 'Abertas', value: 68, color: '#3b82f6' },
    { name: 'Em Processo', value: 35, color: '#0ea5e9' },
    { name: 'Preenchidas (30d)', value: 42, color: '#10b981' },
  ];

  const recentVacancies = [
    { cargo: 'Enfermeiro', unidade: 'UPA Central', motivo: 'Demissão', dias: 15, status: 'aberto' as const },
    { cargo: 'Médico Clínico', unidade: 'Hospital Geral', motivo: 'Afastamento', dias: 8, status: 'em-processo' as const },
    { cargo: 'Técnico Enfermagem', unidade: 'UBS Norte', motivo: 'Demissão', dias: 22, status: 'aberto' as const },
    { cargo: 'Recepcionista', unidade: 'Centro Especial', motivo: 'Requisição', dias: 5, status: 'em-processo' as const },
    { cargo: 'Auxiliar Administrativo', unidade: 'Administrativo', motivo: 'Demissão', dias: 31, status: 'aberto' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Visão geral do quadro de funcionários</p>
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
              {recentVacancies.map((vacancy, index) => (
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
    </div>
  );
}
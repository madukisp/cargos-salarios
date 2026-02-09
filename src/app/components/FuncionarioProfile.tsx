import { X, Mail, Phone, Briefcase, Building2, MapPin, Calendar, User } from 'lucide-react';
import { getFormattedValue } from '@/lib/column-formatters';

interface FuncionarioProfileProps {
  funcionario: any;
  onClose: () => void;
}

export function FuncionarioProfile({ funcionario, onClose }: FuncionarioProfileProps) {
  if (!funcionario) return null;

  // Gerar avatar com iniciais
  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Gerar cor baseada no nome
  const getAvatarColor = (nome: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const index = nome.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const infoSections = [

    {
      title: 'Informações Profissionais',
      items: [
        { label: 'Cargo', value: getFormattedValue('cargo', funcionario.cargo), icon: Briefcase },
        { label: 'Tipo de Funcionário', value: getFormattedValue('tipo_funcionario', funcionario.tipo_funcionario), icon: User },
        { label: 'Nome Fantasia', value: getFormattedValue('nome_fantasia', funcionario.nome_fantasia), icon: Briefcase },
        { label: 'Centro de Custo', value: getFormattedValue('centro_custo', funcionario.centro_custo), icon: Briefcase },
      ],
    },
    {
      title: 'Datas Importantes',
      items: [
        { label: 'Situação', value: getFormattedValue('situacao', funcionario.situacao), icon: User },
        { label: 'Admissão', value: getFormattedValue('admissao', funcionario.dt_admissao), icon: Calendar },
        { label: 'Data da Situação', value: getFormattedValue('data_inicio_situacao', funcionario.dt_inicio_situacao), icon: Calendar },
        { label: 'Data de Rescisão', value: getFormattedValue('data_rescisao', funcionario.dt_rescisao), icon: Calendar },
      ],
    },
    {
      title: 'Informações Pessoais',
      items: [
        { label: 'Data de Nascimento', value: getFormattedValue('nascimento', funcionario.dt_nascimento), icon: Calendar },
        { label: 'Sexo', value: getFormattedValue('sexo', funcionario.sexo), icon: User },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full my-8">
        {/* Header com Close Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Perfil do Colaborador</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo do Perfil */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Banner e Avatar */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end gap-4 -mt-16 mb-6">
              <div
                className={`${getAvatarColor(funcionario.nome)} w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg`}
              >
                {getInitials(funcionario.nome)}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {funcionario.nome}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">{funcionario.cargo}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${funcionario.situacao === '01-ATIVO'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                  }`}
              >
                {funcionario.situacao}
              </span>
            </div>

            {/* Seções de Informações */}
            <div className="space-y-6">
              {infoSections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.items.map((item, itemIdx) => {
                      const Icon = item.icon;
                      return (
                        <div key={itemIdx} className="flex gap-3">
                          <Icon className="w-5 h-5 text-slate-400 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {item.label}
                            </p>
                            <p className="text-sm text-slate-900 dark:text-slate-100 font-medium truncate">
                              {item.value || '-'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

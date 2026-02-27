import { useState, useEffect } from 'react';
import { X, Briefcase, Calendar, User, ArrowRightLeft, Loader2, ExternalLink, ArrowLeft, History, CheckCircle, Clock } from 'lucide-react';
import { getFormattedValue, formatarData } from '@/lib/column-formatters';
import { buscarRastreioVaga, buscarOcupantesVaga, RastreioVaga, OcupanteVaga } from '@/app/services/demissoesService';
import { supabase } from '@/lib/supabase';

interface FuncionarioProfileProps {
  funcionario: any;
  onClose: () => void;
  onBack?: () => void;
}

export function FuncionarioProfile({ funcionario, onClose, onBack }: FuncionarioProfileProps) {
  const [rastreio, setRastreio] = useState<RastreioVaga | null>(null);
  const [loadingRastreio, setLoadingRastreio] = useState(false);
  const [ocupantes, setOcupantes] = useState<OcupanteVaga[]>([]);
  const [loadingOcupantes, setLoadingOcupantes] = useState(false);
  const [linkedEmployee, setLinkedEmployee] = useState<any | null>(null);

  useEffect(() => {
    if (!funcionario?.id) return;
    setLoadingRastreio(true);
    setLoadingOcupantes(true);
    buscarRastreioVaga(funcionario.id)
      .then(r => setRastreio(r))
      .finally(() => setLoadingRastreio(false));
    buscarOcupantesVaga(funcionario.id)
      .then(o => setOcupantes(o))
      .finally(() => setLoadingOcupantes(false));
  }, [funcionario?.id]);

  const abrirPerfilVinculado = async (id: number) => {
    const { data } = await supabase
      .from('oris_funcionarios')
      .select('id, nome, cpf, cargo, local_de_trabalho, centro_custo, situacao, dt_admissao, nome_fantasia, tipo_funcionario, dt_inicio_situacao, dt_rescisao, dt_nascimento, sexo')
      .eq('id', id)
      .maybeSingle();
    if (data) setLinkedEmployee(data);
  };

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
        { label: 'Escala', value: getFormattedValue('escala', funcionario.escala), icon: Clock },
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
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full my-8">
          {/* Header com Close Button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Perfil do Colaborador</h2>
            </div>
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
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    {funcionario.id && (
                      <span className="text-sm text-slate-400 dark:text-slate-500 mr-2">ID: {funcionario.id} •</span>
                    )}
                    {funcionario.cargo}
                  </p>
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

                {/* Histórico da Vaga — todos os ocupantes da cadeia */}
                {(loadingOcupantes || ocupantes.length > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-500" />
                      Histórico da Vaga
                    </h3>

                    {loadingOcupantes ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando histórico...
                      </div>
                    ) : (
                      <div className="relative pl-5">
                        {/* Linha vertical da timeline */}
                        <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />

                        <div className="space-y-4">
                          {ocupantes.map((oc, idx) => {
                            const isAtual = oc.vaga_preenchida !== 'SIM';
                            return (
                              <div key={idx} className="relative">
                                {/* Bolinha da timeline */}
                                <div className={`absolute -left-3.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isAtual ? 'bg-blue-500' : 'bg-slate-400'}`} />

                                <div
                                  className={`ml-1 p-3 rounded-lg border text-sm ${isAtual
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                    } ${oc.id ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                  onClick={() => oc.id && abrirPerfilVinculado(oc.id)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {oc.nome}
                                      </p>
                                      {oc.cargo && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                          {oc.cargo}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isAtual ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                          <Clock size={9} /> Em aberto
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                          <CheckCircle size={9} /> Encerrada
                                        </span>
                                      )}
                                      {oc.id && <ExternalLink className="w-3 h-3 text-slate-400" />}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                    {oc.data_abertura && (
                                      <span>
                                        <span className="text-slate-400">De:</span> {formatarData(oc.data_abertura)}
                                      </span>
                                    )}
                                    {oc.data_fechamento && (
                                      <span>
                                        <span className="text-slate-400">Até:</span> {formatarData(oc.data_fechamento)}
                                      </span>
                                    )}
                                    <span className={`font-medium ${oc.tipo_evento === 'DEMISSAO' ? 'text-red-500' : 'text-blue-500'}`}>
                                      {oc.tipo_evento === 'DEMISSAO' ? 'Demissão' : 'Afastamento'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rastreio de Vaga */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                    Rastreio de Vaga
                  </h3>

                  {loadingRastreio ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando rastreio...
                    </div>
                  ) : !rastreio?.substituidoPor && !rastreio?.substituiuQuem ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">
                      Nenhum rastreio de vaga encontrado para este funcionário.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {rastreio?.substituidoPor && (
                        <div
                          className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${rastreio.substituidoPor.id ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors' : ''}`}
                          onClick={() => rastreio.substituidoPor?.id && abrirPerfilVinculado(rastreio.substituidoPor.id)}
                        >
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                            {rastreio.substituidoPor.tipo_evento === 'AFASTAMENTO' ? 'Coberto por' : 'Substituído por'}
                          </p>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {rastreio.substituidoPor.nome}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {rastreio.substituidoPor.cargo}
                              </p>
                            </div>
                            {rastreio.substituidoPor.id && (
                              <ExternalLink className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rastreio.substituidoPor.tipo_evento === 'DEMISSAO'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              }`}>
                              {rastreio.substituidoPor.tipo_evento === 'DEMISSAO' ? 'Demissão' : 'Afastamento'}
                            </span>
                            {rastreio.substituidoPor.dt_admissao && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Admissão: {new Date(rastreio.substituidoPor.dt_admissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {rastreio.substituidoPor.data_fechamento && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Fechado em {new Date(rastreio.substituidoPor.data_fechamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {rastreio?.substituiuQuem && (
                        <div
                          className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                          onClick={() => abrirPerfilVinculado(rastreio.substituiuQuem!.id)}
                        >
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                            {rastreio.substituiuQuem.tipo_evento === 'AFASTAMENTO' ? 'Cobrindo' : 'Substituiu'}
                          </p>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {rastreio.substituiuQuem.nome}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {rastreio.substituiuQuem.cargo}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rastreio.substituiuQuem.tipo_evento === 'DEMISSAO'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              }`}>
                              {rastreio.substituiuQuem.tipo_evento === 'DEMISSAO' ? 'Demissão' : 'Afastamento'}
                            </span>
                            {rastreio.substituiuQuem.data_fechamento && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Desde {new Date(rastreio.substituiuQuem.data_fechamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-full px-4 py-2 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-100 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal aninhado do funcionário vinculado */}
      {linkedEmployee && (
        <FuncionarioProfile
          funcionario={linkedEmployee}
          onClose={onClose}
          onBack={() => setLinkedEmployee(null)}
        />
      )}
    </>
  );
}

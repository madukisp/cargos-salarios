export type StatusType = 'completo' | 'excedente' | 'deficit' | 'aberto' | 'em-processo' | 'preenchido' | 'pendente' | 'aprovado' | 'rejeitado' | 'urgente' | 'normal';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    'completo': { bg: 'bg-green-100', text: 'text-green-700', label: label || 'Completo' },
    'excedente': { bg: 'bg-amber-100', text: 'text-amber-700', label: label || 'Excedente' },
    'deficit': { bg: 'bg-red-100', text: 'text-red-700', label: label || 'Déficit' },
    'aberto': { bg: 'bg-blue-100', text: 'text-blue-700', label: label || 'Aberto' },
    'em-processo': { bg: 'bg-sky-100', text: 'text-sky-700', label: label || 'Em processo' },
    'preenchido': { bg: 'bg-green-100', text: 'text-green-700', label: label || 'Preenchido' },
    'pendente': { bg: 'bg-slate-100', text: 'text-slate-700', label: label || 'Pendente' },
    'aprovado': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: label || 'Aprovado' },
    'rejeitado': { bg: 'bg-rose-100', text: 'text-rose-700', label: label || 'Rejeitado' },
    'urgente': { bg: 'bg-orange-100', text: 'text-orange-700', label: label || 'Urgente' },
    'normal': { bg: 'bg-slate-100', text: 'text-slate-700', label: label || 'Normal' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

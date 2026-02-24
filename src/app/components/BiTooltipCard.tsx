import { useState } from 'react';
import { FileSpreadsheet, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { BI_COLUNAS, normBI } from '@/app/services/baseBiService';

export interface BiTooltipCardProps {
  rows: Record<string, any>[];
  headers: string[];
  style?: React.CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  variant?: 'default' | 'purple';
}

export function BiTooltipCard({
  rows,
  headers,
  style,
  onMouseEnter,
  onMouseLeave,
  variant = 'default'
}: BiTooltipCardProps) {
  const [idx, setIdx] = useState(0);
  const isPurple = variant === 'purple';

  if (!rows || rows.length === 0) {
    return (
      <div
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={
          isPurple
            ? 'rounded-lg overflow-hidden border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-slate-900 dark:text-slate-100 pointer-events-auto h-full shadow-lg p-6'
            : 'w-[320px] rounded-xl shadow-2xl overflow-hidden border border-slate-700/80 bg-slate-900 text-slate-100 pointer-events-auto p-6'
        }
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className={`p-3 rounded-full ${isPurple ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-slate-800'}`}>
            <AlertCircle className={`w-8 h-8 ${isPurple ? 'text-violet-600 dark:text-violet-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h4 className={`text-sm font-bold uppercase tracking-tight ${isPurple ? 'text-violet-800 dark:text-violet-200' : 'text-slate-100'}`}>
              Não Encontrado
            </h4>
            <p className={`text-xs mt-1 leading-relaxed ${isPurple ? 'text-violet-600/80 dark:text-violet-400/80' : 'text-slate-400'}`}>
              Este colaborador não possui registros na <span className="font-semibold italic">Base BI RH</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const row = rows[Math.min(idx, rows.length - 1)] ?? {};

  return (
    <div
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={
        isPurple
          ? 'rounded-lg overflow-hidden border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-slate-900 dark:text-slate-100 pointer-events-auto h-full shadow-lg'
          : 'w-[320px] rounded-xl shadow-2xl overflow-hidden border border-slate-700/80 bg-slate-900 text-slate-100 pointer-events-auto'
      }
    >
      {/* Header */}
      <div
        className={
          isPurple
            ? 'flex items-center justify-between px-4 py-2.5 bg-violet-100 dark:bg-violet-900/40 border-b border-violet-200 dark:border-violet-700/60'
            : 'flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700/60'
        }
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${isPurple ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-400'}`} />
          <span className={`text-sm font-bold ${isPurple ? 'text-violet-800 dark:text-violet-200 uppercase' : 'text-slate-100'}`}>Base BI RH</span>
          <span className={`text-xs ml-1 ${isPurple ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400'}`}>
            {rows.length} registro{rows.length > 1 ? 's' : ''}
          </span>
        </div>

        {rows.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }}
              disabled={idx === 0}
              className={`p-0.5 rounded transition-colors disabled:opacity-30 ${isPurple ? 'text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-200' : 'text-slate-400 hover:text-white'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-xs tabular-nums ${isPurple ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400'}`}>
              {idx + 1}/{rows.length}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIdx(i => Math.min(rows.length - 1, i + 1)); }}
              disabled={idx === rows.length - 1}
              className={`p-0.5 rounded transition-colors disabled:opacity-30 ${isPurple ? 'text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-200' : 'text-slate-400 hover:text-white'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="p-4 space-y-1.5 overflow-hidden">
        {BI_COLUNAS.map(({ label, chave }) => {
          const realKey = headers.find(h => normBI(h).includes(normBI(chave)));
          const valor = realKey ? String(row[realKey] ?? '').trim() : '';

          let textColor = isPurple ? 'text-slate-800 dark:text-slate-100' : 'text-slate-100';
          if (!valor) {
            textColor = isPurple ? 'text-slate-400 italic' : 'text-slate-500 italic';
          } else if (chave === 'SUBSTITUIDO POR') {
            textColor = 'text-amber-600 dark:text-amber-300 font-semibold';
          }

          return (
            <div key={chave} className="flex gap-2 text-xs leading-relaxed items-start">
              <span className={`font-semibold uppercase tracking-wide w-28 flex-shrink-0 text-right ${isPurple ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400'}`}>
                {label}
              </span>
              <span className={`flex-shrink-0 ${isPurple ? 'text-violet-400 dark:text-violet-500' : 'text-emerald-400'}`}>:</span>
              <span className={`break-words min-w-0 flex-1 ${textColor}`}>
                {valor || '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BiTooltipCard;

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, trend, iconBg = 'bg-blue-100', iconColor = 'text-blue-600' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={`${iconBg} dark:bg-opacity-20 p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor} dark:brightness-125`} />
        </div>
      </div>
    </div>
  );
}
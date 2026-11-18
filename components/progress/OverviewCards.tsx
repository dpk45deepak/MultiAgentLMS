import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface StatCardData {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}

export function OverviewCards({ stats }: { stats: StatCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map(({ label, value, icon: Icon, hint }) => (
        <div
          key={label}
          className="flex flex-col gap-1.5 rounded-2xl border-2 border-[#D7EAFB] bg-white p-4 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-[#B9D9F5]"
        >
          <div className="flex items-center gap-1.5 text-navy-muted">
            <Icon size={14} className="text-[#3D82C4]" />
            <span className="font-heading text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </div>
          <p className="font-heading text-2xl font-bold text-navy">{value}</p>
          {hint && <p className="font-sans text-[10px] font-semibold text-navy-muted">{hint}</p>}
        </div>
      ))}
    </div>
  );
}

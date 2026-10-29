import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useMilestones } from '../../api/hooks';

export const ActiveMilestonesCard: React.FC = () => {
  const { data: projects } = useMilestones();

  const colors = ['#5CE1E6', '#F472B6', '#8B7CFF'];

  const items = (projects || []).slice(0, 3).map((p, idx) => {
    const releasedCents = p.tranches
      .filter((t) => t.status === 'RELEASED')
      .reduce((s, t) => s + t.amountCents, 0);

    const percent = Math.round((releasedCents / p.totalCents) * 100);

    return {
      id: p.id,
      title: p.title,
      client: p.clientName,
      releasedCents,
      totalCents: p.totalCents,
      percent,
      color: colors[idx % colors.length],
    };
  });

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#8E8EA0] text-sm font-medium">Active Milestones</h2>
          <p className="text-[11px] text-[#8E8EA0] mt-0.5">Live project progress</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('paypulse:navigate-tab', { detail: 'MILESTONES' }))}
          className="text-xs text-[#8B7CFF] hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>View all</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="my-4 flex flex-col gap-3.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-[16px] bg-[#141418] border border-white/5 hover:border-white/10 transition"
          >
            <div className="flex items-center gap-3">
              {/* Circular Mini Progress Ring */}
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/5"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    strokeWidth="3.5"
                    strokeDasharray={`${item.percent}, 100`}
                    strokeLinecap="round"
                    stroke={item.color}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-white tabular-nums">
                  {item.percent}%
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-white block truncate max-w-[150px]">
                  {item.title}
                </span>
                <span className="text-[11px] text-[#8E8EA0] block">{item.client}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-white tabular-nums block">
                {formatMoney(item.releasedCents)}
              </span>
              <span className="text-[10px] text-[#8E8EA0] tabular-nums block">
                of {formatMoney(item.totalCents)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Notice */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#8E8EA0]">
        <span>Secured by PayPal Sandbox Escrow</span>
        <span className="text-[#34D399] font-medium">Automatic sync</span>
      </div>
    </div>
  );
};
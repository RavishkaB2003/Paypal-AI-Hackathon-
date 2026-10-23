import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface MilestoneItem {
  id: string;
  title: string;
  category: string;
  releasedCents: number;
  totalCents: number;
  percent: number;
  color: string;
}

const MILESTONES: MilestoneItem[] = [
  {
    id: 'm1',
    title: 'Mobile App Redesign',
    category: 'Stripe & PayPal Integration',
    releasedCents: 510000,
    totalCents: 600000,
    percent: 85,
    color: '#5CE1E6', // Aqua Mint
  },
  {
    id: 'm2',
    title: 'Q4 Hardware Batch',
    category: 'Supply Chain Escrow',
    releasedCents: 1350000,
    totalCents: 1800000,
    percent: 75,
    color: '#F472B6', // Soft Rose
  },
  {
    id: 'm3',
    title: 'Cloud Migration',
    category: 'AWS Infrastructure',
    releasedCents: 350000,
    totalCents: 1000000,
    percent: 35,
    color: '#8B7CFF', // Periwinkle Violet
  },
];

export const ActiveMilestonesCard: React.FC = () => {
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header: Title & Action */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[#8E8EA0] text-sm font-medium">Active milestones</h2>
          <p className="text-xs text-white font-semibold mt-0.5">3 Projects in Escrow</p>
        </div>
        <button
          onClick={() => alert('Milestones tab will connect in Micro-Step 2.4!')}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#262630] hover:bg-[#2F2C44] text-[#8E8EA0] hover:text-white text-xs rounded-full border border-white/5 transition cursor-pointer"
        >
          <span>View all</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Milestone Rows with Circular Progress Rings */}
      <div className="flex flex-col gap-4 my-2">
        {MILESTONES.map((item) => {
          const radius = 17;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (item.percent / 100) * circumference;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-[18px] bg-[#141418]/50 border border-white/[0.03] hover:border-white/10 transition"
            >
              {/* Left: Circular SVG Progress Ring */}
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r={radius}
                      className="text-[#262630]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r={radius}
                      stroke={item.color}
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-white tabular-nums">
                    {item.percent}%
                  </span>
                </div>

                {/* Center: Title & Subtitle */}
                <div>
                  <div className="text-xs font-semibold text-white tracking-tight">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[#8E8EA0] mt-0.5">
                    {item.category}
                  </div>
                </div>
              </div>

              {/* Right: Dollar Amounts */}
              <div className="text-right">
                <div className="text-xs font-bold text-white tabular-nums">
                  {formatMoney(item.releasedCents)}
                </div>
                <div className="text-[10px] text-[#8E8EA0] tabular-nums">
                  of {formatMoney(item.totalCents)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Summary */}
      <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
        <span className="text-[#8E8EA0]">Total protected:</span>
        <span className="text-[#34D399] font-semibold tabular-nums">$34,000.00</span>
      </div>
    </div>
  );
};
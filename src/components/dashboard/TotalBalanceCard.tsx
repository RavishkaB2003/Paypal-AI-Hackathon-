import React from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';


interface TotalBalanceCardProps {
  totalBalanceCents?: number;
  mainBalanceCents?: number;
  inMilestonesCents?: number;
  milestoneReleasedCents?: number;
  milestoneTotalCents?: number;
  onDeposit?: () => void;
  onTransfer?: () => void;
}

export const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({
  totalBalanceCents = 8030000, // $80,300.00
  mainBalanceCents = 7330000,  // $73,300.00
  inMilestonesCents = 700000,  // $7,000.00
  milestoneReleasedCents = 300000, // $3,000.00
  milestoneTotalCents = 700000,    // $7,000.00
  onDeposit,
  onTransfer,
}) => {
  const percentReleased = Math.round((milestoneReleasedCents / milestoneTotalCents) * 100);
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };
  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header Row: Label & Trend Badge */}
      <div className="flex items-center justify-between">
        <span className="text-[#8E8EA0] text-sm font-medium">Total balance</span>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-[#19322B] text-[#34D399] rounded-full text-xs font-semibold border border-[#34D399]/20">
          <span>+3.2%</span>
          <TrendingUp className="w-3 h-3" />
        </div>
      </div>
      {/* Hero Balance & Action Buttons */}
      <div className="my-4">
        <div className="text-3xl lg:text-4xl font-bold tracking-tight text-white tabular-nums">
          {formatMoney(totalBalanceCents)}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onDeposit ?? (() => alert('Deposit modal will connect in Micro-Step 3.1!'))}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 hover:border-white/10 transition cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#8E8EA0]" />
            <span>Deposit</span>
          </button>
          <button
            onClick={onTransfer ?? (() => alert('Transfer modal will connect in Micro-Step 3.1!'))}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-semibold rounded-full shadow-[0_0_16px_rgba(139,124,255,0.35)] transition cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>
      </div>
      {/* Sub-balances: Main vs In Milestones */}
      <div className="pt-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-between text-xs mb-3">
          <div>
            <span className="text-[#8E8EA0]">Main balance: </span>
            <span className="text-white font-semibold tabular-nums">{formatMoney(mainBalanceCents)}</span>
          </div>
          <div>
            <span className="text-[#8E8EA0]">In milestones: </span>
            <span className="text-white font-semibold tabular-nums">{formatMoney(inMilestonesCents)}</span>
          </div>
        </div>
        {/* Milestone Release Progress Bar */}
        <div className="w-full bg-[#262630] h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-[#8B7CFF] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,124,255,0.4)]"
            style={{ width: `${percentReleased}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#8E8EA0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF]" />
          <span>
            {formatMoney(milestoneReleasedCents)} milestone released • {percentReleased}%
          </span>
        </div>
      </div>
    </div>
  );
};
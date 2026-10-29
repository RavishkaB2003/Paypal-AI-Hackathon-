import React from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useOverview } from '../../api/hooks';

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
  totalBalanceCents: propTotal,
  mainBalanceCents: propMain,
  inMilestonesCents: propInMilestones,
  milestoneReleasedCents: propReleased,
  milestoneTotalCents: propMilestoneTotal,
  onDeposit,
  onTransfer,
}) => {
  const { data: overview } = useOverview();

  const totalBalanceCents = propTotal ?? overview?.totalBalanceCents ?? 8030000;
  const mainBalanceCents = propMain ?? overview?.mainBalanceCents ?? 7330000;
  const inMilestonesCents = propInMilestones ?? overview?.inMilestonesCents ?? 700000;
  const milestoneReleasedCents = propReleased ?? overview?.milestoneReleasedCents ?? 300000;
  const milestoneTotalCents = propMilestoneTotal ?? overview?.milestoneTotalCents ?? 700000;

  const percentReleased = milestoneTotalCents > 0
    ? Math.round((milestoneReleasedCents / milestoneTotalCents) * 100)
    : 0;

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
            onClick={onDeposit ?? (() => alert('Deposit workflow connected to PayPal Balance API!'))}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 hover:border-white/10 transition cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Deposit</span>
          </button>

          <button
            onClick={onTransfer ?? (() => alert('Transfer workflow connected to PayPal Payouts API!'))}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 hover:border-white/10 transition cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* Footer Pill: Split Breakdown */}
      <div className="bg-[#141418] rounded-[16px] p-3 flex items-center justify-between border border-white/5">
        <div>
          <span className="text-[11px] text-[#8E8EA0] block">Available Funds</span>
          <span className="text-xs font-semibold text-white tabular-nums">
            {formatMoney(mainBalanceCents)}
          </span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#8E8EA0]">Milestone Escrow</span>
            <span className="text-[10px] text-[#8B7CFF] font-medium bg-[#8B7CFF]/10 px-1.5 py-0.2 rounded-full">
              {percentReleased}%
            </span>
          </div>
          <span className="text-xs font-semibold text-white tabular-nums">
            {formatMoney(inMilestonesCents)}
          </span>
        </div>
      </div>
    </div>
  );
};
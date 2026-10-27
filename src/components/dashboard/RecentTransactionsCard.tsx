import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { SEED_OVERVIEW_DATA } from '../../shared/seeds';
import { formatCurrency, type RecentTransaction } from '../../shared/contracts';

interface RecentTransactionsCardProps {
  transactions?: RecentTransaction[];
  onViewAll?: () => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions = SEED_OVERVIEW_DATA.recentTransactions,
  onViewAll,
}) => {
  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#8E8EA0] text-sm font-medium">Recent Transactions</span>
        <button
          onClick={onViewAll || (() => alert('View full activity in the Invoices tab!'))}
          className="flex items-center gap-1 px-3 py-1 bg-[#262630] hover:bg-[#2F2C44] text-[#8E8EA0] hover:text-white text-xs rounded-full border border-white/5 transition cursor-pointer"
        >
          <span>All</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dynamic Transaction Rows */}
      <div className="flex flex-col gap-2.5 my-1">
        {transactions.map((tx) => {
          const isIncome = tx.amountCents > 0;

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#141418]/50 border border-white/[0.03] hover:border-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/5"
                  style={{ backgroundColor: `${tx.iconColor}15` }}
                >
                  {isIncome ? (
                    <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: tx.iconColor }} />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" style={{ color: tx.iconColor }} />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white tracking-tight line-clamp-1">
                    {tx.name}
                  </div>
                  <div className="text-[10px] text-[#8E8EA0] mt-0.5">
                    {tx.category} • {tx.date}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-xs font-bold tabular-nums ${
                    isIncome ? 'text-[#34D399]' : 'text-white'
                  }`}
                >
                  {isIncome ? '+' : ''}
                  {formatCurrency(tx.amountCents)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/[0.04] text-center">
        <span className="text-[11px] text-[#8E8EA0]">
          Showing {transactions.length} latest activities
        </span>
      </div>
    </div>
  );
};
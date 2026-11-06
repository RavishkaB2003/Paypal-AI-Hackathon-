import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, X, ExternalLink } from 'lucide-react';
import { useOverview } from '../../api/hooks';
import { formatCurrency, type RecentTransaction } from '../../shared/contracts';

interface RecentTransactionsCardProps {
  transactions?: RecentTransaction[];
  onViewAll?: () => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions: propTransactions,
  onViewAll,
}) => {
  const { data: overview } = useOverview();
  const [showAllModal, setShowAllModal] = useState(false);

  const transactions = propTransactions ?? overview?.recentTransactions ?? [];
  const visibleTransactions = transactions.slice(0, 4);

  const handleJumpToInvoices = () => {
    setShowAllModal(false);
    window.dispatchEvent(new CustomEvent('paypulse:navigate-tab', { detail: 'INVOICES' }));
  };

  return (
    <>
      <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#8E8EA0] text-sm font-medium">Recent Transactions</span>
          <button
            type="button"
            onClick={onViewAll ?? (() => setShowAllModal(true))}
            data-testid="recent-transactions-all-button"
            className="flex items-center gap-1 px-3 py-1 bg-[#262630] hover:bg-[#2F2C44] text-[#8E8EA0] hover:text-white text-xs rounded-full border border-white/5 transition cursor-pointer"
          >
            <span>All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Transaction Rows */}
        <div className="flex flex-col gap-2.5 my-1">
          {visibleTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8E8EA0]">
              No recent ledger transactions recorded yet.
            </div>
          ) : (
            visibleTransactions.map((tx) => {
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
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/[0.04] text-center">
          <span className="text-[11px] text-[#8E8EA0]">
            Showing {visibleTransactions.length} of {transactions.length} latest activities
          </span>
        </div>
      </div>

      {/* Full Activity Ledger Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#1E1E26] border border-white/10 rounded-[24px] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-white">Recent Ledger Activity</h3>
                <p className="text-xs text-[#8E8EA0]">
                  All deposits, transfers, milestone releases, and card settlements
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
              {transactions.map((tx) => {
                const isIncome = tx.amountCents > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-[16px] bg-[#141418] border border-white/5"
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
                        <div className="text-xs font-semibold text-white">{tx.name}</div>
                        <div className="text-[11px] text-[#8E8EA0]">
                          {tx.category} • {tx.date}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold tabular-nums ${
                        isIncome ? 'text-[#34D399]' : 'text-white'
                      }`}
                    >
                      {isIncome ? '+' : ''}
                      {formatCurrency(tx.amountCents)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={handleJumpToInvoices}
                className="flex items-center gap-1.5 text-xs font-medium text-[#8B7CFF] hover:text-white transition cursor-pointer"
              >
                <span>Open Invoices & Receivables Ledger</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="px-4 py-2 rounded-full bg-[#262630] hover:bg-white/10 text-xs font-medium text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
import React from 'react';
import { ArrowUpRight, Laptop, Layers, Palette, Cloud } from 'lucide-react';

interface TransactionItem {
  id: string;
  name: string;
  category: string;
  time: string;
  amount: string;
  icon: React.FC<{ className?: string ; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
}

const TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-1',
    name: 'Apple',
    category: 'Hardware & Tech',
    time: '12:45 PM',
    amount: '-$369.94',
    icon: Laptop,
    color: '#FFFFFF',
    bgColor: '#262630',
  },
  {
    id: 'tx-2',
    name: 'Figma',
    category: 'Design Subscription',
    time: 'Yesterday',
    amount: '-$160.94',
    icon: Palette,
    color: '#F472B6',
    bgColor: '#33202E',
  },
  {
    id: 'tx-3',
    name: 'Dribbble',
    category: 'Pro Membership',
    time: '20 Oct',
    amount: '-$200.00',
    icon: Layers,
    color: '#8B7CFF',
    bgColor: '#27233B',
  },
  {
    id: 'tx-4',
    name: 'Google Cloud',
    category: 'Server Infrastructure',
    time: '19 Oct',
    amount: '-$36.94',
    icon: Cloud,
    color: '#5CE1E6',
    bgColor: '#1D2E33',
  },
];

export const RecentTransactionsCard: React.FC = () => {
  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header: Title & Dropdown */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#8E8EA0] text-sm font-medium">Recent Transaction</span>
        <button
          onClick={() => alert('Full transaction history is available in the Invoices tab!')}
          className="flex items-center gap-1 px-3 py-1 bg-[#262630] hover:bg-[#2F2C44] text-[#8E8EA0] hover:text-white text-xs rounded-full border border-white/5 transition cursor-pointer"
        >
          <span>All</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Transaction Rows */}
      <div className="flex flex-col gap-2.5 my-1">
        {TRANSACTIONS.map((tx) => {
          const Icon = tx.icon;
          return (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#141418]/50 border border-white/[0.03] hover:border-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5"
                  style={{ backgroundColor: tx.bgColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: tx.color }} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white tracking-tight">
                    {tx.name}
                  </div>
                  <div className="text-[10px] text-[#8E8EA0] mt-0.5">
                    {tx.category} • {tx.time}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-white tabular-nums">
                  {tx.amount}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer link to Invoices tab */}
      <div className="pt-3 border-t border-white/[0.04] text-center">
        <span className="text-[11px] text-[#8E8EA0]">
          Showing 4 latest account activities
        </span>
      </div>
    </div>
  );
};
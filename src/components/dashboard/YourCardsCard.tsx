import React from 'react';
import { Plus, Wifi, CreditCard } from 'lucide-react';

export const YourCardsCard: React.FC = () => {
  const dailySpent = 10000;
  const dailyLimit = 12000;
  const spentPercent = Math.round((dailySpent / dailyLimit) * 100);

  return (
    <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
      {/* Header: Title & Action */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#8E8EA0] text-sm font-medium">Your Cards</span>
        <button
          onClick={() => alert('Card management will connect in Micro-Step 3.1!')}
          className="flex items-center gap-1 px-3 py-1 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#8B7CFF]" />
          <span>Add card</span>
        </button>
      </div>

      {/* Finity Contactless Digital Debit Card */}
      <div className="relative overflow-hidden rounded-[20px] p-5 bg-gradient-to-br from-[#242238] via-[#1E1E26] to-[#2D234A] border border-white/10 shadow-lg my-1">
        {/* Soft Wave Background Ribbon */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-bl from-[#8B7CFF]/20 via-[#5CE1E6]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Chip & Contactless Wave */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 rounded-[6px] bg-[#3A384F] border border-white/20 flex items-center justify-center shadow-inner">
              <CreditCard className="w-4 h-4 text-[#8B7CFF]" />
            </div>
            <span className="text-xs font-bold tracking-tight text-white/90">PayPal</span>
          </div>
          <Wifi className="w-4 h-4 text-white/70 rotate-90" />
        </div>

        {/* Card Number */}
        <div className="font-mono text-sm tracking-[0.2em] text-white/90 mb-4 relative z-10">
          1253 •••• •••• 3090
        </div>

        {/* Bottom Row: Holder & Expiry */}
        <div className="flex items-center justify-between relative z-10 text-xs">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#8E8EA0]">Card Holder</div>
            <div className="font-medium text-white tracking-wide">Oripio Studio</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-[#8E8EA0]">Expires</div>
            <div className="font-mono text-white/90">09/28</div>
          </div>
        </div>
      </div>

      {/* Daily Transactions Limit */}
      <div className="pt-3 border-t border-white/[0.04]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-[#8E8EA0]">Daily transactions limit</span>
          <span className="text-white font-semibold tabular-nums">
            ${dailySpent.toLocaleString()} of ${dailyLimit.toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-[#262630] h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-[#8B7CFF] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,124,255,0.4)]"
            style={{ width: `${spentPercent}%` }}
          />
        </div>

        <div className="text-[11px] text-[#8E8EA0] mt-1.5 text-right tabular-nums">
          {spentPercent}% spent today
        </div>
      </div>
    </div>
  );
};
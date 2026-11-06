import React, { useState } from 'react';
import {
  Plus,
  Wifi,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { useOverview, useAddPaymentCard } from '../../api/hooks';
import { type OverviewCardInfo } from '../../shared/contracts';

interface YourCardsCardProps {
  card?: OverviewCardInfo;
  onAddCard?: () => void;
}

export const YourCardsCard: React.FC<YourCardsCardProps> = ({
  card: propCard,
  onAddCard,
}) => {
  const { data: overview } = useOverview();
  const addCardMutation = useAddPaymentCard();

  const cards =
    overview?.cards && overview.cards.length > 0
      ? overview.cards
      : propCard
      ? [propCard]
      : overview?.card
      ? [overview.card]
      : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('PayPal Business');
  const [network, setNetwork] = useState('Mastercard');
  const [last4, setLast4] = useState('');
  const [expiry, setExpiry] = useState('08/29');
  const [dailyLimit, setDailyLimit] = useState('10000');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const safeIndex = cards.length > 0 ? Math.min(selectedIndex, cards.length - 1) : 0;
  const activeCard: OverviewCardInfo = cards[safeIndex] ?? {
    bankName: 'PayPal Business',
    network: 'Mastercard',
    holderName: 'Loading...',
    maskedNumber: '0000',
    dailySpent: 0,
    dailyLimit: 5000,
    expiry: '--/--',
  };

  const spentPercent =
    activeCard.dailyLimit > 0
      ? Math.min(100, Math.max(0, Math.round((activeCard.dailySpent / activeCard.dailyLimit) * 100)))
      : 0;

  const handleOpenAddModal = () => {
    setErrorMsg(null);
    setHolderName(activeCard.holderName !== 'Loading...' ? activeCard.holderName : '');
    setBankName('PayPal Business');
    setNetwork('Mastercard');
    setLast4(String(Math.floor(1000 + Math.random() * 9000)));
    setExpiry('08/29');
    setDailyLimit('10000');
    setShowAddModal(true);
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanedDigits = last4.replace(/\D/g, '').slice(-4);
    if (cleanedDigits.length !== 4) {
      setErrorMsg('Please enter the 4-digit card ending number.');
      return;
    }

    const parsedLimit = parseFloat(dailyLimit);
    if (isNaN(parsedLimit) || parsedLimit < 100) {
      setErrorMsg('Daily limit must be at least $100.');
      return;
    }

    try {
      await addCardMutation.mutateAsync({
        holderName: holderName.trim() || 'Merchant Studio',
        bankName: bankName.trim() || 'PayPal Business',
        network: network.trim() || 'Mastercard',
        maskedNumber: cleanedDigits,
        expiry: expiry.trim() || '08/29',
        dailyLimit: parsedLimit,
      });
      setShowAddModal(false);
      setSelectedIndex(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to add card.');
    }
  };

  return (
    <>
      <div className="bg-[#1E1E26] rounded-[24px] p-[28px] border border-white/5 shadow-sm flex flex-col justify-between">
        {/* Header: Title, Card Switcher & Action */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#8E8EA0] text-sm font-medium">Your Cards</span>
            {cards.length > 1 && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((prev) => (prev - 1 + cards.length) % cards.length)
                  }
                  className="w-5 h-5 rounded-full bg-[#262630] hover:bg-[#2F2C44] flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
                  title="Previous card"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] text-[#8E8EA0] tabular-nums">
                  {safeIndex + 1}/{cards.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIndex((prev) => (prev + 1) % cards.length)}
                  className="w-5 h-5 rounded-full bg-[#262630] hover:bg-[#2F2C44] flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
                  title="Next card"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onAddCard ?? handleOpenAddModal}
            data-testid="add-card-button"
            className="flex items-center gap-1 px-3 py-1 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#8E8EA0]" />
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
              <span className="text-xs font-bold tracking-tight text-white/90">
                {activeCard.bankName || 'PayPal'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-[#8E8EA0]">
                {activeCard.network}
              </span>
              <Wifi className="w-4 h-4 text-white/70 rotate-90" />
            </div>
          </div>

          {/* Card Number */}
          <div className="font-mono text-sm tracking-[0.2em] text-white/90 mb-4 relative z-10">
            •••• •••• •••• {activeCard.maskedNumber}
          </div>

          {/* Bottom Row: Holder & Expiry */}
          <div className="flex items-center justify-between relative z-10 text-xs">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#8E8EA0]">Card Holder</div>
              <div className="font-medium text-white tracking-wide">{activeCard.holderName}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-[#8E8EA0]">Expires</div>
              <div className="font-mono text-white/90">{activeCard.expiry}</div>
            </div>
          </div>
        </div>

        {/* Daily Transactions Limit */}
        <div className="pt-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#8E8EA0]">Daily limit</span>
            <span className="text-white font-semibold tabular-nums">
              ${activeCard.dailySpent.toLocaleString()} of ${activeCard.dailyLimit.toLocaleString()}
            </span>
          </div>

          <div className="w-full bg-[#262630] h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-[#8B7CFF] h-full rounded-full transition-all duration-500"
              style={{ width: `${spentPercent}%` }}
            />
          </div>

          <div className="text-[11px] text-[#8E8EA0] mt-1.5 text-right tabular-nums">
            {spentPercent}% used today
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#1E1E26] border border-white/10 rounded-[24px] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/20 flex items-center justify-center text-[#8B7CFF]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Issue New Commercial Card</h3>
                  <p className="text-xs text-[#8E8EA0]">
                    Instantly provision a virtual card linked to your workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="e.g. Oripio Studio"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={last4}
                    onChange={(e) => setLast4(e.target.value)}
                    placeholder="4912"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-[#8B7CFF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="08/29"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-[#8B7CFF]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                    Card Issuer / Program
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="PayPal Business"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B7CFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                    Daily Spend Limit (USD)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm font-semibold tabular-nums focus:outline-none focus:border-[#8B7CFF]"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#F472B6]/10 border border-[#F472B6]/30 text-xs text-[#F472B6]">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-[#262630] hover:bg-white/10 text-xs font-medium text-[#8E8EA0] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCardMutation.isPending}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AEE] disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {addCardMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Card</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
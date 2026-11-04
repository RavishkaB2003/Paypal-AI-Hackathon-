import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useOverview, useDepositFunds, useTransferFunds } from '../../api/hooks';

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
  const { data: overview, isLoading } = useOverview();
  const depositMutation = useDepositFunds();
  const transferMutation = useTransferFunds();

  const [modalMode, setModalMode] = useState<'DEPOSIT' | 'TRANSFER' | null>(null);
  const [amountUsd, setAmountUsd] = useState('2500');
  const [counterparty, setCounterparty] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const totalBalanceCents = propTotal ?? overview?.totalBalanceCents ?? 0;
  const mainBalanceCents = propMain ?? overview?.mainBalanceCents ?? 0;
  const inMilestonesCents = propInMilestones ?? overview?.inMilestonesCents ?? 0;
  const milestoneReleasedCents = propReleased ?? overview?.milestoneReleasedCents ?? 0;
  const milestoneTotalCents = propMilestoneTotal ?? overview?.milestoneTotalCents ?? 0;

  const percentReleased =
    milestoneTotalCents > 0
      ? Math.round((milestoneReleasedCents / milestoneTotalCents) * 100)
      : 0;

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const openModal = (mode: 'DEPOSIT' | 'TRANSFER') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAmountUsd(mode === 'DEPOSIT' ? '2500' : '1200');
    setCounterparty(
      mode === 'DEPOSIT' ? 'PayPal Merchant Settlement' : 'Chase Commercial Checking ••4829'
    );
    setModalMode(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsed = parseFloat(amountUsd);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please enter a valid dollar amount greater than $0.');
      return;
    }

    const amountCents = Math.round(parsed * 100);

    try {
      if (modalMode === 'DEPOSIT') {
        await depositMutation.mutateAsync({
          amountCents,
          source: counterparty.trim() || 'PayPal Merchant Settlement',
        });
        setSuccessMsg(`Deposited $${parsed.toLocaleString()} into your available balance.`);
      } else if (modalMode === 'TRANSFER') {
        if (amountCents > mainBalanceCents) {
          setErrorMsg('Transfer amount exceeds your available funds.');
          return;
        }
        await transferMutation.mutateAsync({
          amountCents,
          destination: counterparty.trim() || 'Connected Bank Account',
        });
        setSuccessMsg(`Transferred $${parsed.toLocaleString()} to ${counterparty || 'your bank'}.`);
      }
      setTimeout(() => {
        setModalMode(null);
        setSuccessMsg(null);
      }, 900);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Transaction could not be completed.');
    }
  };

  const isPending = depositMutation.isPending || transferMutation.isPending;

  return (
    <>
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
          <div
            data-testid="total-balance-amount"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-white tabular-nums"
          >
            {isLoading && !overview ? '...' : formatMoney(totalBalanceCents)}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onDeposit ?? (() => openModal('DEPOSIT'))}
              data-testid="deposit-button"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#262630] hover:bg-[#2F2C44] text-white text-xs font-medium rounded-full border border-white/5 hover:border-white/10 transition cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Deposit</span>
            </button>

            <button
              type="button"
              onClick={onTransfer ?? (() => openModal('TRANSFER'))}
              data-testid="transfer-button"
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

      {/* Deposit / Transfer Interactive Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#1E1E26] border border-white/10 rounded-[24px] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    modalMode === 'DEPOSIT'
                      ? 'bg-[#34D399]/10 border-[#34D399]/20 text-[#34D399]'
                      : 'bg-[#8B7CFF]/10 border-[#8B7CFF]/20 text-[#8B7CFF]'
                  }`}
                >
                  {modalMode === 'DEPOSIT' ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {modalMode === 'DEPOSIT' ? 'Deposit Funds' : 'Transfer Funds'}
                  </h3>
                  <p className="text-xs text-[#8E8EA0]">
                    Available balance: {formatMoney(mainBalanceCents)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm font-semibold tabular-nums focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  {modalMode === 'DEPOSIT' ? 'Funding Source' : 'Destination Account'}
                </label>
                <input
                  type="text"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder={
                    modalMode === 'DEPOSIT'
                      ? 'e.g. PayPal Merchant Settlement'
                      : 'e.g. Chase Commercial Checking ••4829'
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#F472B6]/10 border border-[#F472B6]/30 text-xs text-[#F472B6]">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 text-xs text-[#34D399] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-full bg-[#262630] hover:bg-white/10 text-xs font-medium text-[#8E8EA0] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AEE] disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {modalMode === 'DEPOSIT' ? 'Confirm Deposit' : 'Confirm Transfer'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
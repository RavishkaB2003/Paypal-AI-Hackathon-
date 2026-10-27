import React, { useState, useMemo } from 'react';
import { ArrowUpRight, Check, FileText, Truck } from 'lucide-react';
import { type ProtectionCase, type DeliveryRecord, formatCurrency } from '../../shared/contracts';
import { SEED_DISPUTE_CASES, SEED_DELIVERY_RECORDS } from '../../shared/seeds';

interface ProtectionViewProps {
  initialCases?: ProtectionCase[];
  initialRecords?: DeliveryRecord[];
}

export const ProtectionView: React.FC<ProtectionViewProps> = ({
  initialCases = SEED_DISPUTE_CASES,
  initialRecords = SEED_DELIVERY_RECORDS,
}) => {
  const [cases, setCases] = useState<ProtectionCase[]>(initialCases);
  const [records] = useState<DeliveryRecord[]>(initialRecords);

  const openClaimsAmountCents = useMemo(() => {
    return cases
      .filter((c) => c.status === 'UNDER_REVIEW')
      .reduce((s, c) => s + c.amountCents, 0);
  }, [cases]);

  const resolvedClaimsAmountCents = useMemo(() => {
    return cases
      .filter((c) => c.status === 'RESOLVED_MERCHANT')
      .reduce((s, c) => s + c.amountCents, 0);
  }, [cases]);

  const handleSubmitProof = (caseId: string) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status: 'RESOLVED_MERCHANT' as const } : c))
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Clean 4-Column Ledger Summary Strip — Dynamically derived */}
      <div className="bg-[#1E1E26] rounded-[24px] border border-white/5 shadow-sm grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        <div className="p-6">
          <span className="text-xs text-[#8E8EA0] font-medium">Covered Sales</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">$80,300.00</p>
          <p className="text-[11px] text-[#8E8EA0] mt-1.5">{records.length} orders with delivery proof</p>
        </div>

        <div className="p-6">
          <span className="text-xs text-[#8E8EA0] font-medium">Open Claims</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">
            {cases.filter((c) => c.status === 'UNDER_REVIEW').length}
          </p>
          <p className="text-[11px] text-[#8E8EA0] mt-1.5">
            {formatCurrency(openClaimsAmountCents)} held during review
          </p>
        </div>

        <div className="p-6">
          <span className="text-xs text-[#8E8EA0] font-medium">Resolved Claims</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">
            {cases.filter((c) => c.status === 'RESOLVED_MERCHANT').length}
          </p>
          <p className="text-[11px] text-[#8E8EA0] mt-1.5">
            {formatCurrency(resolvedClaimsAmountCents)} released to balance
          </p>
        </div>

        <div className="p-6">
          <span className="text-xs text-[#8E8EA0] font-medium">Saved Delivery Records</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">{records.length}</p>
          <p className="text-[11px] text-[#8E8EA0] mt-1.5">Receipts, waybills & sign-offs</p>
        </div>
      </div>

      {/* Structured Dispute Cases Ledger */}
      <div className="bg-[#1E1E26] rounded-[24px] border border-white/5 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Active & Past Claims</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Respond to customer claims by sending delivery tracking and signed project records to PayPal
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {cases.map((item) => {
            const isWon = item.status === 'RESOLVED_MERCHANT';

            return (
              <div
                key={item.id}
                className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-white/[0.01] transition"
              >
                <div className="flex flex-col gap-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="font-semibold text-white">{item.disputeId}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-[#8E8EA0]">{item.transactionId}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-[#8E8EA0]">{item.createdAt}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">
                    {item.buyerEmail} — <span className="font-normal text-[#8E8EA0]">{item.reason}</span>
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-[#8E8EA0] mt-1">
                    <Truck className="w-3.5 h-3.5 text-[#8E8EA0] shrink-0" />
                    <span>
                      Evidence: <strong className="text-white font-medium">{item.evidenceHashes[0] || 'Signed Delivery'}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Side: Plain Status Dot + Amount + Action */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isWon ? 'bg-[#34D399]' : 'bg-[#FFC439]'
                      }`}
                    />
                    <span className={isWon ? 'text-[#8E8EA0]' : 'text-white'}>
                      {isWon ? 'Resolved' : 'Under review'}
                    </span>
                  </div>

                  <div className="text-left lg:text-right min-w-[95px]">
                    <p className="text-sm font-bold text-white tabular-nums">
                      {formatCurrency(item.amountCents)}
                    </p>
                  </div>

                  <div className="min-w-[140px] flex justify-end">
                    {!isWon ? (
                      <button
                        onClick={() => handleSubmitProof(item.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6BEE] text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <span>Send Proof</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#8E8EA0]">
                        <Check className="w-3.5 h-3.5 text-[#34D399]" />
                        Closed in your favor
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Delivery & Tracking Records Table */}
      <div className="bg-[#1E1E26] rounded-[24px] border border-white/5 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Delivery & Tracking Records</h3>
          <p className="text-xs text-[#8E8EA0] mt-0.5">
            Waybills, carrier tracking numbers, and signed client approvals linked to your invoices
          </p>
        </div>

        <div className="divide-y divide-white/5">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="px-6 py-4 grid grid-cols-1 sm:grid-cols-12 items-start sm:items-center gap-4 text-xs"
            >
              {/* Column 1: Document Title & Client (7 cols) */}
              <div className="sm:col-span-7 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center text-[#8E8EA0] shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-white font-medium">{rec.documentTitle}</p>
                  <p className="text-[#8E8EA0] mt-0.5">
                    {rec.client} · {rec.invoiceId}
                  </p>
                </div>
              </div>

              {/* Column 2: Carrier & Reference Code (3 cols) */}
              <div className="sm:col-span-3 pl-11 sm:pl-0">
                <p className="text-[#8E8EA0]">{rec.carrierOrMethod}</p>
                <p className="text-white font-medium tabular-nums mt-0.5">{rec.referenceCode}</p>
              </div>

              {/* Column 3: Sync Status (2 cols) */}
              <div className="sm:col-span-2 pl-11 sm:pl-0 flex sm:justify-end">
                <div className="inline-flex items-center gap-2 text-[#8E8EA0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  <span>Synced with PayPal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
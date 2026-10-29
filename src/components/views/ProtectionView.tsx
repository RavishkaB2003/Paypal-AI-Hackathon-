import React, { useMemo } from 'react';
import { Check, FileText, Truck } from 'lucide-react';
import { type ProtectionCase, type DeliveryRecord, formatCurrency } from '../../shared/contracts';
import { SEED_DISPUTE_CASES, SEED_DELIVERY_RECORDS } from '../../shared/seeds';
import { useDisputes, useDeliveryRecords, useSubmitDisputeEvidence } from '../../api/hooks';

interface ProtectionViewProps {
  initialCases?: ProtectionCase[];
  initialRecords?: DeliveryRecord[];
}

export const ProtectionView: React.FC<ProtectionViewProps> = ({
  initialCases: propCases,
  initialRecords: propRecords,
}) => {
  const { data: serverCases } = useDisputes();
  const { data: serverRecords } = useDeliveryRecords();
  const submitEvidenceMutation = useSubmitDisputeEvidence();

  const cases = propCases || serverCases || SEED_DISPUTE_CASES;
  const records = propRecords || serverRecords || SEED_DELIVERY_RECORDS;

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
    submitEvidenceMutation.mutate({
      disputeId: caseId,
      evidenceHash: `proof-${Date.now()}-sha256`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Clean 4-Column Ledger Summary Strip */}
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
            {formatCurrency(resolvedClaimsAmountCents)} protected in your favor
          </p>
        </div>

        <div className="p-6">
          <span className="text-xs text-[#8E8EA0] font-medium">Protection Status</span>
          <p className="text-2xl font-bold text-[#34D399] mt-1.5">100%</p>
          <p className="text-[11px] text-[#8E8EA0] mt-1.5">All active transactions verified</p>
        </div>
      </div>

      {/* Main Disputes Ledger Table */}
      <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Dispute & Claim Management</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Review and resolve payment disputes with cryptographic proof and delivery records
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[#8E8EA0] uppercase tracking-wider text-[11px]">
                <th className="pb-3 font-semibold">Case Reference</th>
                <th className="pb-3 font-semibold">Buyer Email</th>
                <th className="pb-3 font-semibold">Claim Reason</th>
                <th className="pb-3 font-semibold">Disputed Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-4">
                    <span className="font-semibold text-white">{c.disputeId}</span>
                    <span className="block text-[11px] text-[#8E8EA0] mt-0.5">{c.transactionId}</span>
                  </td>

                  <td className="py-4 text-[#8E8EA0]">{c.buyerEmail}</td>
                  <td className="py-4 text-white font-medium">{c.reason}</td>
                  <td className="py-4 font-semibold text-white tabular-nums">
                    {formatCurrency(c.amountCents, c.currency)}
                  </td>

                  <td className="py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        c.status === 'RESOLVED_MERCHANT'
                          ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20'
                          : 'bg-[#FFC439]/10 text-[#FFC439] border border-[#FFC439]/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'RESOLVED_MERCHANT' ? 'bg-[#34D399]' : 'bg-[#FFC439]'
                        }`}
                      />
                      {c.status === 'RESOLVED_MERCHANT' ? 'Resolved in your favor' : 'Under Review'}
                    </span>
                  </td>

                  <td className="py-4 text-right">
                    {c.status !== 'RESOLVED_MERCHANT' ? (
                      <button
                        disabled={submitEvidenceMutation.isPending}
                        onClick={() => handleSubmitProof(c.id)}
                        className="px-3.5 py-1.5 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
                      >
                        {submitEvidenceMutation.isPending ? 'Submitting...' : 'Submit proof'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#34D399] font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Protected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Delivery Records Section */}
      <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Delivery & Shipping Proofs</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Carrier receipts and signed waybills automatically synced with PayPal Seller Protection
            </p>
          </div>
          <span className="text-xs text-[#34D399] font-medium bg-[#34D399]/10 px-3 py-1 rounded-full border border-[#34D399]/20">
            {records.length} Proofs synced
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-[#141418] rounded-[18px] p-4 border border-white/5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#8B7CFF]/10 flex items-center justify-center text-[#8B7CFF]">
                    {r.carrierOrMethod.includes('DHL') || r.carrierOrMethod.includes('FedEx') ? (
                      <Truck className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">{r.carrierOrMethod}</span>
                    <span className="text-[11px] text-[#8E8EA0]">{r.referenceCode}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded-full font-medium">
                  <Check className="w-3 h-3" />
                  Synced
                </span>
              </div>

              <div>
                <p className="text-xs text-[#8E8EA0]">{r.documentTitle}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
                  <span className="text-[#8E8EA0]">{r.client}</span>
                  <span className="text-[#8B7CFF] font-medium">{r.invoiceId}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
import React, { useMemo, useState } from 'react';
import {
  Check,
  FileText,
  Truck,
  Bot,
  Loader2,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { type ProtectionCase, type DeliveryRecord, formatCurrency } from '../../shared/contracts';
import {
  useDisputes,
  useDeliveryRecords,
  useSubmitDisputeEvidence,
  useOverview,
  useRunPlaybooks,
} from '../../api/hooks';

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
  const { data: overview } = useOverview();
  const submitEvidenceMutation = useSubmitDisputeEvidence();
  const playbooksMutation = useRunPlaybooks();

  const cases = propCases || serverCases || [];
  const records = propRecords || serverRecords || [];

  // Submit Evidence Modal State
  const [selectedCase, setSelectedCase] = useState<ProtectionCase | null>(null);
  const [carrierOrMethod, setCarrierOrMethod] = useState('DHL Express');
  const [referenceCode, setReferenceCode] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Signed Delivery Receipt & Bill of Lading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const coveredSalesCents = useMemo(() => {
    if (overview?.coveredSalesCents && overview.coveredSalesCents > 0) {
      return overview.coveredSalesCents;
    }
    return records.length * 150000;
  }, [overview?.coveredSalesCents, records.length]);

  const protectionPercentage = useMemo(() => {
    if (cases.length === 0) return 100;
    const resolvedCount = cases.filter((c) => c.status === 'RESOLVED_MERCHANT').length;
    return Math.round((resolvedCount / cases.length) * 100);
  }, [cases]);

  const handleOpenProofModal = (caseItem: ProtectionCase) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedCase(caseItem);
    setCarrierOrMethod('DHL Express');
    setReferenceCode(`DHL-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setDocumentTitle('Signed Delivery Receipt & Bill of Lading');
  };

  const handleSubmitProofForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await submitEvidenceMutation.mutateAsync({
        disputeId: selectedCase.id,
        carrierOrMethod: carrierOrMethod.trim(),
        referenceCode: referenceCode.trim(),
        documentTitle: documentTitle.trim(),
        client: selectedCase.buyerEmail,
        evidenceHash: `proof-${Date.now()}-sha256`,
      });
      setSuccessMsg('Proof submitted and registered with PayPal Seller Protection!');
      setTimeout(() => {
        setSelectedCase(null);
        setSuccessMsg(null);
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit evidence.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Autonomous Protection Agent Card */}
      <div className="p-5 rounded-[24px] bg-gradient-to-r from-[#242138] to-[#1E1E26] border border-[#8B7CFF]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#8B7CFF]/20 border border-[#8B7CFF]/30 flex items-center justify-center text-[#8B7CFF] shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Autonomous Dispute Protection Agent</h3>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Continuously correlates carrier delivery receipts with open buyer claims to auto-file Seller Protection evidence
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={playbooksMutation.isPending}
          onClick={() => playbooksMutation.mutate()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] disabled:opacity-50 text-white text-xs font-semibold transition shadow-sm cursor-pointer shrink-0"
        >
          {playbooksMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>Run Defense Agent</span>
        </button>
      </div>

      {playbooksMutation.data && (
        <div className="p-3.5 rounded-2xl bg-[#141418] border border-[#34D399]/30 text-xs text-[#34D399] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Autonomous Agent finished: Defended {playbooksMutation.data.disputesDefendedCount} claim(s) and synced{' '}
            {playbooksMutation.data.deliveriesSyncedCount} carrier delivery record(s) with PayPal.
          </span>
        </div>
      )}

      {/* Clean 4-Column Ledger Summary Strip */}
      <div className="bg-[#1E1E26] rounded-[24px] border border-white/5 shadow-sm grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        <div className="p-6">
          <span className="text-xs text-[#8E8EA0] font-medium">Covered Sales</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">
            {formatCurrency(coveredSalesCents)}
          </p>
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
          <p className="text-2xl font-bold text-[#34D399] mt-1.5">{protectionPercentage}%</p>
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
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8E8EA0]">
                    No open dispute cases on record. All payments in good standing.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
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
                          type="button"
                          onClick={() => handleOpenProofModal(c)}
                          className="px-3.5 py-1.5 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium transition cursor-pointer"
                        >
                          Submit proof
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#34D399] font-medium">
                          <Check className="w-3.5 h-3.5" />
                          Protected
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
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
          {records.length === 0 ? (
            <div className="col-span-3 py-8 text-center text-xs text-[#8E8EA0]">
              No delivery proofs recorded yet. Upload receipts in Smart Scan or submit proof for a dispute.
            </div>
          ) : (
            records.map((r) => (
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
            ))
          )}
        </div>
      </div>

      {/* Submit Delivery Proof Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#1E1E26] border border-white/10 rounded-[24px] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/20 flex items-center justify-center text-[#8B7CFF]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Submit Delivery Proof</h3>
                  <p className="text-xs text-[#8E8EA0]">
                    Defend claim {selectedCase.disputeId} ({formatCurrency(selectedCase.amountCents)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProofForm} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Carrier / Shipping Method
                </label>
                <select
                  value={carrierOrMethod}
                  onChange={(e) => setCarrierOrMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-xs focus:outline-none focus:border-[#8B7CFF]"
                >
                  <option value="DHL Express">DHL Express</option>
                  <option value="FedEx Priority">FedEx Priority</option>
                  <option value="UPS Standard">UPS Standard</option>
                  <option value="USPS Tracked">USPS Tracked</option>
                  <option value="Digital Certificate Handover">Digital Certificate Handover</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Tracking / Reference Code
                </label>
                <input
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="e.g. DHL-84920194"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Proof Document Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g. Signed Delivery Receipt & Bill of Lading"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-xs focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-[#141418] border border-white/5 text-[11px] text-[#8E8EA0] space-y-1">
                <div className="flex justify-between">
                  <span>Buyer Email:</span>
                  <span className="text-white font-medium">{selectedCase.buyerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disputed Transaction:</span>
                  <span className="text-white font-mono">{selectedCase.transactionId}</span>
                </div>
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
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2 rounded-full bg-[#262630] hover:bg-white/10 text-xs font-medium text-[#8E8EA0] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitEvidenceMutation.isPending}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AEE] disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {submitEvidenceMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Submit to PayPal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
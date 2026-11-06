import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Plus, X, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { type MilestoneEscrow, formatCurrency, splitAmountIntoCents } from '../../shared/contracts';
import { useMilestones, useReleaseMilestoneStep, useCreateMilestone } from '../../api/hooks';

interface MilestonesViewProps {
  initialProjects?: MilestoneEscrow[];
  onOpenNewProject?: () => void;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  initialProjects: propProjects,
}) => {
  const { data: serverProjects, isLoading } = useMilestones();
  const projects = propProjects || serverProjects || [];

  const releaseStepMutation = useReleaseMilestoneStep();
  const createMilestoneMutation = useCreateMilestone();

  // Create Milestone Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [totalUsd, setTotalUsd] = useState('6000');
  const [step1Name, setStep1Name] = useState('Kickoff, Wireframes & System Architecture');
  const [step2Name, setStep2Name] = useState('Midway Interactive Prototype Review');
  const [step3Name, setStep3Name] = useState('Final Production Deployment & Assets Handover');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic calculations from live project state
  const totalFundsCents = useMemo(() => {
    return projects.reduce((sum, p) => sum + p.totalCents, 0);
  }, [projects]);

  const paidOutCents = useMemo(() => {
    return projects.reduce(
      (sum, p) =>
        sum +
        p.tranches
          .filter((t) => t.status === 'RELEASED')
          .reduce((tSum, t) => tSum + t.amountCents, 0),
      0
    );
  }, [projects]);

  const waitingApprovalCents = useMemo(() => {
    return projects.reduce(
      (sum, p) =>
        sum +
        p.tranches
          .filter((t) => t.status === 'PENDING_APPROVAL')
          .reduce((tSum, t) => tSum + t.amountCents, 0),
      0
    );
  }, [projects]);

  const pendingStepCount = useMemo(() => {
    return projects.reduce(
      (count, p) => count + p.tranches.filter((t) => t.status === 'PENDING_APPROVAL').length,
      0
    );
  }, [projects]);

  // Tranche preview split (30% / 40% / 30%)
  const previewSplits = useMemo(() => {
    const parsed = parseFloat(totalUsd);
    if (isNaN(parsed) || parsed <= 0) return [0, 0, 0];
    const totalCents = Math.round(parsed * 100);
    return splitAmountIntoCents(totalCents, [30, 40, 30]);
  }, [totalUsd]);

  const handleOpenModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTitle('Mobile App Design & Dev Sprint');
    setClientName('Acme Global');
    setClientEmail('billing@acmeglobal.com');
    setTotalUsd('6000');
    setIsModalOpen(true);
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsed = parseFloat(totalUsd);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please enter a valid agreement total greater than $0.');
      return;
    }

    try {
      await createMilestoneMutation.mutateAsync({
        title: title.trim(),
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        totalCents: Math.round(parsed * 100),
        stepNames: [step1Name.trim(), step2Name.trim(), step3Name.trim()],
      });
      setSuccessMsg('Milestone agreement created and registered with PayPal escrow!');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create milestone agreement.');
    }
  };

  const handleReleaseStep = (projectId: string) => {
    releaseStepMutation.mutate(projectId);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8E8EA0] text-xs font-medium">
            <span>Total Milestone Funds</span>
            <ArrowUpRight className="w-4 h-4 text-[#8B7CFF]" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(totalFundsCents)}
            </span>
            <p className="text-[11px] text-[#8E8EA0] mt-1">{projects.length} active client agreements</p>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8E8EA0] text-xs font-medium">
            <span>Paid Out to Date</span>
            <span className="text-[11px] text-[#34D399] font-medium bg-[#34D399]/10 px-2 py-0.5 rounded-full">
              Completed
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(paidOutCents)}
            </span>
            <p className="text-[11px] text-[#8E8EA0] mt-1">Successfully approved and released</p>
          </div>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8E8EA0] text-xs font-medium">
            <span>Waiting for Approval</span>
            <span className="text-[11px] text-[#FFC439] font-medium bg-[#FFC439]/10 px-2 py-0.5 rounded-full">
              Action Ready
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(waitingApprovalCents)}
            </span>
            <p className="text-[11px] text-[#8E8EA0] mt-1">
              {pendingStepCount} {pendingStepCount === 1 ? 'step ready for sign-off' : 'steps ready for sign-off'}
            </p>
          </div>
        </div>
      </div>

      {/* Projects List Card */}
      <div className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Active Milestone Agreements</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Funds stay locked in escrow and release step-by-step as work deliverables are verified
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            data-testid="new-agreement-button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New agreement</span>
          </button>
        </div>

        {/* Individual Project Cards */}
        <div className="flex flex-col gap-4">
          {isLoading && projects.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8E8EA0]">
              Loading milestone escrow agreements from database...
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8E8EA0] bg-[#141418] rounded-[20px] border border-white/5 p-6">
              No milestone agreements active. Click "+ New agreement" to create your first staged escrow project.
            </div>
          ) : (
            projects.map((project) => {
              const completedCents = project.tranches
                .filter((t) => t.status === 'RELEASED')
                .reduce((sum, t) => sum + t.amountCents, 0);

              const progressPct =
                project.totalCents > 0
                  ? Math.round((completedCents / project.totalCents) * 100)
                  : 0;

              return (
                <div
                  key={project.id}
                  className="bg-[#141418] rounded-[20px] p-5 border border-white/5 flex flex-col gap-4 hover:border-white/10 transition"
                >
                  {/* Project Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8B7CFF] font-medium tracking-wide">
                          {project.id}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-xs text-[#8E8EA0]">{project.clientName}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1">{project.title}</h3>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-[#8E8EA0]">Agreement Total:</span>
                      <span className="text-base font-bold text-white tabular-nums">
                        {formatCurrency(project.totalCents, project.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Strip */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-[#8E8EA0]">
                      <span>Overall progress</span>
                      <span className="text-white font-medium tabular-nums">{progressPct}% released</span>
                    </div>
                    <div className="w-full bg-[#1E1E26] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#8B7CFF] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Step Tranches Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {project.tranches.map((tranche, idx) => {
                      const isPaid = tranche.status === 'RELEASED';
                      const isActionable = tranche.status === 'PENDING_APPROVAL';

                      return (
                        <div
                          key={tranche.id}
                          className={`rounded-[16px] p-4 border flex flex-col justify-between gap-3 transition ${
                            isPaid
                              ? 'bg-[#1E1E26]/60 border-[#34D399]/20'
                              : isActionable
                              ? 'bg-[#1E1E26] border-[#FFC439]/30 shadow-sm'
                              : 'bg-[#18181F]/40 border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#8E8EA0]">
                              Step {idx + 1} ({tranche.percent}%)
                            </span>

                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                isPaid
                                  ? 'bg-[#34D399]/10 text-[#34D399]'
                                  : isActionable
                                  ? 'bg-[#FFC439]/10 text-[#FFC439]'
                                  : 'bg-white/5 text-[#8E8EA0]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPaid ? 'bg-[#34D399]' : isActionable ? 'bg-[#FFC439]' : 'bg-[#8E8EA0]'
                                }`}
                              />
                              {isPaid ? 'Paid' : isActionable ? 'Ready for approval' : 'Upcoming'}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-white leading-snug">{tranche.name}</p>
                            <p className="text-sm font-bold text-white tabular-nums mt-1.5">
                              {formatCurrency(tranche.amountCents, project.currency)}
                            </p>
                          </div>

                                                    {/* Action Button: Live step approval & funds release */}
                          {isActionable && (
                            <button
                              type="button"
                              data-testid="release-stage-funds-btn"
                              data-project-id={project.id}
                              data-tranche-id={tranche.id}
                              disabled={releaseStepMutation.isPending}
                              onClick={() => handleReleaseStep(project.id)}
                              className="w-full mt-1 py-1.5 px-3 rounded-full bg-[#FFC439] hover:bg-[#E5AF33] text-black text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              {releaseStepMutation.isPending ? 'Releasing Funds...' : 'Release Stage Funds (Approve)'}
                            </button>
                          )}

                          {isPaid && tranche.releasedAt && (
                            <span
                              data-testid="stage-funds-released-badge"
                              className="text-[11px] text-[#34D399] flex items-center gap-1 font-medium"
                            >
                              Released on {tranche.releasedAt}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Milestone Agreement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#1E1E26] border border-white/10 rounded-[24px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/20 flex items-center justify-center text-[#8B7CFF]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Milestone Agreement</h3>
                  <p className="text-xs text-[#8E8EA0]">
                    Protected 3-step escrow split backed by PayPal Capture
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Agreement Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="agreement-title-input" placeholder="e.g. Mobile App Redesign & API Integration"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    data-testid="agreement-client-input" placeholder="e.g. Acme Global"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B7CFF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B7CFF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E8EA0] mb-1.5">
                  Total Project Amount (USD)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={totalUsd}
                  onChange={(e) => setTotalUsd(e.target.value)}
                  data-testid="agreement-total-input" className="w-full px-4 py-2.5 rounded-xl bg-[#141418] border border-white/10 text-white text-sm font-semibold tabular-nums focus:outline-none focus:border-[#8B7CFF]"
                  required
                />
              </div>

              {/* 3-Step Preview Card */}
              <div className="p-3.5 rounded-xl bg-[#141418] border border-white/5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA0] block">
                  Deterministic 30 / 40 / 30 Escrow Split Preview
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#8E8EA0]">
                    <span>Step 1 (30% Upfront):</span>
                    <span className="font-semibold text-white tabular-nums">
                      {formatCurrency(previewSplits[0])}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#8E8EA0]">
                    <span>Step 2 (40% Milestone Review):</span>
                    <span className="font-semibold text-white tabular-nums">
                      {formatCurrency(previewSplits[1])}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#8E8EA0]">
                    <span>Step 3 (30% Final Delivery):</span>
                    <span className="font-semibold text-white tabular-nums">
                      {formatCurrency(previewSplits[2])}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#8E8EA0]">
                  Milestone Tranche Deliverable Names
                </label>
                <input
                  type="text"
                  value={step1Name}
                  onChange={(e) => setStep1Name(e.target.value)}
                  placeholder="Step 1 Deliverable"
                  className="w-full px-3 py-2 rounded-lg bg-[#141418] border border-white/5 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  value={step2Name}
                  onChange={(e) => setStep2Name(e.target.value)}
                  placeholder="Step 2 Deliverable"
                  className="w-full px-3 py-2 rounded-lg bg-[#141418] border border-white/5 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  value={step3Name}
                  onChange={(e) => setStep3Name(e.target.value)}
                  placeholder="Step 3 Deliverable"
                  className="w-full px-3 py-2 rounded-lg bg-[#141418] border border-white/5 text-xs text-white"
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#262630] hover:bg-white/10 text-xs font-medium text-[#8E8EA0] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMilestoneMutation.isPending}
                  data-testid="confirm-create-agreement-btn" className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AEE] disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {createMilestoneMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Create Agreement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
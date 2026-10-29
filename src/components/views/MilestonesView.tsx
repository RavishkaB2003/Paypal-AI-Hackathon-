import React, { useMemo } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { type MilestoneEscrow, formatCurrency } from '../../shared/contracts';
import { SEED_PROJECTS } from '../../shared/seeds';
import { useMilestones, useReleaseMilestoneStep } from '../../api/hooks';

interface MilestonesViewProps {
  initialProjects?: MilestoneEscrow[];
  onOpenNewProject?: () => void;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  initialProjects: propProjects,
  onOpenNewProject,
}) => {
  const { data: serverProjects } = useMilestones();
  const projects = propProjects || serverProjects || SEED_PROJECTS;

  const releaseStepMutation = useReleaseMilestoneStep();

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

          {onOpenNewProject && (
            <button
              onClick={onOpenNewProject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New agreement</span>
            </button>
          )}
        </div>

        {/* Individual Project Cards */}
        <div className="flex flex-col gap-4">
          {projects.map((project) => {
            const completedCents = project.tranches
              .filter((t) => t.status === 'RELEASED')
              .reduce((sum, t) => sum + t.amountCents, 0);

            const progressPct = Math.round((completedCents / project.totalCents) * 100);

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

                        {/* Action Button: Live step approval */}
                        {isActionable && (
                          <button
                            disabled={releaseStepMutation.isPending}
                            onClick={() => handleReleaseStep(project.id)}
                            className="w-full mt-1 py-1.5 px-3 rounded-full bg-[#FFC439] hover:bg-[#E5AF33] text-black text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {releaseStepMutation.isPending ? 'Releasing...' : 'Approve & release'}
                          </button>
                        )}

                        {isPaid && tranche.releasedAt && (
                          <span className="text-[11px] text-[#34D399] flex items-center gap-1 font-medium">
                            Released on {tranche.releasedAt}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
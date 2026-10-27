import React, { useState, useMemo } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { type MilestoneEscrow, formatCurrency } from '../../shared/contracts';
import { SEED_PROJECTS } from '../../shared/seeds';

interface MilestonesViewProps {
  initialProjects?: MilestoneEscrow[];
  onOpenNewProject?: () => void;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  initialProjects = SEED_PROJECTS,
  onOpenNewProject,
}) => {
  const [projects, setProjects] = useState<MilestoneEscrow[]>(initialProjects);

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

  const handleReleaseStep = (projectId: string, stepId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const updatedTranches = proj.tranches.map((t) =>
          t.id === stepId ? { ...t, status: 'RELEASED' as const, releasedAt: new Date().toISOString().split('T')[0] } : t
        );
        return {
          ...proj,
          tranches: updatedTranches,
        };
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Summary Metrics — Dynamically calculated */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1E1E26] rounded-[24px] p-5 border border-white/5 shadow-sm">
          <span className="text-xs text-[#8E8EA0] font-medium">Total Project Funds</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">
            {formatCurrency(totalFundsCents)}
          </p>
          <p className="text-[11px] text-[#8E8EA0] mt-2">{projects.length} active client projects</p>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-5 border border-white/5 shadow-sm">
          <span className="text-xs text-[#8E8EA0] font-medium">Paid Out So Far</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">
            {formatCurrency(paidOutCents)}
          </p>
          <p className="text-[11px] text-[#8E8EA0] mt-2">
            {totalFundsCents > 0
              ? `${Math.round((paidOutCents / totalFundsCents) * 100)}% of total project value`
              : '0% released'}
          </p>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-5 border border-white/5 shadow-sm">
          <span className="text-xs text-[#8E8EA0] font-medium">Waiting on Client</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">
            {formatCurrency(waitingApprovalCents)}
          </p>
          <p className="text-[11px] text-[#8E8EA0] mt-2">
            {pendingStepCount} payment step{pendingStepCount === 1 ? '' : 's'} ready for approval
          </p>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Active Projects</h2>
          <p className="text-xs text-[#8E8EA0] mt-0.5">
            Split client payments into clear steps and release funds as each stage is finished
          </p>
        </div>

        <button
          onClick={onOpenNewProject}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8B7CFF] hover:bg-[#7A6BEE] text-white text-xs font-semibold rounded-full transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Project Cards */}
      <div className="flex flex-col gap-5">
        {projects.map((project) => {
          const projectReleasedCents = project.tranches
            .filter((t) => t.status === 'RELEASED')
            .reduce((s, t) => s + t.amountCents, 0);

          const progressPercent =
            project.totalCents > 0
              ? Math.round((projectReleasedCents / project.totalCents) * 100)
              : 0;

          return (
            <div
              key={project.id}
              className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm flex flex-col gap-5"
            >
              {/* Top Row: Project Title & Total Progress */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white">{project.title}</h3>
                  <p className="text-xs text-[#8E8EA0] mt-1">
                    {project.clientName} ·{' '}
                    <span className="text-white font-semibold tabular-nums">
                      {formatCurrency(projectReleasedCents)}
                    </span>{' '}
                    paid of{' '}
                    <span className="text-white font-semibold tabular-nums">
                      {formatCurrency(project.totalCents)}
                    </span>{' '}
                    total
                  </p>
                </div>

                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex-1 bg-[#141418] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#8B7CFF] h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* 3-Column Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {project.tranches.map((step, idx) => {
                  const isReleased = step.status === 'RELEASED';
                  const isPending = step.status === 'PENDING_APPROVAL';

                  return (
                    <div
                      key={step.id}
                      className={`rounded-2xl p-4 border flex flex-col justify-between gap-4 transition ${
                        isPending
                          ? 'bg-[#262630]/80 border-[#8B7CFF]/40'
                          : 'bg-[#141418] border-white/5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
                            Step {idx + 1} · {step.percent}%
                          </span>

                          {isReleased && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8E8EA0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                              Paid
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC439]" />
                              Ready for approval
                            </span>
                          )}
                          {!isReleased && !isPending && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8E8EA0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                              Upcoming
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-white">{step.name}</h4>
                        <p className="text-xs text-[#8E8EA0] mt-1">
                          {isReleased
                            ? `Completed on ${step.releasedAt || 'Oct 2026'}`
                            : isPending
                            ? 'Ready for client sign-off'
                            : 'Unlocks upon previous step sign-off'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-base font-bold text-white tabular-nums">
                          {formatCurrency(step.amountCents)}
                        </span>

                        {isPending ? (
                          <button
                            onClick={() => handleReleaseStep(project.id, step.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#8B7CFF] hover:bg-[#7A6BEE] text-white text-[11px] font-semibold transition cursor-pointer"
                          >
                            <span>Release Funds</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#8E8EA0]">
                            {isReleased ? 'Completed' : 'Scheduled'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
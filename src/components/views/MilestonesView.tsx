import React, { useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';

interface StepUI {
  id: string;
  label: string;
  percent: number;
  amount: string;
  status: 'RELEASED' | 'PENDING_APPROVAL' | 'LOCKED';
  deliverable: string;
}

interface MilestoneProject {
  id: string;
  projectTitle: string;
  client: string;
  totalAmount: string;
  releasedAmount: string;
  progressPercent: number;
  steps: StepUI[];
}

const INITIAL_PROJECTS: MilestoneProject[] = [
  {
    id: 'MS-2026-01',
    projectTitle: 'Finity Design System & Web App Overhaul',
    client: 'Stripe Global Inc',
    totalAmount: '$6,000.00',
    releasedAmount: '$4,200.00',
    progressPercent: 70,
    steps: [
      { id: 't1', label: 'Project Kickoff & Architecture', percent: 30, amount: '$1,800.00', status: 'RELEASED', deliverable: 'Approved wireframes & system spec' },
      { id: 't2', label: 'Core Bento UI & AG Grid Views', percent: 40, amount: '$2,400.00', status: 'RELEASED', deliverable: 'Interactive staging build delivered' },
      { id: 't3', label: 'Final QA & Production Handoff', percent: 30, amount: '$1,800.00', status: 'PENDING_APPROVAL', deliverable: 'Final build ready for client review' },
    ],
  },
  {
    id: 'MS-2026-02',
    projectTitle: 'Next-Gen Mobile Checkout SDK Integration',
    client: 'Acme Corp Design',
    totalAmount: '$4,250.00',
    releasedAmount: '$1,275.00',
    progressPercent: 30,
    steps: [
      { id: 't4', label: 'Initial Setup & API Specs', percent: 30, amount: '$1,275.00', status: 'RELEASED', deliverable: 'Signed off on Oct 18, 2026' },
      { id: 't5', label: 'Checkout Flow Implementation', percent: 40, amount: '$1,700.00', status: 'PENDING_APPROVAL', deliverable: 'Staging preview sent to client' },
      { id: 't6', label: 'App Store Launch Support', percent: 30, amount: '$1,275.00', status: 'LOCKED', deliverable: 'Unlocks after step 2 approval' },
    ],
  },
];

export const MilestonesView: React.FC = () => {
  const [projects, setProjects] = useState<MilestoneProject[]>(INITIAL_PROJECTS);

  const handleReleaseStep = (projectId: string, stepId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const updatedSteps = proj.steps.map((t) =>
          t.id === stepId ? { ...t, status: 'RELEASED' as const } : t
        );
        return {
          ...proj,
          progressPercent: 100,
          releasedAmount: proj.totalAmount,
          steps: updatedSteps,
        };
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1E1E26] rounded-[24px] p-5 border border-white/5 shadow-sm">
          <span className="text-xs text-[#8E8EA0] font-medium">Total Project Funds</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">$18,450.00</p>
          <p className="text-[11px] text-[#8E8EA0] mt-2">3 active client projects</p>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-5 border border-white/5 shadow-sm">
          <span className="text-xs text-[#8E8EA0] font-medium">Paid Out So Far</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">$11,975.00</p>
          <p className="text-[11px] text-[#8E8EA0] mt-2">65% of total project value</p>
        </div>

        <div className="bg-[#1E1E26] rounded-[24px] p-5 border border-white/5 shadow-sm">
          <span className="text-xs text-[#8E8EA0] font-medium">Waiting on Client</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">$3,500.00</p>
          <p className="text-[11px] text-[#8E8EA0] mt-2">2 payment steps ready for approval</p>
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
          onClick={() => alert('New Project modal will connect in Micro-Step 3.1!')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8B7CFF] hover:bg-[#7A6BEE] text-white text-xs font-semibold rounded-full transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Project Cards */}
      <div className="flex flex-col gap-5">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-[#1E1E26] rounded-[24px] p-6 border border-white/5 shadow-sm flex flex-col gap-5"
          >
            {/* Top Row: Project Title & Total Progress */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-base font-semibold text-white">{project.projectTitle}</h3>
                <p className="text-xs text-[#8E8EA0] mt-1">
                  {project.client} · <span className="text-white font-semibold tabular-nums">{project.releasedAmount}</span> paid of{' '}
                  <span className="text-white font-semibold tabular-nums">{project.totalAmount}</span> total
                </p>
              </div>

              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="flex-1 bg-[#141418] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#8B7CFF] h-full rounded-full transition-all duration-500"
                    style={{ width: `${project.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white tabular-nums">
                  {project.progressPercent}%
                </span>
              </div>
            </div>

            {/* 3-Column Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {project.steps.map((step, idx) => {
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

                      <h4 className="text-sm font-semibold text-white">{step.label}</h4>
                      <p className="text-xs text-[#8E8EA0] mt-1">{step.deliverable}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-base font-bold text-white tabular-nums">
                        {step.amount}
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
        ))}
      </div>
    </div>
  );
};
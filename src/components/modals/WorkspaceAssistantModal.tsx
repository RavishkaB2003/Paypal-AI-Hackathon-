import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  FileSpreadsheet,
  ScanLine,
  FolderKanban,
  ShieldAlert,
  Plus,
  Bot,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { type TabType } from '../../shared';
import { useRunPlaybooks } from '../../api/hooks';

interface WorkspaceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenCreateInvoice: () => void;
  onNotify?: (message: string) => void;
}

export const WorkspaceAssistantModal: React.FC<WorkspaceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenCreateInvoice,
  onNotify,
}) => {
  const [query, setQuery] = useState('');
  const [agentNotice, setAgentNotice] = useState<string | null>(null);

const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);  const runPlaybooksMutation = useRunPlaybooks();

  // Clear pending timers if modal unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleQuickPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase();
    if (q.includes('scan') || q.includes('receipt') || q.includes('bill')) {
      onNavigateTab('SMART_SCAN');
    } else if (q.includes('milestone') || q.includes('step') || q.includes('project')) {
      onNavigateTab('MILESTONES');
    } else if (q.includes('dispute') || q.includes('claim') || q.includes('protect')) {
      onNavigateTab('PROTECTION');
    } else if (q.includes('agent') || q.includes('auto') || q.includes('defense')) {
      handleTriggerAutonomousPlaybooks();
      return;
    } else if (q.includes('new') || q.includes('create')) {
      onOpenCreateInvoice();
    } else {
      onNavigateTab('INVOICES');
    }
    setQuery('');
    onClose();
  };

  const handleTriggerAutonomousPlaybooks = () => {
    runPlaybooksMutation.mutate(undefined, {
      onSuccess: (result) => {
        const msg = result.actionsExecuted.length > 0
          ? result.actionsExecuted[0]
          : 'Autonomous check complete: All claims & shipments 100% verified.';
        setAgentNotice(msg);

        if (onNotify) {
          onNotify(msg);
        }

        // Determine destination tab: Never strand user on OVERVIEW during defense runs
        const targetTab: TabType = (result.canvasDirective?.activeTab && result.canvasDirective.activeTab !== 'OVERVIEW')
          ? result.canvasDirective.activeTab
          : 'PROTECTION';

        timerRef.current = setTimeout(() => {
          onNavigateTab(targetTab);
          onClose();
        }, 1100);
      },
      onError: (err: any) => {
        setAgentNotice(`Agent execution error: ${err.message}`);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#1E1E26] w-full max-w-lg rounded-[24px] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Workspace Actions & Widgets</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Jump to a tool, trigger autonomous agents, or type what you want to do
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Agent Feedback Banner */}
          {agentNotice && (
            <div className="p-3 rounded-2xl bg-[#34D399]/10 border border-[#34D399]/20 flex items-center gap-2.5 text-xs text-[#34D399]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{agentNotice}</span>
            </div>
          )}

          {/* Autonomous Agent Playbook Trigger Strip */}
          <div className="p-4 rounded-2xl bg-[#141418] border border-[#8B7CFF]/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#8B7CFF]/15 flex items-center justify-center text-[#8B7CFF]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">Autonomous Protection Agent</span>
                  <span className="text-[11px] text-[#8E8EA0]">Cross-references open claims with delivery proofs</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20">
                <Sparkles className="w-2.5 h-2.5" />
                Active
              </span>
            </div>

            <button
              onClick={handleTriggerAutonomousPlaybooks}
              disabled={runPlaybooksMutation.isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {runPlaybooksMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Agent Executing Playbooks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Autonomous Defense Cycle</span>
                </>
              )}
            </button>
          </div>

          {/* Search / Command Input */}
          <form onSubmit={handleQuickPrompt} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Run defense agent or scan receipt..."
              className="flex-1 px-4 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white placeholder-[#8E8EA0] focus:outline-none focus:border-[#8B7CFF]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#262630] hover:bg-[#2F2C44] text-xs font-semibold text-white transition cursor-pointer"
            >
              Go
            </button>
          </form>

          {/* Quick Actions Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
              Quick Actions
            </span>

            <button
              onClick={() => {
                onClose();
                onOpenCreateInvoice();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center text-[#8B7CFF]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">New Invoice or 3-Step Payment Plan</p>
                  <p className="text-[11px] text-[#8E8EA0]">Calculate 30/40/30 splits and send via PayPal</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8E8EA0]" />
            </button>

            <button
              onClick={() => {
                onNavigateTab('SMART_SCAN');
                onClose();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center text-white">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Scan a Receipt or Delivery Slip</p>
                  <p className="text-[11px] text-[#8E8EA0]">Extract line items and attach delivery records</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8E8EA0]" />
            </button>

            <button
              onClick={() => {
                onNavigateTab('INVOICES');
                onClose();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Open Invoices Table</p>
                  <p className="text-[11px] text-[#8E8EA0]">Filter paid, pending, and disputed client invoices</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8E8EA0]" />
            </button>

            <button
              onClick={() => {
                onNavigateTab('MILESTONES');
                onClose();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center text-white">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Manage Project Milestones</p>
                  <p className="text-[11px] text-[#8E8EA0]">Review and release stage-by-stage client payments</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8E8EA0]" />
            </button>

            <button
              onClick={() => {
                onNavigateTab('PROTECTION');
                onClose();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center text-white">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Review Buyer Claims & Tracking</p>
                  <p className="text-[11px] text-[#8E8EA0]">Send delivery proof to PayPal for open claims</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8E8EA0]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
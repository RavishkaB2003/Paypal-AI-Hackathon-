import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowUpRight,
  FileSpreadsheet,
  ScanLine,
  FolderKanban,
  ShieldAlert,
  Plus,
  Search,
  Bot,
  Loader2,
  CheckCircle2,
  LayoutGrid,
  Check,
} from 'lucide-react';
import { formatCurrency, type TabType } from '../../shared/contracts';
import {
  useInvoices,
  useMilestones,
  useDisputes,
  useOverview,
  useAccountSettings,
  useUpdateSettings,
  useRunPlaybooks,
} from '../../api/hooks';

interface WorkspaceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenCreateInvoice: () => void;
  onNotify?: (message: string) => void;
}

const BENTO_WIDGETS = [
  { id: 'BALANCE', label: 'Total Balance & Wallet' },
  { id: 'CASHFLOW', label: 'Transactions Cashflow Chart' },
  { id: 'CARDS', label: 'Commercial Payment Cards' },
  { id: 'MILESTONES', label: 'Active Milestone Tracker' },
  { id: 'EXPENSES', label: 'Expenses Breakdown Donut' },
  { id: 'TRANSACTIONS', label: 'Recent Ledger Activity' },
] as const;

export const WorkspaceAssistantModal: React.FC<WorkspaceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenCreateInvoice,
  onNotify,
}) => {
  const [query, setQuery] = useState('');

  const { data: invoices = [] } = useInvoices();
  const { data: milestones = [] } = useMilestones();
  const { data: disputes = [] } = useDisputes();
  const { data: overview } = useOverview();
  const { data: settings } = useAccountSettings();
  const updateSettingsMutation = useUpdateSettings();
  const playbooksMutation = useRunPlaybooks();

  const visibleWidgets = settings?.visibleWidgets ?? [
    'BALANCE',
    'CASHFLOW',
    'CARDS',
    'MILESTONES',
    'EXPENSES',
    'TRANSACTIONS',
  ];

  const quickActions = useMemo(
    () => [
      {
        id: 'new-invoice',
        title: 'New Invoice or 3-Step Payment Plan',
        subtitle: 'Calculate 30/40/30 splits and send via PayPal',
        keywords: 'new create invoice payment plan split bill',
        icon: Plus,
        iconColor: 'text-[#8B7CFF]',
        onSelect: () => {
          onClose();
          onOpenCreateInvoice();
        },
      },
      {
        id: 'smart-scan',
        title: 'Scan a Receipt or Delivery Slip',
        subtitle: 'Extract line items and attach delivery records',
        keywords: 'scan receipt waybill delivery slip upload camera vision',
        icon: ScanLine,
        iconColor: 'text-white',
        onSelect: () => {
          onNavigateTab('SMART_SCAN');
          onClose();
        },
      },
      {
        id: 'invoices-table',
        title: 'Open Invoices Table',
        subtitle: 'Filter paid, pending, and disputed client invoices',
        keywords: 'invoices table ledger receivables paid overdue',
        icon: FileSpreadsheet,
        iconColor: 'text-white',
        onSelect: () => {
          onNavigateTab('INVOICES');
          onClose();
        },
      },
      {
        id: 'milestones',
        title: 'Manage Project Milestones',
        subtitle: 'Review and release stage-by-stage client payments',
        keywords: 'milestones escrow project steps release tranche',
        icon: FolderKanban,
        iconColor: 'text-white',
        onSelect: () => {
          onNavigateTab('MILESTONES');
          onClose();
        },
      },
      {
        id: 'protection',
        title: 'Review Buyer Claims & Tracking',
        subtitle: 'Send delivery proof to PayPal for open claims',
        keywords: 'protection disputes claims buyer tracking proof',
        icon: ShieldAlert,
        iconColor: 'text-white',
        onSelect: () => {
          onNavigateTab('PROTECTION');
          onClose();
        },
      },
    ],
    [onClose, onNavigateTab, onOpenCreateInvoice]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredActions = useMemo(() => {
    if (!normalizedQuery) return quickActions;
    return quickActions.filter(
      (a) =>
        a.title.toLowerCase().includes(normalizedQuery) ||
        a.subtitle.toLowerCase().includes(normalizedQuery) ||
        a.keywords.includes(normalizedQuery)
    );
  }, [quickActions, normalizedQuery]);

  // Live SQLite entity search results when the user types in the search box
  const matchedRecords = useMemo(() => {
    if (!normalizedQuery) return [];

    const results: Array<{
      id: string;
      badge: string;
      title: string;
      subtitle: string;
      amount: string;
      targetTab: TabType;
    }> = [];

    for (const inv of invoices) {
      if (
        inv.invoiceNumber.toLowerCase().includes(normalizedQuery) ||
        inv.clientName.toLowerCase().includes(normalizedQuery) ||
        inv.clientEmail.toLowerCase().includes(normalizedQuery) ||
        inv.status.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: `inv-${inv.id}`,
          badge: 'Invoice',
          title: `${inv.invoiceNumber} • ${inv.clientName}`,
          subtitle: `${inv.status} • Due ${inv.dueDate}`,
          amount: formatCurrency(inv.amountCents),
          targetTab: 'INVOICES',
        });
      }
    }

    for (const ms of milestones) {
      if (
        ms.title.toLowerCase().includes(normalizedQuery) ||
        ms.clientName.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: `ms-${ms.id}`,
          badge: 'Milestone',
          title: ms.title,
          subtitle: `${ms.clientName} • ${ms.status}`,
          amount: formatCurrency(ms.totalCents),
          targetTab: 'MILESTONES',
        });
      }
    }

    for (const d of disputes) {
      if (
        d.disputeId.toLowerCase().includes(normalizedQuery) ||
        d.buyerEmail.toLowerCase().includes(normalizedQuery) ||
        d.reason.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: `dsp-${d.id}`,
          badge: 'Claim',
          title: `${d.disputeId} • ${d.buyerEmail}`,
          subtitle: `${d.reason} • ${d.status}`,
          amount: formatCurrency(d.amountCents),
          targetTab: 'PROTECTION',
        });
      }
    }

    for (const tx of overview?.recentTransactions ?? []) {
      if (
        tx.name.toLowerCase().includes(normalizedQuery) ||
        tx.category.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: `tx-${tx.id}`,
          badge: 'Ledger',
          title: tx.name,
          subtitle: `${tx.category} • ${tx.date}`,
          amount: formatCurrency(tx.amountCents),
          targetTab: 'OVERVIEW',
        });
      }
    }

    return results.slice(0, 6);
  }, [normalizedQuery, invoices, milestones, disputes, overview?.recentTransactions]);

  if (!isOpen) return null;

  const handleToggleWidget = (widgetId: string) => {
    const exists = visibleWidgets.includes(widgetId);
    if (exists && visibleWidgets.length <= 1) return; // keep at least 1 widget visible
    const next = exists
      ? visibleWidgets.filter((w) => w !== widgetId)
      : [...visibleWidgets, widgetId];
    updateSettingsMutation.mutate({ visibleWidgets: next });
  };

  const handleQuickPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchedRecords.length > 0) {
      onNavigateTab(matchedRecords[0].targetTab);
      setQuery('');
      onClose();
      return;
    }
    if (filteredActions.length > 0) {
      filteredActions[0].onSelect();
      setQuery('');
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#1E1E26] w-full max-w-xl max-h-[90vh] rounded-[24px] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Workspace Search & Widgets</h2>
            <p className="text-xs text-[#8E8EA0] mt-0.5">
              Search invoices, milestones, and claims, or customize your Overview Bento layout
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262630] hover:bg-white/10 flex items-center justify-center text-[#8E8EA0] hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Live Search Input */}
          <form onSubmit={handleQuickPrompt} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8E8EA0] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client name, invoice #, milestone, claim, or action..."
              data-testid="workspace-search-input"
              className="w-full pl-10 pr-20 py-2.5 bg-[#141418] rounded-xl border border-white/10 text-xs text-white placeholder-[#8E8EA0] focus:outline-none focus:border-[#8B7CFF]"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-14 text-[11px] text-[#8E8EA0] hover:text-white px-2 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6BEE] text-xs font-semibold text-white transition cursor-pointer"
            >
              Go
            </button>
          </form>

          {/* Live Database Search Matches */}
          {normalizedQuery && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
                Workspace Records ({matchedRecords.length})
              </span>
              {matchedRecords.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-[#141418] border border-white/5 text-xs text-[#8E8EA0]">
                  No matching invoices, milestones, or claims found for "{query}".
                </div>
              ) : (
                matchedRecords.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab(rec.targetTab);
                      setQuery('');
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#8B7CFF]/15 text-[#8B7CFF] text-[10px] font-semibold shrink-0">
                        {rec.badge}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{rec.title}</p>
                        <p className="text-[11px] text-[#8E8EA0] truncate">{rec.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-bold text-white tabular-nums">
                        {rec.amount}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8EA0]" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Autonomous Protection Agent Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#242138] to-[#1E1E26] border border-[#8B7CFF]/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8B7CFF]/20 border border-[#8B7CFF]/30 flex items-center justify-center text-[#8B7CFF]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Autonomous Protection Agent</p>
                  <p className="text-[11px] text-[#8E8EA0]">
                    Auto-matches verified delivery proofs to open buyer claims & overdue milestones
                  </p>
                </div>
              </div>
                            <button
                type="button"
                disabled={playbooksMutation.isPending}
                onClick={() =>
                  playbooksMutation.mutate(undefined, {
                    onSuccess: (data) => {
                      if (onNotify) {
                        onNotify(
                          `Autonomous Defense: Defended ${data.disputesDefendedCount} claim(s), synced ${data.deliveriesSyncedCount} delivery proof(s).`
                        );
                      }
                    },
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#8B7CFF] hover:bg-[#7A6BEE] disabled:opacity-50 text-xs font-semibold text-white transition cursor-pointer shrink-0"
              >
                {playbooksMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Run Now</span>
              </button>
            </div>

            {playbooksMutation.data && (
              <div className="p-2.5 rounded-xl bg-[#141418]/80 border border-[#34D399]/30 text-[11px] text-[#34D399] flex items-center justify-between">
                <span>
                  Defended {playbooksMutation.data.disputesDefendedCount} claim(s) • Synced{' '}
                  {playbooksMutation.data.deliveriesSyncedCount} delivery proof(s)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab('PROTECTION');
                    onClose();
                  }}
                  className="underline font-semibold ml-2 cursor-pointer"
                >
                  View Protection
                </button>
              </div>
            )}
          </div>

          {/* Customize Overview Bento Widgets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA0] flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-[#8B7CFF]" />
                <span>Customize Overview Widgets</span>
              </span>
              <span className="text-[11px] text-[#8E8EA0]">
                {visibleWidgets.length} of 6 active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {BENTO_WIDGETS.map((w) => {
                const active = visibleWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleToggleWidget(w.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      active
                        ? 'bg-[#8B7CFF]/12 border-[#8B7CFF]/40 text-white'
                        : 'bg-[#141418] border-white/5 text-[#8E8EA0] hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-medium truncate pr-2">{w.label}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                        active ? 'bg-[#8B7CFF] text-white' : 'bg-[#262630]'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
              Quick Actions
            </span>

            {filteredActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onSelect}
                  className="w-full p-3.5 rounded-2xl bg-[#141418] hover:bg-[#262630] border border-white/5 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl bg-[#262630] border border-white/5 flex items-center justify-center ${action.iconColor}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{action.title}</p>
                      <p className="text-[11px] text-[#8E8EA0]">{action.subtitle}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#8E8EA0]" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
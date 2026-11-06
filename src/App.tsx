import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { type TabType } from './shared';
import { TopNavbar } from './components/layout/TopNavbar';
import { LeftIconRail } from './components/layout/LeftIconRail';
import { TotalBalanceCard } from './components/dashboard/TotalBalanceCard';
import { TransactionsOverviewCard } from './components/dashboard/TransactionOverviewCard';
import { YourCardsCard } from './components/dashboard/YourCardsCard';
import { ActiveMilestonesCard } from './components/dashboard/ActiveMilestonesCard';
import { ExpensesDonutCard } from './components/dashboard/ExpensesDonutCard';
import { RecentTransactionsCard } from './components/dashboard/RecentTransactionsCard';
import { InvoicesView } from './components/views/InvoicesView';
import { SmartScanView } from './components/views/SmartScanView';
import { MilestonesView } from './components/views/MilestonesView';
import { ProtectionView } from './components/views/ProtectionView';
import { SettingsView } from './components/views/SettingsView';
import { WorkspaceAssistantModal } from './components/modals/WorkspaceAssistantModal';
import { CreateInvoiceModal, type NewInvoicePayload } from './components/modals/CreateInvoiceModal';
import { useCreateInvoice, useAccountSettings } from './api/hooks';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [isWorkspaceAssistantOpen, setIsWorkspaceAssistantOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const { data: settings } = useAccountSettings();
  const createInvoiceMutation = useCreateInvoice();

  const visibleWidgets = settings?.visibleWidgets ?? [
    'BALANCE',
    'CASHFLOW',
    'CARDS',
    'MILESTONES',
    'EXPENSES',
    'TRANSACTIONS',
  ];

  // Listen for navigation events from cards
  useEffect(() => {
    const handleNavEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('paypulse:navigate-tab', handleNavEvent);
    return () => window.removeEventListener('paypulse:navigate-tab', handleNavEvent);
  }, []);

  // Listen for sign-out lock event
  useEffect(() => {
    const handleSignOutEvent = () => {
      setIsLocked(true);
    };
    window.addEventListener('paypulse:sign-out', handleSignOutEvent);
    return () => window.removeEventListener('paypulse:sign-out', handleSignOutEvent);
  }, []);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K opens Workspace Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsWorkspaceAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateInvoice = (payload: NewInvoicePayload) => {
    createInvoiceMutation.mutate(
      {
        invoiceNumber: payload.invoiceNumber,
        clientName: payload.client,
        clientEmail: payload.email,
        amountCents: payload.amountCents,
        enableThreeStepSplit: payload.enableThreeStepSplit,
      },
      {
        onSuccess: (newInv) => {
          setIsCreateInvoiceOpen(false);
          setActiveTab('INVOICES');
          setNotification(`Invoice ${newInv.invoiceNumber} created and split into 3 steps!`);
          setTimeout(() => setNotification(null), 4000);
        },
        onError: (err: any) => {
          setNotification(`Error creating invoice: ${err.message}`);
          setTimeout(() => setNotification(null), 4000);
        },
      }
    );
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#141418] flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-[#1E1E26] rounded-[24px] p-8 max-w-md w-full border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 flex items-center justify-center text-[#8B7CFF]">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">PayPulse Session Locked</h2>
            <p className="text-xs text-[#8E8EA0] mt-1.5">
              Signed out from Merchant Studio. Re-authenticate to access your PayPal wallet & ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsLocked(false)}
            className="w-full py-3 px-4 rounded-xl bg-[#8B7CFF] hover:bg-[#7A6BEE] text-xs font-semibold text-white transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Merchant Studio</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141418] text-white flex flex-col font-sans selection:bg-[#8B7CFF]/30">
      {/* Top Navigation Bar */}
      <TopNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setIsWorkspaceAssistantOpen(true)}
      />

      {/* Real-time Notification Banner */}
      {notification && (
        <div className="bg-[#1E1E26] border-y border-[#8B7CFF]/30 px-6 py-2.5 flex items-center justify-center gap-2.5 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 w-full flex max-w-[1600px] mx-auto">
        {/* Floating Capsule Icon Rail on the Far Left */}
        <LeftIconRail activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 px-6 md:px-8 py-6 flex flex-col">
          {/* Header Row: Title & Action */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                {activeTab === 'OVERVIEW' && 'Dashboard'}
                {activeTab === 'INVOICES' && 'Invoices'}
                {activeTab === 'SMART_SCAN' && 'Receipt & Document Scanner'}
                {activeTab === 'MILESTONES' && 'Project Milestones'}
                {activeTab === 'PROTECTION' && 'Disputes & Protection'}
                {activeTab === 'SETTINGS' && 'Merchant Account Settings'}
              </h1>
              <p className="text-xs md:text-sm text-[#8E8EA0] mt-1">
                {activeTab === 'OVERVIEW' && 'Manage your payments and transactions in one click'}
                {activeTab === 'INVOICES' && 'Create, send, and track client invoices and payment splits'}
                {activeTab === 'SMART_SCAN' && 'Upload receipts, bills, or delivery slips to auto-fill payment details'}
                {activeTab === 'MILESTONES' && 'Break client projects into payment steps and release funds as work gets approved'}
                {activeTab === 'PROTECTION' && 'Manage buyer claims, delivery records, and PayPal dispute cases'}
                {activeTab === 'SETTINGS' && 'Manage business profile, PayPal Sandbox credentials, and Overview layout'}
              </p>
            </div>

            <button
              onClick={() => setIsWorkspaceAssistantOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1E1E26] hover:bg-[#2F2C44] text-white text-xs md:text-sm font-medium rounded-full border border-white/5 hover:border-white/10 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#8B7CFF]" />
              <span>Add widget</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] bg-white/5 text-[#8E8EA0] rounded font-mono border border-white/5">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Active Tab Container: All 6 Dedicated Workflows */}
          <div className="flex-1">
            {/* Tab 1: Overview Finity Bento Grid (Filtered by SQLite User Preferences) */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleWidgets.includes('BALANCE') && <TotalBalanceCard />}
                {visibleWidgets.includes('CASHFLOW') && <TransactionsOverviewCard />}
                {visibleWidgets.includes('CARDS') && <YourCardsCard />}
                {visibleWidgets.includes('MILESTONES') && <ActiveMilestonesCard />}
                {visibleWidgets.includes('EXPENSES') && <ExpensesDonutCard />}
                {visibleWidgets.includes('TRANSACTIONS') && <RecentTransactionsCard />}
              </div>
            )}

            {/* Tab 2: Invoices AG Grid View */}
            {activeTab === 'INVOICES' && (
              <InvoicesView onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)} />
            )}

            {/* Tab 3: Smart Scan Vision View */}
            {activeTab === 'SMART_SCAN' && <SmartScanView />}

            {/* Tab 4: Milestones Escrow Pipeline View */}
            {activeTab === 'MILESTONES' && (
              <MilestonesView onOpenNewProject={() => setIsWorkspaceAssistantOpen(true)} />
            )}

            {/* Tab 5: Payment Protection & Evidence View */}
            {activeTab === 'PROTECTION' && <ProtectionView />}

            {/* Tab 6: Settings View */}
            {activeTab === 'SETTINGS' && (
              <SettingsView
                onNotify={(msg) => {
                  setNotification(msg);
                  setTimeout(() => setNotification(null), 4000);
                }}
                onSignOut={() => setIsLocked(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Workspace Assistant Command Palette Modal */}
      <WorkspaceAssistantModal
        isOpen={isWorkspaceAssistantOpen}
        onClose={() => setIsWorkspaceAssistantOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsWorkspaceAssistantOpen(false);
        }}
        onOpenCreateInvoice={() => {
          setIsWorkspaceAssistantOpen(false);
          setIsCreateInvoiceOpen(true);
        }}
        onNotify={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 4000);
        }}
      />

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onCreateInvoice={handleCreateInvoice}
      />
    </div>
  );
}